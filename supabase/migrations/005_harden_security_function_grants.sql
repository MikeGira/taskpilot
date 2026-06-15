-- Migration 005: Restrict the SECURITY DEFINER audit helpers to service_role only.
--
-- Postgres grants EXECUTE to PUBLIC by default when a function is created, so
-- migration 004's "GRANT EXECUTE ... TO service_role" was additive — it never removed
-- the implicit PUBLIC grant. That left public.get_rls_status() and
-- public.enable_rls_on_table() callable by the anon and authenticated roles over
-- /rest/v1/rpc (flagged by the Supabase security advisor, lints 0028/0029).
--
-- The app only ever invokes these via the service_role admin client
-- (src/app/api/admin/security-audit + security-heal), so revoking the public grant
-- changes no application behaviour while closing the exposure.
REVOKE EXECUTE ON FUNCTION public.get_rls_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enable_rls_on_table(TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_rls_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.enable_rls_on_table(TEXT) TO service_role;
