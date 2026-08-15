# Phase 5 — Checkout, Orders & Payments (design draft)

Status: **Draft** · High-risk (payments, orders, inventory) · Requires review + approval before implementation.

Detailed spec for Phase 5 of [`backend-plan.md`](./backend-plan.md). Grounded in the
current code: the cart, the `orders`/`order_items` schema, and the hardening debt
tracked in [`system-architecture.md`](./system-architecture.md) §4.

Provider assumption: **Razorpay** (₹/India, matches ap-south-1). Email: **Resend**.
Both are confirm-before-build (see Open Decisions).

---

## 0. Current-state reality (what Phase 5 must work with)

| Thing | Today | Implication |
|---|---|---|
| Cart | `cart.js` stores `{name, price, image, quantity}` keyed by name | **No `product_id`, no `size`.** Server can't look up authoritative price/stock. **Blocking.** |
| Add-to-cart callers | `renderProductCard` + `product.html` call `addItem(name, price, image)` | product.html has a size selector that is **never passed**. Must thread id+size through. |
| Checkout | `CartEngine.showComingSoonModal()` | No real checkout exists. |
| `orders` / `order_items` | Exist, RLS locked (0002), immutable snapshots | **No Razorpay columns** to link a webhook back to an order. |
| Stock decrement | `greatest(0, stock - qty)` trigger on Paid | Oversell-unsafe (tracked debt). Must become atomic. |
| Promo usage | `promos.used` never incremented server-side | Must increment atomically, **at payment** (not checkout). |
| Money units | Integer **rupees** everywhere | Razorpay wants **paise** → ×100 at the provider boundary only. |
| Tax / shipping | `cart.html`: 18% GST on (subtotal−discount); shipping ₹149, free ≥ ₹2000 | Client display only — server must recompute authoritatively. |

---

## 1. Trust model (unchanged, restated)

The browser sends **intent only**: `product_id`, `size`, `quantity`, `promo_code`,
and contact details. It never sends prices, discounts, or totals. Everything
authoritative is computed server-side in an Edge Function using the **service-role**
key (which bypasses RLS). Payment is confirmed only by a **signature-verified webhook**.

```mermaid
flowchart LR
    C["Browser cart<br/>(intent: ids, sizes, qty)"] -->|POST| EF["checkout Edge Fn<br/>(service role)"]
    EF -->|recompute from DB| DB[("Postgres")]
    EF -->|create order (paise)| RZP["Razorpay"]
    RZP -->|checkout.js| C
    RZP -->|signed webhook| WH["razorpay-webhook Edge Fn"]
    WH -->|verify + idempotent| DB
    WH --> MAIL["Resend email"]
```

---

## 2. Sub-phases (each reviewable; ship in order)

### 5.0 — Cart carries `product_id` + `size` (frontend prerequisite) ✅ DONE
- `CartEngine.addItem(productId, name, price, image, size)`; cart item is now
  `{ product_id, name, price, image, size, quantity }`, keyed by `lineKey()` = `product_id|size`.
- Callers updated: `store-bridge.renderProductCard` (passes `product.id`, empty size),
  `product.html` ADD TO BAG (passes `product.id` + the selected size pill).
- `cart.html` shows the real size and keys qty/remove on the line key.
- **Gate (verified in-browser):** two sizes of one product → two lines, each carrying
  `product_id`; qty/remove act on the correct line. Pure client refactor, no server.

### 5.1 — Migration `0006` (schema + atomic functions)
```sql
-- Razorpay linkage + idempotency
alter table orders
  add column razorpay_order_id   text unique,
  add column razorpay_payment_id text unique;

-- Webhook idempotency / audit (service-role only; RLS on, no policies)
create table payment_events (
  id          text primary key,          -- Razorpay event id (dedupe key)
  order_id    uuid references orders(id),
  type        text not null,
  received_at timestamptz not null default now()
);
alter table payment_events enable row level security;

-- Atomic, oversell-safe "mark paid + decrement stock" (replaces greatest() trigger)
create or replace function apply_paid_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  -- one-shot: only act on a Pending order
  update orders set payment = 'Paid' where id = p_order_id and payment = 'Pending';
  if not found then return; end if;                    -- already paid / missing → no-op
  for r in select product_id, quantity from order_items
           where order_id = p_order_id and product_id is not null loop
    update products set stock = stock - r.quantity
      where id = r.product_id and stock >= r.quantity; -- atomic guard, never negative
    if not found then
      raise exception 'insufficient stock for product %', r.product_id;  -- rolls back txn
    end if;
  end loop;
end $$;

-- Atomic promo redemption (called at payment, inside the same txn)
create or replace function redeem_promo(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_code is null or p_code = '' then return; end if;
  update promos set used = used + 1
    where code = p_code and status = 'Active' and (max_uses = 0 or used < max_uses);
  if not found then raise exception 'promo % unavailable', p_code; end if;
end $$;

drop trigger if exists trg_decrement_stock on orders;   -- replaced by apply_paid_order()
```
- **Decision baked in:** stock is decremented **at payment**, atomically (`stock >= qty`
  guard); promo `used` is incremented **at payment**, so abandoned checkouts consume
  neither stock nor promo uses. Insufficient stock at payment time raises → the webhook
  flags the order for manual review rather than overselling.
- **Gate:** concurrent "mark paid" on the last unit → exactly one succeeds; the other's
  transaction raises and is caught.

