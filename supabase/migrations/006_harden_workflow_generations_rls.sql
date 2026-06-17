-- 006_harden_workflow_generations_rls.sql
-- Removes the permissive anon/authenticated INSERT policy on workflow_generations.
--
-- The only writer is the server-side feedback route (src/app/api/workflow/feedback/route.ts)
-- via the service-role client, which bypasses RLS. The `wf_gen_insert` policy
-- (WITH CHECK true) was therefore unused by the app but left the table writable by
-- anyone holding the public anon key through the REST API — and tripped the Supabase
-- advisor `0024_permissive_rls_policy`. Dropping it leaves the table RLS-enabled with
-- no policy: deny-by-default for anon/authenticated, service-role-only — strictly more
-- secure with zero app impact.

DROP POLICY IF EXISTS "wf_gen_insert" ON workflow_generations;
