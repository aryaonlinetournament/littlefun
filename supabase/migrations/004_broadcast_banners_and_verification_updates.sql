-- =============================================================================
-- Migration 004: Broadcast Logs, App Banners, Verification & Notification Updates
-- Run in Supabase SQL Editor: https://app.supabase.com/project/_/sql/new
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NOTIFICATION ENUM / TYPE EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Add SYSTEM_ANNOUNCEMENT if notification_type enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    BEGIN
      ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SYSTEM_ANNOUNCEMENT';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PROFILE VERIFICATIONS SCHEMA REFINEMENTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure profile_verifications has all required columns for selfie & document verification
CREATE TABLE IF NOT EXISTS public.profile_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type       TEXT NOT NULL DEFAULT 'SELFIE',
  status              TEXT NOT NULL DEFAULT 'PENDING',
  document_path       TEXT,
  document_url        TEXT,
  selfie_url          TEXT,
  id_document_url     TEXT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID,
  rejection_reason    TEXT,
  notes               TEXT
);

-- Safely add missing columns if table already existed from previous migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_verifications' AND column_name='document_url') THEN
    ALTER TABLE public.profile_verifications ADD COLUMN document_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_verifications' AND column_name='selfie_url') THEN
    ALTER TABLE public.profile_verifications ADD COLUMN selfie_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_verifications' AND column_name='id_document_url') THEN
    ALTER TABLE public.profile_verifications ADD COLUMN id_document_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_verifications' AND column_name='document_type') THEN
    ALTER TABLE public.profile_verifications ADD COLUMN document_type TEXT DEFAULT 'SELFIE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_verifications' AND column_name='rejection_reason') THEN
    ALTER TABLE public.profile_verifications ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS verif_profile_id_idx ON public.profile_verifications(profile_id);
CREATE INDEX IF NOT EXISTS verif_status_idx ON public.profile_verifications(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BROADCAST NOTIFICATIONS LOGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broadcast_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  target      TEXT NOT NULL DEFAULT 'ALL',
  type        TEXT NOT NULL DEFAULT 'BOTH',
  sent_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_logs_created ON public.broadcast_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. APP BANNERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  cta_text    TEXT,
  cta_link    TEXT,
  bg_color    TEXT DEFAULT 'linear-gradient(135deg, #C8386D 0%, #E85A8F 100%)',
  priority    INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_banners_priority_active ON public.app_banners(priority ASC, is_active);

-- Seed default initial banners if empty
INSERT INTO public.app_banners (title, subtitle, cta_text, bg_color, priority, is_active)
SELECT '🎉 Discover Companions Near You', 'Explore verified profiles in your city with 100% privacy', 'Explore Now', 'linear-gradient(135deg, #C8386D 0%, #E85A8F 100%)', 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.app_banners);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS POLICIES & PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profile_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active banners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_banners' AND policyname = 'Allow public read active banners'
  ) THEN
    CREATE POLICY "Allow public read active banners"
      ON public.app_banners FOR SELECT
      USING (is_active = TRUE);
  END IF;
END $$;

-- Service role bypasses RLS for full admin operations
GRANT ALL ON public.profile_verifications TO postgres, service_role;
GRANT ALL ON public.broadcast_logs TO postgres, service_role;
GRANT ALL ON public.app_banners TO postgres, service_role;
GRANT SELECT ON public.app_banners TO anon, authenticated;
