-- ============================================================
-- TaskPilot — Supabase Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Extends auth.users. Created automatically on first login via auth callback.
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT        NOT NULL,
  full_name          TEXT        CHECK (char_length(full_name) <= 200),
  stripe_customer_id TEXT        UNIQUE,
  gdpr_consent_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── products ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            TEXT        UNIQUE NOT NULL,
  name            TEXT        NOT NULL CHECK (char_length(name) <= 200),
  tagline         TEXT        CHECK (char_length(tagline) <= 500),
  description     TEXT,
  price_cents     INTEGER     NOT NULL CHECK (price_cents > 0),
  currency        TEXT        NOT NULL DEFAULT 'usd',
  stripe_price_id TEXT        NOT NULL,
  storage_path    TEXT        NOT NULL,
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── purchases ─────────────────────────────────────────────────────────────────
-- user_id is nullable: webhook fires before buyer may have an account.
-- Dashboard queries by BOTH user_id AND email to cover guest→account upgrade.
CREATE TABLE IF NOT EXISTS public.purchases (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  email              TEXT        NOT NULL,
  product_id         UUID        NOT NULL REFERENCES public.products(id),
  product_slug       TEXT        NOT NULL,
  stripe_session_id  TEXT        UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  amount_cents       INTEGER     NOT NULL,
  currency           TEXT        NOT NULL DEFAULT 'usd',
  status             TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id    ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_email      ON public.purchases(email);
CREATE INDEX IF NOT EXISTS idx_purchases_session_id ON public.purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status     ON public.purchases(status);

-- ── subscribers ───────────────────────────────────────────────────────────────
-- Double opt-in: confirmed=false until user clicks the confirmation link.
CREATE TABLE IF NOT EXISTS public.subscribers (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email              TEXT        UNIQUE NOT NULL CHECK (char_length(email) <= 254),
  name               TEXT        CHECK (char_length(name) <= 200),
  confirmed          BOOLEAN     NOT NULL DEFAULT FALSE,
  confirmation_token TEXT,
  confirmed_at       TIMESTAMPTZ,
  source             TEXT        NOT NULL DEFAULT 'website',
  unsubscribed_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON public.subscribers(confirmation_token);

-- ── contact_requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email      TEXT    NOT NULL CHECK (char_length(email) <= 254),
  company    TEXT    CHECK (char_length(company) <= 200),
  message    TEXT    NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  budget     TEXT    CHECK (budget IN ('under_500', '500_2000', '2000_5000', '5000_plus', 'not_sure')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── email_logs ────────────────────────────────────────────────────────────────
-- GDPR Article 5 accountability — audit trail of all sent emails.
CREATE TABLE IF NOT EXISTS public.email_logs (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient  TEXT    NOT NULL,
  subject    TEXT    NOT NULL,
  email_type TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'sent',
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── generation_feedback ───────────────────────────────────────────────────────
-- Anonymous thumbs-up/down on AI-generated content. No user_id by design.
-- ip_hash is set app-side for throttling; not enforced at DB level.
CREATE TABLE IF NOT EXISTS public.generation_feedback (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  os          TEXT        NOT NULL,
  environment TEXT        NOT NULL,
  language    TEXT,
  rating      SMALLINT    NOT NULL CHECK (rating = ANY(ARRAY[1::smallint, (-1)::smallint])),
  comment     TEXT        CHECK (char_length(comment) <= 500),
  ip_hash     TEXT
);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = public;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_feedback ENABLE ROW LEVEL SECURITY;

-- profiles: each user sees and edits only their own row
CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- products: anyone can read active products (safe — no PII)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (active = TRUE);

-- purchases: authenticated users see only their own rows (by user_id OR email)
CREATE POLICY "purchases_own_select" ON public.purchases
  FOR SELECT USING (
    auth.uid() = user_id
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- subscribers, contact_requests, email_logs: service_role only
CREATE POLICY "subscribers_service_role" ON public.subscribers
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "contacts_service_role" ON public.contact_requests
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "email_logs_service_role" ON public.email_logs
  FOR ALL USING (auth.role() = 'service_role');

-- generation_feedback: anyone can submit; WITH CHECK mirrors the rating constraint
-- so the policy is non-trivially true and scoped to specific roles
CREATE POLICY "anon_insert_feedback" ON public.generation_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (rating = ANY(ARRAY[1::smallint, (-1)::smallint]));

-- ── Seed: initial product ─────────────────────────────────────────────────────
-- Replace REPLACE_WITH_STRIPE_PRICE_ID after creating the product in Stripe.
INSERT INTO public.products (slug, name, tagline, description, price_cents, currency, stripe_price_id, storage_path, active)
VALUES (
  'it-helpdesk-starter-kit',
  'IT Helpdesk Automation Starter Kit',
  'Save 5+ hours a week. Automate the repetitive stuff.',
  '7 production-ready PowerShell scripts for AD password resets, disk cleanup, user onboarding, and daily health checks — with config files and a step-by-step setup guide.',
  1900,
  'usd',
  'REPLACE_WITH_STRIPE_PRICE_ID',
  'products/taskpilot-kit.zip',
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- ── Data API Grants (Supabase May/Oct 2026 compliance) ───────────────────────
-- GRANTs are the access layer; RLS is the authorization layer. Both required.
-- Grants must exactly mirror the RLS policies defined above.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- profiles: authenticated users read/write their own row (mirrors profiles_own_*)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- products: public catalog read (mirrors products_public_read)
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;

-- purchases: authenticated users see their own rows (mirrors purchases_own_select)
GRANT SELECT ON public.purchases TO authenticated;

-- subscribers, contact_requests, email_logs: server-side only (mirrors *_service_role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscribers       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_requests  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs        TO service_role;

REVOKE ALL ON public.subscribers      FROM anon, authenticated;
REVOKE ALL ON public.contact_requests FROM anon, authenticated;
REVOKE ALL ON public.email_logs       FROM anon, authenticated;

-- generation_feedback: anyone can INSERT; service_role handles all other ops
GRANT INSERT ON public.generation_feedback TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_feedback TO service_role;

-- rls_auto_enable is a Supabase internal function — revoke from PUBLIC, not just
-- individual roles, since the PUBLIC grant overrides role-level revokes
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;

-- ── Verification ──────────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
