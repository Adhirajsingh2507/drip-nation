# Drip Nation — Edge Functions

⚠️ **These are stubs — written and committed, but NOT deployed yet.** They go live
in Phase 5 once the Razorpay/Resend accounts exist and secrets are set. Design:
[`../../docs/architecture/phase-5-checkout-payments.md`](../../docs/architecture/phase-5-checkout-payments.md).

| Function | Role | Deploy flag |
|---|---|---|
| `checkout` | Server-authoritative order + Razorpay order creation (5.2) | `--no-verify-jwt` (public checkout) |
| `razorpay-webhook` | Signature-verified, idempotent "mark paid" (5.4) | `--no-verify-jwt` (Razorpay has no Supabase JWT) |

Both rely on migration `0006` (`apply_paid_order`, `redeem_promo`, `payment_events`,
Razorpay columns), which **is applied**.

## Deploy (when ready)

```bash
supabase link --project-ref ukqcptrbsmdreelgdovl

# Secrets (never commit these)
supabase secrets set \
  RAZORPAY_KEY_ID=rzp_live_xxx \
  RAZORPAY_KEY_SECRET=xxx \
  RAZORPAY_WEBHOOK_SECRET=xxx \
  RESEND_API_KEY=re_xxx \
  RESEND_FROM='Drip Nation <orders@your-verified-domain>'   # must be a Resend-verified sender
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

supabase functions deploy checkout --no-verify-jwt
supabase functions deploy razorpay-webhook --no-verify-jwt
```

Then in the **Razorpay dashboard** → Webhooks, add
`https://ukqcptrbsmdreelgdovl.supabase.co/functions/v1/razorpay-webhook` with the
same `RAZORPAY_WEBHOOK_SECRET`, subscribed to `payment.captured`, `order.paid`,
`payment.failed`.

## Security notes
- `SUPABASE_SERVICE_ROLE_KEY` lives only in function secrets — never in the browser.
- `apply_paid_order` / `redeem_promo` are `EXECUTE`-granted to `service_role` only
  (verified: anon RPC → 404). Only these functions can mark an order paid.
- The webhook is the sole authority on payment; the browser success callback is not trusted.
