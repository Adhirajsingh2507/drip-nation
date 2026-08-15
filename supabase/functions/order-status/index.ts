// ============================================================
// DRIP NATION — order-status Edge Function (Phase 5.5)  ⚠ NOT YET DEPLOYED
//
// The guest order-lookup gate. Takes { order_id, token }, verifies the signed
// token, and returns the order (+ items) via the service role. Orders stay
// RLS-closed to anon; this signed endpoint is the only guest read path.
//
// Deploy:  supabase functions deploy order-status --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ORDER_LOOKUP_SECRET
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifyOrder } from '../_shared/token.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('ORDER_LOOKUP_SECRET');
  if (!secret) return json({ error: 'Not configured' }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const order_id = String(body?.order_id ?? '');
  const token = String(body?.token ?? '');
  if (!order_id || !token || !(await verifyOrder(order_id, token, secret)))
    return json({ error: 'Invalid or expired link' }, 403);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: order, error } = await admin
    .from('orders')
    .select('id, customer_name, email, created_at, subtotal, discount, shipping, total, promo_code, payment, fulfillment, address, order_items(name, size, price, quantity)')
    .eq('id', order_id).maybeSingle();
  if (error || !order) return json({ error: 'Order not found' }, 404);

  return json({ order });
});
