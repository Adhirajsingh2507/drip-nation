-- ============================================================
-- DRIP NATION — 0002 — lock down order writes
--
-- The initial schema (0001) let anonymous clients INSERT orders and
-- order_items directly:
--     create policy order_create on orders      for insert with check (true);
--     create policy oi_create    on order_items for insert with check (true);
-- That allowed a forged order with an attacker-controlled total to be created
-- straight through the public Data API (verified: anon POST /orders → 201).
--
-- Authoritative order creation will run inside a Supabase Edge Function using the
-- service-role key, which BYPASSES RLS entirely — so legitimate checkout needs no
-- INSERT policy at all. Dropping these policies makes the tables fail-closed
-- (RLS default-deny) until that function exists. No current code path writes
-- orders, so this has zero functional impact on the live prototype.
--
-- Reversible: recreate the two policies to roll back.
--
-- STILL OPEN for Phase 5 (require the Edge Function's transactional context,
-- deliberately NOT fixed here):
--   * oversell-safe stock decrement (replace greatest(0, stock - qty) with an
--     atomic conditional update / SELECT ... FOR UPDATE)
--   * atomic promotion usage accounting
-- ============================================================

drop policy if exists order_create on orders;
drop policy if exists oi_create    on order_items;

-- orders / order_items now have NO insert policy → anon & authenticated INSERTs
-- are denied by default. Reads/updates are unchanged (admin-only via is_admin()).
