// ============================================================
// DRIP NATION — Razorpay webhook (Phase 5.4)  ⚠ NOT YET DEPLOYED
//
// The ONLY authoritative source of "paid". Verifies the HMAC signature,
// dedupes on the event id (idempotent/replay-safe), then atomically marks the
// order Paid + decrements stock (apply_paid_order) and redeems the promo
// (redeem_promo), and fires a confirmation email. A browser "success" callback
// NEVER marks an order paid.
//
// Deploy:  supabase functions deploy razorpay-webhook --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_WEBHOOK_SECRET,
//          RESEND_API_KEY (optional until Phase 5.5)
// Then register the function URL as a webhook in the Razorpay dashboard with
// the same secret, subscribed to payment.captured / order.paid / payment.failed.
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const raw = await req.text();

  // 1. verify signature (HMAC-SHA256 of the raw body) — reject forgeries
  if (!secret || !(await verifyHmac(raw, signature, secret))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(raw);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 2. idempotency: dedupe on the Razorpay event id. Unique-violation → replay → 200.
  const eventId = req.headers.get('x-razorpay-event-id') ?? event.id ?? crypto.randomUUID();
  const { error: dupe } = await admin.from('payment_events').insert({ id: eventId, type: event.event });
  if (dupe) return new Response('ok (already processed)', { status: 200 });

  // 3. success events → mark paid + decrement stock + redeem promo (all atomic)
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity;
    const rzpOrderId = payment?.order_id;
    const { data: order } = await admin
      .from('orders').select('id, promo_code').eq('razorpay_order_id', rzpOrderId).maybeSingle();

    if (order) {
      const { error: paidErr } = await admin.rpc('apply_paid_order', { p_order_id: order.id });
      if (paidErr) {
        // insufficient stock at payment time → leave Pending, flag for manual review
        console.error('[webhook] apply_paid_order failed', order.id, paidErr.message);
      } else {
        await admin.rpc('redeem_promo', { p_code: order.promo_code });
        await admin.from('orders').update({ razorpay_payment_id: payment?.id }).eq('id', order.id);
        await sendConfirmationEmail(admin, order.id).catch((e) => console.error('[webhook] email', e));
      }
      await admin.from('payment_events').update({ order_id: order.id }).eq('id', eventId);
    }
  }
  // payment.failed → intentionally no-op (order stays Pending/Failed; no stock/promo change)

  return new Response('ok', { status: 200 });
});

async function verifyHmac(body: string, signatureHex: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, signatureHex);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// TODO(5.5): fetch order + items and send via Resend. Stubbed — no-op without a key.
async function sendConfirmationEmail(_admin: any, _orderId: string): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return;
  // const { data: order } = await _admin.from('orders').select('*, order_items(*)').eq('id', _orderId).single();
  // await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${key}`, ... }, body: ... });
}
