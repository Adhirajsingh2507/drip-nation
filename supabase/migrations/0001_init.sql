-- ============================================================
-- DRIP NATION — initial schema
-- Maps the current localStorage model (dn_categories, dn_products,
-- dn_promos, dn_orders) onto real Postgres tables + RLS.
--
-- Money: stored as INTEGER whole rupees to match the current
-- frontend (₹, no paise anywhere in the JS).
-- ponytail: integer rupees, switch to paise/minor-units only if
-- you ever need sub-rupee pricing — it's a column type change + a /100.
-- ============================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ── Categories ────────────────────────────────────────────
create table categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  slug        text not null unique,          -- e.g. 'retro-jersey' (drop the .html)
  image       text,
  description text default '',
  status      text not null default 'Active' check (status in ('Active','Hidden')),
  created_at  timestamptz not null default now()
);

-- ── Products ──────────────────────────────────────────────
create table products (
  id          bigint generated always as identity primary key,
  name        text not null,
  category_id bigint not null references categories(id) on delete restrict,
  price       integer not null check (price >= 0),      -- whole rupees
  sale        integer check (sale is null or sale >= 0),-- null = not on sale
  stock       integer not null default 0 check (stock >= 0),
  sizes       text[] not null default '{}',             -- was 'S, M, L, XL' string
  sku         text unique,
  images      text[] not null default '{}',
  material    text default '',
  description text default '',
  status      text not null default 'Active' check (status in ('Active','Hidden')),
  created_at  timestamptz not null default now()
);
create index on products (category_id);
create index on products (status);

-- ── Promos ────────────────────────────────────────────────
create table promos (
  id         bigint generated always as identity primary key,
  code       text not null unique,
  type       text not null check (type in ('percentage','fixed','shipping')),
  value      integer not null default 0,
  min_order  integer not null default 0,
  max_uses   integer not null default 0,       -- 0 = unlimited
  used       integer not null default 0,
  expiry     date,                             -- null = no expiry
  status     text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz not null default now()
);

-- ── Orders + line items ───────────────────────────────────
create table orders (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email         text,
  phone         text,
  address       jsonb,                          -- {line1, city, state, pincode}
  subtotal      integer not null,
  discount      integer not null default 0,
  shipping      integer not null default 0,
  total         integer not null,
  promo_code    text,
  payment       text not null default 'Pending' check (payment in ('Pending','Paid','Failed','Refunded')),
  fulfillment   text not null default 'Processing' check (fulfillment in ('Processing','Shipped','Delivered','Cancelled')),
  created_at    timestamptz not null default now()
);
create index on orders (created_at desc);

create table order_items (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  name       text not null,        -- snapshot; survives product deletion
  price      integer not null,     -- snapshot at purchase time
  size       text,
  quantity   integer not null check (quantity > 0)
);
create index on order_items (order_id);

-- ── Stock decrement on paid order (server-authoritative) ──
-- ponytail: naive per-row update, fine at this catalog size;
-- revisit with SELECT ... FOR UPDATE if you hit concurrent oversell.
create or replace function decrement_stock()
returns trigger language plpgsql as $$
begin
  if new.payment = 'Paid' and (old.payment is distinct from 'Paid') then
    update products p
       set stock = greatest(0, p.stock - oi.quantity)
      from order_items oi
     where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end $$;

create trigger trg_decrement_stock
  after update on orders
  for each row execute function decrement_stock();

-- ============================================================
-- Row Level Security
-- Public (anon): read Active catalog, create orders at checkout.
-- Admin: full access, gated by a JWT claim `role = 'admin'`.
-- ============================================================
alter table categories  enable row level security;
alter table products    enable row level security;
alter table promos      enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- helper: is the caller an admin?
create or replace function is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'user_role', '') = 'admin';
$$;

-- Public read of active catalog
create policy cat_read   on categories for select using (status = 'Active' or is_admin());
create policy prod_read  on products   for select using (status = 'Active' or is_admin());
create policy promo_read on promos     for select using (status = 'Active' or is_admin());

-- Admin writes catalog
create policy cat_admin   on categories for all using (is_admin()) with check (is_admin());
create policy prod_admin  on products   for all using (is_admin()) with check (is_admin());
create policy promo_admin on promos     for all using (is_admin()) with check (is_admin());

-- Orders: anon may INSERT (checkout); only admin may read/update.
-- ponytail: order creation validation (totals, stock, promo) belongs in an
-- Edge Function, not the client — the INSERT policy below is the floor, not the ceiling.
create policy order_create on orders      for insert with check (true);
create policy order_admin  on orders      for select using (is_admin());
create policy order_update on orders      for update using (is_admin()) with check (is_admin());
create policy oi_create    on order_items for insert with check (true);
create policy oi_admin     on order_items for select using (is_admin());
