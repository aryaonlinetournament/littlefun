-- =============================================================================
-- LITTLEFUN V2 — COMPLETE DATABASE SCHEMA (Migration 001)
-- Run in Supabase SQL Editor: https://app.supabase.com/project/_/sql/new
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA RESET (Fresh V1 -> V2 Migration Setup)
-- ─────────────────────────────────────────────────────────────────────────────
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres, service_role, anon, authenticated, public;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'OPERATIONS', 'CUSTOMER', 'PROVIDER'
);

CREATE TYPE user_status AS ENUM (
  'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED', 'PENDING'
);

CREATE TYPE profile_type AS ENUM (
  'REAL_PERSON', 'PROVIDER', 'AI_ASSISTED', 'SIMULATED'
);

CREATE TYPE discovery_status AS ENUM (
  'VISIBLE', 'HIDDEN', 'PAUSED', 'PENDING_REVIEW'
);

CREATE TYPE verification_status AS ENUM (
  'UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
);

CREATE TYPE verification_type AS ENUM (
  'ID_DOCUMENT', 'SELFIE', 'VIDEO_LIVENESS', 'PHONE'
);

CREATE TYPE requirement_type AS ENUM (
  'OUTING', 'DINNER', 'COFFEE', 'EVENT', 'TRAVEL', 'COMPANIONSHIP', 'OTHER'
);

CREATE TYPE requirement_status AS ENUM (
  'DRAFT', 'OPEN', 'MATCHING', 'RESPONSES_AVAILABLE', 'SELECTED',
  'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'
);

CREATE TYPE match_status AS ENUM (
  'ACTIVE', 'UNMATCHED', 'BLOCKED'
);

CREATE TYPE message_type AS ENUM (
  'TEXT', 'IMAGE', 'AUDIO', 'SYSTEM'
);

CREATE TYPE request_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'MATCHING', 'PENDING_RESPONSE',
  'ACCEPTED', 'CONFIRMED', 'COMPLETED',
  'REJECTED', 'CANCELLED', 'EXPIRED', 'DISPUTED'
);

CREATE TYPE notification_type AS ENUM (
  'NEW_MATCH', 'NEW_MESSAGE', 'REQUEST_RECEIVED', 'REQUEST_ACCEPTED',
  'REQUEST_REJECTED', 'REQUEST_CANCELLED', 'MEETING_REMINDER',
  'PROFILE_VERIFIED', 'ACCOUNT_WARNING', 'LIKE_RECEIVED'
);

CREATE TYPE plan_billing_period AS ENUM (
  'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'
);

CREATE TYPE subscription_status AS ENUM (
  'ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE', 'TRIALING'
);

CREATE TYPE report_target_type AS ENUM (
  'USER', 'PROFILE', 'MESSAGE', 'CONVERSATION'
);

CREATE TYPE report_status AS ENUM (
  'PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'
);

CREATE TYPE availability_status AS ENUM (
  'AVAILABLE', 'UNAVAILABLE', 'BUSY'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LOCATION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  state         TEXT,
  country       TEXT NOT NULL DEFAULT 'IN',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  max_profiles  INT DEFAULT 1000,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cities_name_state_idx ON public.cities(name, state);

CREATE TABLE IF NOT EXISTS public.areas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id     UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_area_in_city UNIQUE(city_id, name)
);

CREATE INDEX IF NOT EXISTS areas_city_idx ON public.areas(city_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid    TEXT NOT NULL UNIQUE,
  email           TEXT UNIQUE,
  phone           TEXT,
  role            user_role NOT NULL DEFAULT 'CUSTOMER',
  status          user_status NOT NULL DEFAULT 'PENDING',
  unique_id       TEXT UNIQUE,             -- e.g. #LF-1001
  plan_id         UUID,                    -- FK added after plans table
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_firebase_uid_idx ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users(status);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);

