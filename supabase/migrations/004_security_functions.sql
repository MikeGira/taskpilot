-- Migration 004: Security audit helper functions
-- Apply in Supabase SQL Editor or via MCP before using the Security Self-Scan feature.

-- Returns RLS status for every table in the public schema.
CREATE OR REPLACE FUNCTION public.get_rls_status()
RETURNS TABLE(tablename TEXT, rls_enabled BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT t.tablename::TEXT, t.rowsecurity::BOOLEAN
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public';
$$;

GRANT EXECUTE ON FUNCTION public.get_rls_status() TO service_role;

-- Enables RLS on a specific table (allowlisted — safe to call from the Self-Heal endpoint).
CREATE OR REPLACE FUNCTION public.enable_rls_on_table(target_table TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF target_table NOT IN (
    'profiles', 'products', 'purchases', 'subscribers',
    'contact_requests', 'email_logs', 'generation_feedback', 'workflow_generations'
  ) THEN
    RAISE EXCEPTION 'Table not in allowlist: %', target_table;
  END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
  RETURN 'RLS enabled on ' || target_table;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enable_rls_on_table(TEXT) TO service_role;
