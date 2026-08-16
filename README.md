# Drip Nation

**Premium streetwear e-commerce.** *Where athletic heritage meets the culture of tomorrow.*

A static, editorial storefront (vanilla HTML/CSS/JS) being migrated onto a
production-grade **Supabase** backend (PostgreSQL + Auth + RLS + Edge Functions),
with **Razorpay** payments and **Resend** email. Deployed on **Vercel** (auto-deploy
from `main`).

---

## Status at a glance

| Area | State |
|---|---|
| Storefront (catalog) reads from Supabase | ✅ Live |
| Database schema + RLS (migrations `0001`–`0006`) | ✅ Applied |
| Admin panel (email/password auth + `admins` table + CRUD) | ✅ Built — needs first admin created |
| Checkout UI + cart with `product_id`/`size` | ✅ Built (gated by a flag) |
| Payments (`checkout` / `razorpay-webhook` / `order-status` functions) | 🟡 Written, **not deployed** (needs Razorpay/Resend accounts) |
| Order-confirmation email + signed order-lookup page | ✅ Built (no-op until email keys set) |

Detailed plan & progress: [`docs/architecture/backend-plan.md`](docs/architecture/backend-plan.md).

---

## Tech stack

- **Frontend:** static HTML/CSS/vanilla JS (no framework, no build step). Editorial
  design is a product asset — preserved deliberately.
- **Backend:** Supabase — PostgreSQL, Auth, Row Level Security, Edge Functions (Deno).
- **Payments:** Razorpay (₹/India). **Email:** Resend. **Hosting/CI:** Vercel.
- **Supabase project ref:** `ukqcptrbsmdreelgdovl` (region `ap-south-1`).

---

## Project structure

```
├── index / shop / category / product / cart / order / admin .html   # pages
├── assets/
│   ├── css/styles.css
│   ├── js/
│   │   ├── cart.js              # CartEngine (localStorage cart; carries product_id + size)
│   │   ├── store-bridge.js      # catalog reads from Supabase (anon key)
│   │   ├── supabase-client.js   # DN_CONFIG + client (public anon key, feature flags)
│   │   └── vendor/              # self-hosted supabase-js (no CDN)
│   └── images/
├── supabase/
│   ├── migrations/              # 0001–0006 (schema, RLS, admin authz, profiles, checkout)
│   ├── seed.sql                 # provisional catalog + promos
│   └── functions/               # Edge Functions (checkout, razorpay-webhook, order-status)
└── docs/
    ├── architecture/            # system architecture, backend plan, Phase 5 design
    └── decisions/               # ADRs
```

## Architecture & security model

The browser is an **untrusted client**. Prices, inventory, discounts, order totals,
payment status, and admin authorization are all decided server-side.

- **Catalog reads:** anon key + RLS (Active rows only).
- **Admin writes:** gated by the `admins` table via `is_admin()` in RLS — the UI only
  *hides* controls; RLS is the real gate.
- **Orders/payments:** created only by the service-role `checkout` Edge Function;
  marked paid only by the signature-verified `razorpay-webhook`. A browser "success"
  never marks an order paid.

More: [`docs/architecture/system-architecture.md`](docs/architecture/system-architecture.md) ·
[`docs/decisions/0001-commerce-trust-boundary.md`](docs/decisions/0001-commerce-trust-boundary.md).

## Database migrations

| Migration | What it does |
|---|---|
| `0001_init` | Core schema (categories, products, promos, orders, order_items) + RLS |
| `0002_lock_order_writes` | Close anon INSERT on orders/order_items (fail-closed) |
| `0003_advisor_cleanup` | Per-command policies (perf) + index FK |
| `0004_admin_authz` | `admins` table; `is_admin()` checks membership |
| `0005_profiles` | `profiles` table auto-populated from signup metadata |
| `0006_checkout` | Razorpay columns, `payment_events`, atomic `apply_paid_order`/`redeem_promo` |
| `0007_rate_limit` | Per-IP checkout rate limiting (`rate_ok`, abuse protection) |
| `0008_lock_trigger_fn` | Revoke direct execute on the signup trigger fn (surface reduction) |

Money is stored as **integer whole rupees** everywhere. Migrations are applied to the
Supabase project; the SQL files are the source of truth.

---

## Local development

No build step — it's a static site:

```bash
python3 -m http.server 8137
# open http://localhost:8137
```

The pages talk to the live Supabase project using the **public anon key** (safe by
design; RLS enforces access), so the catalog loads locally too.

**Kill-switches** in `assets/js/supabase-client.js`:
- `useSupabase` — false falls back to the localStorage prototype catalog.
- `checkoutEnabled` — false shows a "Coming Soon" modal instead of the checkout form.

---

## Admin panel (`/admin.html`)

Email/password sign-in + sign-up. **Creating an account does not grant admin** — a user
must be in the `admins` table.

**Bootstrap the first admin:**
1. Supabase Dashboard → **Auth → Users → Add user** → email + password, check
   **Auto Confirm User** (no SMTP configured yet).
2. SQL Editor:
   ```sql
   insert into admins (id) select id from auth.users where email = 'YOUR_EMAIL';
   ```
3. Sign in at `/admin.html`.

Sections: Dashboard, Category/Product/Promo CMS (Supabase-backed), Orders (view +
fulfillment), Users (profiles), plus local-only Hero/Marquee CMS, Activity, Settings.

---

## Payments / checkout (Phase 5)

Code is complete; going live needs external accounts. See the deploy guide in
[`supabase/functions/README.md`](supabase/functions/README.md) and the design in
[`docs/architecture/phase-5-checkout-payments.md`](docs/architecture/phase-5-checkout-payments.md).

**To go live you must:**
1. Create a **Razorpay** merchant account (KYC) → key id/secret + webhook secret.
2. Create a **Resend** account + verify a sending domain → API key.
3. Deploy the 3 Edge Functions and set secrets (`supabase functions deploy …`).
4. Register the Razorpay webhook at the `razorpay-webhook` function URL.
5. Set `checkoutEnabled: true` in `supabase-client.js`.

---

## Deployment

Vercel auto-deploys on every push to `main` (project **`drip-nation`**). Supabase
migrations are applied separately (they are not part of the Vercel build).
