// ============================================================
// DRIP NATION — signed order-lookup token (Phase 5.5)
// HMAC-SHA256(order_id, ORDER_LOOKUP_SECRET) → hex. Lets a guest open their own
// order via a link in the email / on the confirmation screen, without exposing
// orders to anon reads (RLS stays closed; the order-status function is the gate).
// ============================================================

export async function signOrder(orderId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(orderId));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyOrder(orderId: string, token: string, secret: string): Promise<boolean> {
  const expected = await signOrder(orderId, secret);
  if (expected.length !== token.length) return false;
  let diff = 0;                                        // constant-time compare
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