-- Auto-generate unique_id (e.g. #LF-1001) on insert
CREATE SEQUENCE IF NOT EXISTS littlefun_user_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_user_unique_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_id IS NULL THEN
    NEW.unique_id := '#LF-' || nextval('littlefun_user_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_unique_id ON public.users;
CREATE TRIGGER trg_user_unique_id
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.generate_user_unique_id();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  display_name          TEXT NOT NULL,
  date_of_birth         DATE,
  age                   INT,
  gender                TEXT,
  bio                   TEXT,
  job_title             TEXT,
  city_id               UUID REFERENCES public.cities(id),
  area_id               UUID REFERENCES public.areas(id),
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  geo_point             GEOGRAPHY(POINT, 4326),
  profile_type          profile_type NOT NULL DEFAULT 'REAL_PERSON',
  verification_status   verification_status NOT NULL DEFAULT 'UNVERIFIED',
  discovery_status      discovery_status NOT NULL DEFAULT 'HIDDEN',
  is_featured           BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completion    INT NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
  interests             TEXT[] DEFAULT '{}',
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
  is_online             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-compute age and PostGIS geo_point on insert/update
CREATE OR REPLACE FUNCTION public.sync_profile_generated_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := EXTRACT(YEAR FROM AGE(NEW.date_of_birth))::INT;
  ELSE
    NEW.age := NULL;
  END IF;

  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::GEOGRAPHY;
  ELSE
    NEW.geo_point := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_generated_fields ON public.profiles;
CREATE TRIGGER trg_profiles_generated_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_generated_fields();

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_city_id_idx ON public.profiles(city_id);
CREATE INDEX IF NOT EXISTS profiles_area_id_idx ON public.profiles(area_id);
CREATE INDEX IF NOT EXISTS profiles_discovery_status_idx ON public.profiles(discovery_status);
CREATE INDEX IF NOT EXISTS profiles_verification_status_idx ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS profiles_last_active_idx ON public.profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS profiles_geo_idx ON public.profiles USING GIST(geo_point);
CREATE INDEX IF NOT EXISTS profiles_type_idx ON public.profiles(profile_type);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILE PHOTOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,   -- Supabase Storage path: profile-images/{userId}/{imageId}
  url           TEXT NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT NOT NULL DEFAULT 0,
  moderated     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS photos_profile_id_idx ON public.profile_photos(profile_id);

-- Ensure only one primary photo per profile
CREATE UNIQUE INDEX IF NOT EXISTS photos_one_primary_idx
  ON public.profile_photos(profile_id) WHERE is_primary = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILE VERIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type   verification_type NOT NULL,
  status              verification_status NOT NULL DEFAULT 'PENDING',
  document_path       TEXT,   -- Supabase Storage: verification-documents/{userId}/{docId}
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES public.users(id),
  rejection_reason    TEXT,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS verif_profile_id_idx ON public.profile_verifications(profile_id);
CREATE INDEX IF NOT EXISTS verif_status_idx ON public.profile_verifications(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER PREFERENCES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  gender_preference     TEXT,
  age_min               INT DEFAULT 18,
  age_max               INT DEFAULT 60,
  max_distance_km       INT DEFAULT 50,
  preferred_city_id     UUID REFERENCES public.cities(id),
  preferred_area_ids    UUID[] DEFAULT '{}',
  requirement_types     requirement_type[] DEFAULT '{}',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_prefs_updated_at ON public.user_preferences;
CREATE TRIGGER trg_prefs_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- AVAILABILITY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availability (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week     TEXT,           -- 'Monday', 'Tuesday', etc. (NULL if specific_date set)
  specific_date   DATE,           -- Overrides day_of_week for that date
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  status          availability_status NOT NULL DEFAULT 'AVAILABLE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT avail_check_time CHECK (end_time > start_time),
  CONSTRAINT avail_check_day_or_date CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS avail_user_id_idx ON public.availability(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REQUIREMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requirements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  requirement_type  requirement_type NOT NULL DEFAULT 'OTHER',
  city_id           UUID REFERENCES public.cities(id),
  area_id           UUID REFERENCES public.areas(id),
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  requested_date    DATE,
  start_time        TIME,
  end_time          TIME,
  status            requirement_status NOT NULL DEFAULT 'DRAFT',
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS req_user_id_idx ON public.requirements(user_id);
CREATE INDEX IF NOT EXISTS req_status_idx ON public.requirements(status);
CREATE INDEX IF NOT EXISTS req_date_idx ON public.requirements(requested_date);
CREATE INDEX IF NOT EXISTS req_city_id_idx ON public.requirements(city_id);

DROP TRIGGER IF EXISTS trg_req_updated_at ON public.requirements;
CREATE TRIGGER trg_req_updated_at
  BEFORE UPDATE ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- LIKES & PASSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT likes_no_self_like CHECK (from_user_id != to_user_id),
  CONSTRAINT unique_like UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS likes_from_idx ON public.likes(from_user_id);
CREATE INDEX IF NOT EXISTS likes_to_idx ON public.likes(to_user_id);

CREATE TABLE IF NOT EXISTS public.passes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT passes_no_self CHECK (from_user_id != to_user_id),
  CONSTRAINT unique_pass UNIQUE(from_user_id, to_user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status      match_status NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_no_self CHECK (user_a_id != user_b_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS matches_unique_pair_idx 
ON public.matches (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

CREATE INDEX IF NOT EXISTS matches_a_idx ON public.matches(user_a_id);
CREATE INDEX IF NOT EXISTS matches_b_idx ON public.matches(user_b_id);
CREATE INDEX IF NOT EXISTS matches_status_idx ON public.matches(status);

-- Trigger: auto-create match when mutual like detected
CREATE OR REPLACE FUNCTION public.check_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
  v_a UUID;
  v_b UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.likes
    WHERE from_user_id = NEW.to_user_id
      AND to_user_id = NEW.from_user_id
  ) THEN
    v_a := LEAST(NEW.from_user_id, NEW.to_user_id);
    v_b := GREATEST(NEW.from_user_id, NEW.to_user_id);
    INSERT INTO public.matches (user_a_id, user_b_id)
    VALUES (v_a, v_b)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mutual_like ON public.likes;
CREATE TRIGGER trg_mutual_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.check_mutual_like();

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS & MESSAGES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_conv_updated_at ON public.conversations;
CREATE TRIGGER trg_conv_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.conversation_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted            BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT unique_member UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conv_members_conv_idx ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS conv_members_user_idx ON public.conversation_members(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_type     message_type NOT NULL DEFAULT 'TEXT',
  content          TEXT,
  attachment_url   TEXT,
  attachment_path  TEXT,   -- Supabase Storage path
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at        TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ,   -- Soft delete
  CONSTRAINT messages_has_content CHECK (content IS NOT NULL OR attachment_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender_id);

CREATE TABLE IF NOT EXISTS public.message_reads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_read UNIQUE(message_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MEETING REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_profile_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id            UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  requirement_id      UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
  status              request_status NOT NULL DEFAULT 'DRAFT',
  message             TEXT NOT NULL,
  meeting_type        requirement_type NOT NULL DEFAULT 'COFFEE',
  proposed_date_time  TIMESTAMPTZ,
  proposed_location   TEXT,
  admin_note          TEXT,
  assigned_admin_id   UUID REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_notified     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS mr_from_user_idx ON public.meeting_requests(from_user_id);
CREATE INDEX IF NOT EXISTS mr_to_profile_idx ON public.meeting_requests(to_profile_id);
CREATE INDEX IF NOT EXISTS mr_status_idx ON public.meeting_requests(status);
CREATE INDEX IF NOT EXISTS mr_created_idx ON public.meeting_requests(created_at DESC);

DROP TRIGGER IF EXISTS trg_mr_updated_at ON public.meeting_requests;
CREATE TRIGGER trg_mr_updated_at
  BEFORE UPDATE ON public.meeting_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.meeting_request_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  old_status    request_status,
  new_status    request_status,
  performed_by  UUID REFERENCES public.users(id),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mr_events_req_idx ON public.meeting_request_events(request_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_user_read_idx ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS notif_created_idx ON public.notifications(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- FCM DEVICE TOKENS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT,   -- 'web', 'ios', 'android'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_device_token UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON public.device_tokens(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PLANS & SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL UNIQUE,   -- FREE, BASIC, PRO, PREMIUM
  display_name            TEXT NOT NULL,
  price                   NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_period          plan_billing_period NOT NULL DEFAULT 'MONTHLY',
  max_discovery_profiles  INT NOT NULL DEFAULT 10,
  max_requests            INT NOT NULL DEFAULT 1,
  max_likes_per_day       INT NOT NULL DEFAULT 10,
  chat_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  advanced_filters        BOOLEAN NOT NULL DEFAULT FALSE,
  priority_matching       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order              INT DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans
INSERT INTO public.plans (name, display_name, price, billing_period, max_discovery_profiles, max_requests, max_likes_per_day, chat_enabled, advanced_filters, priority_matching, sort_order)
VALUES
  ('FREE',    'Free',    0,    'MONTHLY', 10,  1,  10,  FALSE, FALSE, FALSE, 0),
  ('BASIC',   'Basic',   299,  'MONTHLY', 30,  3,  25,  TRUE,  FALSE, FALSE, 1),
  ('PRO',     'Pro',     799,  'MONTHLY', 100, 10, 100, TRUE,  TRUE,  FALSE, 2),
  ('PREMIUM', 'Premium', 1499, 'MONTHLY', 999, 30, 999, TRUE,  TRUE,  TRUE,  3)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id     UUID NOT NULL REFERENCES public.plans(id),
  status      subscription_status NOT NULL DEFAULT 'ACTIVE',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subs_user_idx ON public.subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS subs_active_user_idx ON public.subscriptions(user_id) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  plan_id       UUID REFERENCES public.plans(id),
  amount        NUMERIC(10,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'INR',
  status        TEXT NOT NULL DEFAULT 'PENDING',
  provider      TEXT,
  provider_ref  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from users to plans (deferred since plans created after users)
ALTER TABLE public.users ADD CONSTRAINT fk_users_plan
  FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- SAFETY — REPORTS & BLOCKS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id  UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_type     report_target_type NOT NULL,
  target_id       UUID NOT NULL,
  reason          TEXT NOT NULL,
  description     TEXT,
  status          report_status NOT NULL DEFAULT 'PENDING',
  reviewed_by     UUID REFERENCES public.users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_target_user_idx ON public.reports(target_user_id);

CREATE TABLE IF NOT EXISTS public.blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocks_no_self CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON public.blocks(blocked_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN & AUDIT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID NOT NULL REFERENCES public.users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_actions_actor_idx ON public.admin_actions(actor_user_id);
CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON public.admin_actions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES public.users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  ip_hash         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- APP CONFIG (admin-editable key-value store)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES public.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default matching weights (spec §14)
INSERT INTO public.app_config (key, value, description)
VALUES
  ('matching_weights', '{
    "location": 0.25,
    "availability": 0.20,
    "requirement": 0.20,
    "preferences": 0.15,
    "completeness": 0.10,
    "recentActivity": 0.10
  }', 'Discovery ranking weights — must sum to 1.0'),
  ('discovery_min_completion_pct', '50', 'Minimum profile completion % to appear in discovery'),
  ('max_discovery_per_page', '25', 'Max profiles returned per discovery request'),
  ('discovery_enabled', 'true', 'Global discovery on/off switch'),
  ('registration_open', 'false', 'Allow self-registration (false = admin-only)')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME — Enable publications for live features
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- ── Helper: get current user's internal id from Firebase UID
-- The backend uses service_role (bypasses RLS).
-- These policies apply to direct Supabase client calls from frontend (anon/user JWTs).

-- Cities & Areas: public read
DROP POLICY IF EXISTS "cities_public_read" ON public.cities;
CREATE POLICY "cities_public_read" ON public.cities FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "areas_public_read" ON public.areas;
CREATE POLICY "areas_public_read" ON public.areas FOR SELECT USING (is_active = true);

-- Plans: public read
DROP POLICY IF EXISTS "plans_public_read" ON public.plans;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT USING (is_active = true);

-- Users: can read own row only
DROP POLICY IF EXISTS "users_read_own" ON public.users;
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid()::TEXT = firebase_uid);

-- Profiles: discoverable profiles visible, own always visible
DROP POLICY IF EXISTS "profiles_read_discoverable" ON public.profiles;
CREATE POLICY "profiles_read_discoverable" ON public.profiles
  FOR SELECT USING (
    discovery_status = 'VISIBLE' OR
    user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::TEXT LIMIT 1)
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::TEXT LIMIT 1)
  );

-- Photos: primary/moderated photos of discoverable profiles visible
DROP POLICY IF EXISTS "photos_read_public" ON public.profile_photos;
CREATE POLICY "photos_read_public" ON public.profile_photos
  FOR SELECT USING (moderated = true);

-- Messages: only conversation members can read
DROP POLICY IF EXISTS "messages_read_member" ON public.messages;
CREATE POLICY "messages_read_member" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::TEXT LIMIT 1)
    )
  );

-- Notifications: own only
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::TEXT LIMIT 1)
  );

-- Meeting requests: own only
DROP POLICY IF EXISTS "mr_read_own" ON public.meeting_requests;
CREATE POLICY "mr_read_own" ON public.meeting_requests
  FOR SELECT USING (
    from_user_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::TEXT LIMIT 1)
  );

-- Blocks: own only
DROP POLICY IF EXISTS "blocks_read_own" ON public.blocks;
CREATE POLICY "blocks_read_own" ON public.blocks
  FOR SELECT USING (
    blocker_id = (SELECT id FROM public.users WHERE firebase_uid = auth.uid()::TEXT LIMIT 1)
  );

-- NOTE: All write operations go through the backend API (service_role),
-- not direct client writes. RLS policies above are for read safety only.

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, anon, authenticated;
