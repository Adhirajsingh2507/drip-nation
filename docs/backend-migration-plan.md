# Drip Nation — Backend Migration Plan

Move from **localStorage-as-database** to **Supabase** (Postgres + Auth + RLS + Storage),
without rewriting the frontend all at once.

## Current state
- No server. `store-bridge.js` seeds `localStorage` per-visitor; `admin.html` writes to
  the same browser's `localStorage`. Nothing is shared, nothing persists, `/admin.html`
  is unauthenticated, checkout is a "Coming Soon" modal.

## Target
- One real catalog served to everyone from Postgres.
- Admin gated by Supabase Auth (JWT `user_role = 'admin'`).
- Real orders written at checkout; stock decremented server-side on payment.

---

## Field mapping (localStorage → Postgres)

| localStorage | Postgres | Change |
|---|---|---|
| `dn_categories[].slug = 'retro-jersey.html'` | `categories.slug = 'retro-jersey'` | drop `.html` |
| `dn_categories[].count` | *(dropped)* | derive via `count(products)` |
| `dn_products[].category` (name) | `products.category_id` | resolve name → FK |
| `dn_products[].sizes = 'S, M, L, XL'` | `products.sizes text[]` | split on `, ` |
| `dn_products[].sale = ''` | `products.sale = null` | empty string → null |
| `dn_promos[].minOrder / maxUses` | `promos.min_order / max_uses` | snake_case |
| `dn_orders[]` (never populated) | `orders` + `order_items` | real line items |

Money stays **integer whole rupees** everywhere — matches the current JS, no `/100` churn.

---

## Phases (each shippable on its own)

### Phase 1 — Schema
- Apply `supabase/migrations/0001_init.sql`.
- Verify tables + RLS in the Supabase dashboard.
- **Gate:** anon `select` on `products` returns rows; anon `select` on `orders` returns none.

### Phase 2 — Seed the real catalog
- The current per-visitor catalog is random junk (`Math.random()` prices/stock), so there's
  nothing worth migrating. Instead: decide the **real** products once and seed them.
- Quickest path: open the live site once, copy `localStorage.dn_products` from one browser,
  hand it to a one-off seed script that rewrites slugs/sizes/sale per the mapping above and
  `insert`s. (Script is ~30 lines; write it when you've picked the real catalog.)
- **Gate:** every product has a valid `category_id`, non-random price, real stock.

### Phase 3 — Storefront reads from Supabase
- Add the Supabase JS client (`@supabase/supabase-js`) with the **anon/publishable** key.
- Rewrite `store-bridge.js` getters to async Supabase queries. The shapes already match:
  - `getProducts()` → `supabase.from('products').select('*, categories(name)')`
  - `getProductsByCategory(slug)` → filter by joined category
  - `getProductById(id)` → `.eq('id', id).single()`
  - `validatePromo()` → keep client-side check for UX, but re-validate server-side in Phase 5.
- Delete the `ensureDefaults()` seeding block — the DB is now the source of truth.
- **Also fix now:** the duplicate `js/` vs `assets/js/` dirs (they've already drifted). Keep one.
- **Gate:** two different browsers see the identical catalog.

### Phase 4 — Admin auth + writes
- Turn on Supabase Auth (email/password). Create one admin user; set its `user_role` claim
  to `admin` (custom claim via an Auth Hook, or an `admins` table + policy — either works).
- Add a login screen in front of `admin.html`; unauthenticated → redirect.
- Rewrite `admin.html` `get`/`set` to Supabase `select`/`insert`/`update`/`delete`.
- **Gate:** logged-out user hitting `/admin.html` sees login, not the panel. A catalog edit
  in admin shows up on the storefront for everyone.

### Phase 5 — Checkout + orders + payment
- Replace the "Coming Soon" modal with a real checkout form (name, email, phone, address).
- Create the order via a **Supabase Edge Function** (the browser must not directly INSERT authoritative orders) that:
  recomputes totals from DB prices, re-validates the promo + increments `promos.used`,
  checks stock, then inserts `orders` + `order_items`.
- Integrate a payment provider (Razorpay is the natural fit for ₹/India). On webhook
  `payment = 'Paid'` → the `decrement_stock` trigger fires automatically.
- Send an order-confirmation email (Resend/Supabase SMTP).
- **Gate:** a test purchase writes one `orders` row + its `order_items`, decrements stock,
  and appears in the admin orders table.

### Phase 6 — Polish for production
- Move product images from the repo to Supabase Storage / a CDN.
- Server-side promo validation is the source of truth (client check is UX only).
- Run `get_advisors` (security + performance) on the Supabase project; fix RLS/index warnings.
- Wire the deploy (native Vercel Git integration — no CI token needed).

---

## Env / keys
- Frontend uses the **publishable (anon)** key only — safe to ship. RLS does the enforcement.
- The **service-role** key never touches the browser; Edge Functions only.
- `get_project_url` + `get_publishable_keys` (Supabase MCP) give you both values.

## Rollback
Each phase is additive. Storefront can keep the localStorage path behind a flag until
Phase 3's gate passes, so a bad deploy falls back instead of breaking the store.

---

## Security corrections before Phase 5

The initial schema is a foundation, not the final production authorization model.

Before production checkout:

- remove/restrict anonymous direct INSERT access to `orders`
- remove/restrict anonymous direct INSERT access to `order_items`
- route order creation through the Edge Function
- make inventory mutation concurrency-safe
- enforce promotion usage limits atomically
- verify payment provider webhooks server-side
- review function EXECUTE privileges
- review every RLS policy
- test anonymous access explicitly
- test unauthorized admin access explicitly
