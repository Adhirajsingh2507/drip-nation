-- ============================================================
-- DRIP NATION — 0007 — checkout abuse protection (Phase 6)
--
-- A lightweight per-IP rate limit for the checkout Edge Function so a single
-- client can't hammer order/Razorpay-order creation. Service-role only.
-- ============================================================

create table checkout_attempts (
  id         bigint generated always as identity primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index checkout_attempts_ip_time_idx on checkout_attempts (ip, created_at desc);
alter table checkout_attempts enable row level security;   -- no policies → service-role only

-- Records an attempt and returns true iff the IP is under the limit in the window.
create or replace function rate_ok(p_ip text, p_max int default 8, p_window interval default interval '10 minutes')
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.checkout_attempts where created_at < now() - interval '1 hour';  -- housekeeping
  select count(*) into n from public.checkout_attempts
    where ip = p_ip and created_at > now() - p_window;
  insert into public.checkout_attempts(ip) values (p_ip);
  return n < p_max;
end $$;

revoke all on function rate_ok(text, int, interval) from public, anon, authenticated;
grant execute on function rate_ok(text, int, interval) to service_role;
