-- ============================================================
-- DRIP NATION — 0008 — reduce attack surface on the signup trigger fn
--
-- handle_new_user() is a SECURITY DEFINER trigger function. The
-- on_auth_user_created trigger fires as part of the auth.users INSERT and does
-- NOT depend on the caller's EXECUTE grant, so revoking direct execute from
-- anon/authenticated is safe. It removes the (near-useless — it errors without
-- a trigger NEW row) ability to call it directly and clears the
-- anon/authenticated_security_definer_function_executable advisor warnings.
-- ============================================================

revoke all on function handle_new_user() from public, anon, authenticated;
