-- ============================================================
-- DRIP NATION — 0003 — advisor-driven cleanup (performance)
--
-- 1) multiple_permissive_policies: 0001's `*_admin FOR ALL` policy overlapped
--    the `*_read FOR SELECT` policy on every SELECT (the catalog hot path),
--    so Postgres evaluated both permissive policies per row. Split the admin
--    policy into per-command write policies. SELECT is served solely by
--    `*_read`, which already grants admins via `OR is_admin()`.
--
-- 2) unindexed_foreign_keys: index order_items.product_id.
--
-- Behaviour is unchanged (admins keep full access; anon keeps Active-only read).
-- Reversible: recreate the `*_admin FOR ALL` policies and drop the index.
-- ============================================================

-- ── categories ──
drop policy if exists cat_admin on categories;
create policy cat_admin_ins on categories for insert with check (is_admin());
create policy cat_admin_upd on categories for update using (is_admin()) with check (is_admin());
create policy cat_admin_del on categories for delete using (is_admin());

-- ── products ──
drop policy if exists prod_admin on products;
create policy prod_admin_ins on products for insert with check (is_admin());
create policy prod_admin_upd on products for update using (is_admin()) with check (is_admin());
create policy prod_admin_del on products for delete using (is_admin());

-- ── promos ──
drop policy if exists promo_admin on promos;
create policy promo_admin_ins on promos for insert with check (is_admin());
create policy promo_admin_upd on promos for update using (is_admin()) with check (is_admin());
create policy promo_admin_del on promos for delete using (is_admin());

-- ── index the unindexed FK ──
create index if not exists order_items_product_id_idx on order_items (product_id);
