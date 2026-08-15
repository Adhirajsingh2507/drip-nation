# Drip Nation — Migration Reference (localStorage → Supabase)

> **This is the data-mapping / mechanics reference, not the plan.**
> The canonical, phase-by-phase build plan lives in
> [`architecture/backend-plan.md`](./architecture/backend-plan.md); the system design
> in [`architecture/system-architecture.md`](./architecture/system-architecture.md).
> To avoid two plans drifting apart, the phase breakdown that used to live here has
> moved into `backend-plan.md`. This file keeps only what those docs point *at*:
> the field mapping, money units, and seed/key mechanics for Phases 2–3.

Goal: move from **localStorage-as-database** to **Supabase** (Postgres + Auth + RLS +
Storage) without rewriting the frontend all at once.

## Current state (unchanged from prototype)

- No server. `assets/js/store-bridge.js` seeds `localStorage` per-visitor via
  `ensureDefaults()`; `admin.html` writes to the same browser's `localStorage`.
  Nothing is shared, nothing persists, `/admin.html` is unauthenticated, checkout is
  a "Coming Soon" modal.
- Schema (migrations `0001`, `0002`) is **applied** to project `ukqcptrbsmdreelgdovl`,
  but no application code reads from it yet (that is Phase 3).

---

## Field mapping (localStorage → Postgres)

The single source of truth for how the old client shapes become columns. Used by the
Phase 2 seed and the Phase 3 storefront rewrite.

| localStorage | Postgres | Change |
|---|---|---|
| `dn_categories[].slug = 'retro-jersey.html'` | `categories.slug = 'retro-jersey'` | drop `.html` |
| `dn_categories[].count` | *(dropped)* | derive via `count(products)` |
| `dn_products[].category` (name) | `products.category_id` | resolve name → FK |
| `dn_products[].sizes = 'S, M, L, XL'` | `products.sizes text[]` | split on `, ` |
| `dn_products[].sale = ''` | `products.sale = null` | empty string → null |
| `dn_products[].image` (single) | `products.images text[]` | wrap/merge into array |
| `dn_promos[].minOrder / maxUses` | `promos.min_order / max_uses` | snake_case |
| `dn_orders[]` (never populated) | `orders` + `order_items` | real line items |

**Money** stays **integer whole rupees** everywhere — matches the current JS, no
`/100` churn. (Switch to paise only if sub-rupee pricing is ever needed.)

---

## Seed mechanics (Phase 2 detail)

The current per-visitor catalog is `Math.random()` junk (`ensureDefaults()`), so there
is nothing worth migrating — decide the **real** products once and seed them:

- Quickest path: open the live site once, copy `localStorage.dn_products` from one
  browser, hand it to a one-off `supabase/seed.sql` (or ~30-line script) that rewrites
  slugs / sizes / sale per the mapping above and `insert`s (categories first, then
  products for the FK).
- Gate: every product has a valid `category_id`, a non-random price, real stock.

## Storefront query shapes (Phase 3 detail)

The `StoreBridge` getter shapes already match the schema:

| Getter | Supabase query |
|---|---|
| `getProducts()` | `.from('products').select('*, categories(name)').eq('status','Active')` |
| `getProductsByCategory(slug)` | filter on the joined category slug |
| `getProductById(id)` | `.eq('id', id).single()` |
| `validatePromo()` | keep client-side for UX; **re-validate server-side** in Phase 5 |

Then delete `ensureDefaults()` (DB is the source of truth) and the drifted `js/`
directory (the storefront loads `assets/js/`).

---

## Keys

- Frontend uses the **publishable (anon)** key only — safe to ship; RLS enforces access.
- The **service-role** key never touches the browser; Edge Functions only.
- Full secrets matrix: `architecture/system-architecture.md` §7.
- Retrieve values with the Supabase MCP: `get_project_url` + `get_publishable_keys`.

## Rollback

Each phase is additive. The storefront can keep the localStorage path behind a flag
until Phase 3's gate passes, so a bad deploy falls back instead of breaking the store.
