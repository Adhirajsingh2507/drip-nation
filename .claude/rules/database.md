# Database Rules

Drip Nation uses PostgreSQL through Supabase.

## Source of Truth

The database is authoritative for:

- products
- prices
- inventory
- promotions
- orders
- payments
- customer-owned persistent data

The browser is never authoritative for business data.

## Schema Changes

All schema changes must use migrations.

Before changing schema:

1. Inspect existing migrations.
2. Inspect application usage.
3. Identify dependencies.
4. Identify data migration requirements.
5. Identify RLS implications.
6. Identify rollback/mitigation.

Destructive operations require explicit approval.

## RLS

Every exposed table must have deliberate RLS behavior.

Never disable RLS as a debugging shortcut.

Review:

- anon access
- authenticated access
- admin access
- ownership
- write permissions
- function execution permissions

RLS policies must reflect the intended trust boundary.

## Commerce Writes

Do not allow anonymous clients to directly create authoritative orders, payments, inventory mutations, or promotion redemptions merely for convenience.

Checkout/order creation should occur through a server-side trusted boundary such as an Edge Function or tightly controlled database function.

## Inventory

Inventory operations must be concurrency-safe.

Never use:

stock = greatest(0, stock - quantity)

as the sole protection against overselling.

Inventory updates must verify availability atomically.

Use transactional/locking strategies where required.

## Promotions

Promotion validation and usage accounting must be server-authoritative.

Usage limits must be enforced atomically.

Do not rely on:

- frontend counters
- localStorage
- client-side validation
- independent read-then-write operations

## Payment State

Payment state changes must originate from verified payment-provider events or trusted server-side logic.

Never allow an anonymous browser to mark an order as paid.

## Functions

Database functions and Edge Functions are security boundaries.

Review:

- execute permissions
- security invoker/definer behavior
- search_path
- exposed arguments
- input validation

Never create an unnecessarily powerful public function.

## Constraints

Prefer database-enforced integrity:

- foreign keys
- unique constraints
- check constraints
- not-null constraints

Do not rely solely on application code for invariants that PostgreSQL can enforce.

## Performance

Consider:

- indexes
- joins
- filtering
- ordering
- pagination
- query frequency
- concurrency

Do not add indexes without understanding the query they support.
