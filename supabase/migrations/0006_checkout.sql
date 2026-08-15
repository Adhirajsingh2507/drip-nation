-- ============================================================
-- DRIP NATION — 0006 — checkout / payment support (Phase 5.1)
--
-- Adds Razorpay linkage + webhook idempotency, and replaces the old
-- greatest(0, stock-qty) trigger with an atomic, oversell-safe "mark paid +
-- decrement stock" function plus an atomic promo-redemption function. Both are
-- SECURITY DEFINER, search_path-locked, and callable ONLY by the service role
-- (the Edge Functions) — never by anon/authenticated.
-- ============================================================

-- ── Razorpay linkage on orders ──
alter table orders
  add column razorpay_order_id   text unique,
  add column razorpay_payment_id text unique;

-- ── Webhook idempotency / audit (service-role only; RLS on, no policies) ──
create table payment_events (
  id          text primary key,           -- Razorpay event id (dedupe key)
  order_id    uuid references orders(id),
  type        text not null,
  received_at timestamptz not null default now()
);
alter table payment_events enable row level security;

-- ── Atomic, oversell-safe: mark a Pending order Paid + decrement stock ──
-- Idempotent: a second call finds the order no longer Pending and no-ops.
-- If any line lacks stock, the whole transaction rolls back (payment stays
-- Pending) so the webhook can flag it instead of overselling.
create or replace function apply_paid_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  update public.orders set payment = 'Paid' where id = p_order_id and payment = 'Pending';
  if not found then return; end if;                         -- already paid / missing → no-op
  for r in select product_id, quantity from public.order_items
           where order_id = p_order_id and product_id is not null loop
    update public.products set stock = stock - r.quantity
      where id = r.product_id and stock >= r.quantity;      -- atomic guard, never negative
    if not found then
      raise exception 'insufficient stock for product %', r.product_id;  -- rolls back txn
    end if;
  end loop;
end $$;

-- ── Atomic promo redemption (called at payment, inside the webhook) ──
create or replace function redeem_promo(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_code is null or p_code = '' then return; end if;
  update public.promos set used = used + 1
    where code = p_code and status = 'Active' and (max_uses = 0 or used < max_uses);
  if not found then raise exception 'promo % unavailable', p_code; end if;
end $$;

-- Lock down execution: only the service role (Edge Functions) may call these.
-- Supabase grants EXECUTE to anon/authenticated directly (not only via PUBLIC),
-- so all three must be revoked explicitly.
revoke all on function apply_paid_order(uuid) from public, anon, authenticated;
revoke all on function redeem_promo(text)     from public, anon, authenticated;
grant execute on function apply_paid_order(uuid) to service_role;
grant execute on function redeem_promo(text)     to service_role;

-- ── Retire the old non-atomic decrement trigger ──
drop trigger  if exists trg_decrement_stock on orders;
drop function if exists decrement_stock();
