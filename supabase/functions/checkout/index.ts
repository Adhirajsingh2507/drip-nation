// ============================================================
// DRIP NATION — checkout Edge Function (Phase 5.2)  ⚠ NOT YET DEPLOYED
//
// Server-authoritative checkout: the browser sends INTENT only
// ({ items:[{product_id,size,quantity}], promo_code?, customer{...} }).
// This function recomputes every money value from the DB, validates stock and
// the promo, creates a Pending order + item snapshots, opens a Razorpay order,
// and returns the payment handle. It never trusts a client-sent price/total.
//
// Deploy:  supabase functions deploy checkout --no-verify-jwt
// Secrets: supabase secrets set SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
//                               RAZORPAY_KEY_ID=… RAZORPAY_KEY_SECRET=…
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { signOrder } from '../_shared/token.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // service-role client — bypasses RLS; only authoritative writer of orders
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { items, promo_code, customer } = body ?? {};

  // 1. validate input shape
  if (!Array.isArray(items) || items.length === 0) return json({ error: 'Cart is empty' }, 400);
  if (!customer?.name || !customer?.email) return json({ error: 'Missing customer details' }, 400);
  const lines: { product_id: number; size: string; quantity: number }[] = [];
  for (const it of items) {
    const pid = Number(it?.product_id), qty = Number(it?.quantity);
    if (!Number.isInteger(pid) || !Number.isInteger(qty) || qty < 1 || qty > 20)
      return json({ error: 'Invalid line item' }, 400);
    lines.push({ product_id: pid, size: String(it?.size ?? ''), quantity: qty });
  }

  // 2. fetch authoritative products
  const ids = [...new Set(lines.map((l) => l.product_id))];
  const { data: products, error: pErr } = await admin
    .from('products').select('id,name,price,sale,stock,sizes,status').in('id', ids);
  if (pErr) return json({ error: 'Lookup failed' }, 500);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  // 3. validate each line + 4. subtotal from DB prices
  let subtotal = 0;
  const orderItems: any[] = [];
  for (const l of lines) {
    const p = byId.get(l.product_id);
    if (!p || p.status !== 'Active') return json({ error: `Product ${l.product_id} unavailable` }, 400);
    if (l.size && Array.isArray(p.sizes) && !p.sizes.includes(l.size))
      return json({ error: `Size ${l.size} unavailable for ${p.name}` }, 400);
    if (p.stock < l.quantity) return json({ error: `Only ${p.stock} left of ${p.name}` }, 400);
    const unit = p.sale ?? p.price;                     // whole rupees
    subtotal += unit * l.quantity;
    orderItems.push({ product_id: p.id, name: p.name, price: unit, size: l.size || null, quantity: l.quantity });
  }

  // 5. promo — validate only; usage is incremented at payment (webhook)
  let discount = 0, promoCode: string | null = null, freeShip = false;
  if (promo_code) {
    const { data: promo } = await admin
      .from('promos').select('*').eq('code', promo_code).eq('status', 'Active').maybeSingle();
    if (!promo) return json({ error: 'Invalid promo code' }, 400);
    if (promo.min_order > 0 && subtotal < promo.min_order) return json({ error: `Minimum order ₹${promo.min_order}` }, 400);
    if (promo.max_uses > 0 && promo.used >= promo.max_uses) return json({ error: 'Promo exhausted' }, 400);
    if (promo.expiry && new Date(promo.expiry) < new Date()) return json({ error: 'Promo expired' }, 400);
    if (promo.type === 'percentage') discount = Math.round((subtotal * promo.value) / 100);
    else if (promo.type === 'fixed') discount = promo.value;
    // 'shipping' → free shipping handled below
    promoCode = promo.code;
    if (promo.type === 'shipping') freeShip = true;
  }

  // 6. shipping + tax (authoritative; mirrors cart.html)
  // ponytail: constants inline; lift to a settings table only if these change often
  const shipping = freeShip ? 0 : (subtotal >= 2000 ? 0 : 149);
  const tax = Math.round((subtotal - discount) * 0.18);
  const total = (subtotal - discount) + tax + shipping;

  // Fail before writing an order if payments aren't configured (no orphan Pending orders)
  const keyId = Deno.env.get('RAZORPAY_KEY_ID'), keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) return json({ error: 'Payments not configured' }, 503);

  // 7–8. create order (Pending) + item snapshots
  const { data: order, error: oErr } = await admin.from('orders').insert({
    customer_name: customer.name, email: customer.email, phone: customer.phone ?? null,
    address: customer.address ?? null,
    subtotal, discount, shipping, total, promo_code: promoCode, payment: 'Pending',
  }).select('id').single();
  if (oErr || !order) return json({ error: 'Could not create order' }, 500);
  const { error: oiErr } = await admin.from('order_items')
    .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
  if (oiErr) return json({ error: 'Could not create order items' }, 500);

  // 9. Razorpay order (amount in paise)
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: total * 100, currency: 'INR', receipt: order.id }),
  });
  if (!rzpRes.ok) return json({ error: 'Payment init failed' }, 502);
  const rzpOrder = await rzpRes.json();
  await admin.from('orders').update({ razorpay_order_id: rzpOrder.id }).eq('id', order.id);

  // 10. hand the browser the payment handle + a signed order-lookup token
  const lookupSecret = Deno.env.get('ORDER_LOOKUP_SECRET');
  const lookup_token = lookupSecret ? await signOrder(String(order.id), lookupSecret) : null;
  return json({ order_id: order.id, razorpay_order_id: rzpOrder.id, amount: total * 100, key_id: keyId, lookup_token });
});