### 5.2 — `checkout` Edge Function (Deno, service role)
Input: `{ items:[{product_id, size, quantity}], promo_code?, customer:{name,email,phone,address} }`
```
1. validate input shape (ids are ints, qty 1..N, required customer fields)
2. fetch products where id in (ids), status='Active'
3. for each line: product exists? size in product.sizes? stock >= qty?  (else 4xx, no order)
4. subtotal = Σ (sale ?? price) * qty          -- server prices only
5. if promo_code: validate status/expiry/min_order/(max_uses>used) → discount (NO increment yet)
6. shipping = subtotal >= 2000 ? 0 : 149 ; tax = round((subtotal-discount)*0.18)
7. total = (subtotal - discount) + tax + shipping
8. txn: insert orders(Pending, totals, promo_code, customer)
        + insert order_items (name/price snapshots from DB, size, qty)
9. Razorpay: POST /v1/orders { amount: total*100, currency:'INR', receipt: order.id }
        → save razorpay_order_id on the order
10. return { order_id, razorpay_order_id, amount: total*100, key_id: RAZORPAY_KEY_ID }
```
- **Never** reads price/total from the request. Client-sent prices are ignored entirely.
- **Gate (failure paths):** invalid product, unavailable, qty>stock, invalid/expired/
  exhausted promo → clean 4xx, no order row created.

### 5.3 — Checkout UI (replace the Coming Soon modal)
- `cart.html`: real form (name, email, phone, address) → POST to `checkout` → open
  Razorpay `checkout.js` with the returned `{ order_id, amount, key_id }`.
- On Razorpay success handler: show "payment processing" state and poll/await the order
  becoming `Paid` (the webhook is authoritative — the client success callback alone
  never marks paid). Redirect to an order-confirmation view.
- Keep the Coming Soon modal behind a flag as the kill-switch until this gate passes.

### 5.4 — `razorpay-webhook` Edge Function (authoritative confirmation)
```
1. read RAW body; verify header X-Razorpay-Signature == HMAC_SHA256(body, WEBHOOK_SECRET)  (else 401)
2. parse event; INSERT payment_events(id=event.id) — on conflict → 200 (already processed)
3. if event in (payment.captured, order.paid):
     find order by razorpay_order_id
     txn: apply_paid_order(order_id)         -- sets Paid + atomic stock decrement
          redeem_promo(order.promo_code)     -- atomic usage increment
          set razorpay_payment_id
     enqueue Resend confirmation email (failure ≠ payment failure)
4. if payment.failed: leave order Pending/Failed (no stock/promo effect)
5. return 200
```
- Idempotent (event-id dedupe + Pending→Paid one-shot), replay-safe, signature-verified,
  every event logged.
- **Gate (failure paths):** forged signature → 401; duplicate event → no double-decrement;
  unmatched order handled; payment.failed leaves stock intact.

### 5.5 — Confirmation email (Resend) + order lookup
- On Paid: send order confirmation (items, total, address) via Resend from the webhook.
- Guest order-confirmation view: a page that reads the order by id **only right after
  checkout** (short-lived token or the return from checkout) — anon cannot list orders
  (RLS). Decide the guest-access mechanism (see Open Decisions).

---

## 3. Secrets (Supabase Edge Function secrets — never in the browser)

| Secret | Used by | In browser? |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | both functions | never |
| `RAZORPAY_KEY_ID` | checkout fn + client | yes (public) |
| `RAZORPAY_KEY_SECRET` | checkout fn (order create) | never |
| `RAZORPAY_WEBHOOK_SECRET` | webhook fn (signature) | never |
| `RESEND_API_KEY` | webhook fn (email) | never |

Set via `supabase secrets set` / dashboard. None committed. The webhook must be registered
in the Razorpay dashboard pointing at the deployed function URL with the same secret.

---

## 4. Failure / test matrix (must all be covered)

| Case | Expected |
|---|---|
| Invalid `product_id` | 4xx, no order |
| Product Hidden / not found | 4xx, no order |
| `quantity` > stock | 4xx, no order |
| Client sends a fake low price | Ignored; server price used |
| Invalid / expired / exhausted promo | 4xx or discount 0; no order |
| Payment cancelled / failed | Order stays Pending/Failed; no stock/promo change |
| Duplicate webhook (same event id) | No-op, 200 |
| Replayed/forged webhook signature | 401, no state change |
| Two buyers, last unit, concurrent pay | One Paid; other txn raises → flagged, no oversell |
| Abandoned checkout (order, no pay) | Pending forever; stock & promo untouched |

---

## 5. Open decisions (need your input before 5.1)

1. **Provider = Razorpay?** (₹/UPI/India). Confirm, or name an alternative.
2. **Tax:** is flat **18% GST** correct, or does it vary by product/state? (Legal/business.)
3. **Shipping:** keep **₹149, free ≥ ₹2000**? Any zones/weights?
4. **Guest checkout only** (no customer accounts at launch)? Confirm.
5. **Stock timing:** decrement **at payment** (recommended, drafted) vs reserve at checkout.
6. **Email:** Resend vs Supabase SMTP.
7. **Guest order lookup:** short-lived signed link vs an order-token returned at checkout.

---

## 6. Risk & review

Highest-risk phase in the project. Recommended flow per the contract:
**architect → implement → tests (failure-first) → security review → code review.**
Each sub-phase (5.0–5.5) is independently reviewable; 5.1/5.2/5.4 are the security-critical
ones. Nothing here is implemented yet — this is the draft to review before writing `0006`.
