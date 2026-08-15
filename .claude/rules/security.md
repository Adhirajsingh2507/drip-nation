# Security Rules

Security-sensitive logic must be server-authoritative.

Never trust:

- client prices
- client totals
- client discounts
- client inventory
- client payment status
- frontend admin checks

Never expose:

- Supabase service-role keys
- payment secrets
- webhook secrets
- database credentials
- deployment tokens

RLS must remain enabled for protected Supabase tables.

Authorization must be enforced independently of UI visibility.

Payment webhooks must verify signatures and support idempotency.

If a credential appears committed or exposed, stop and report it.
