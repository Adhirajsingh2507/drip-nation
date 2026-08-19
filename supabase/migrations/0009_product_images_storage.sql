-- 0009_product_images_storage.sql
-- Public-read Storage bucket for product photos + admin-only writes.
-- Reads are public (catalog images load with the anon key); uploads/updates/
-- deletes require an admin (is_admin() — same authz gate as catalog writes).

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read (anyone can view images in this bucket).
create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Admin-only write. is_admin() checks membership in the admins table.
create policy "product-images admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and is_admin());

create policy "product-images admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and is_admin());

create policy "product-images admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and is_admin());
