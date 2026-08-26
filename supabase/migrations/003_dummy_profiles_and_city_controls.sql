-- Supabase Migration: 003_dummy_profiles_and_city_controls.sql

-- 1. Dummy Companion Profiles Table
CREATE TABLE IF NOT EXISTS public.dummy_companion_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL DEFAULT 22,
  gender VARCHAR(50) DEFAULT 'FEMALE',
  avatar TEXT,
  photos TEXT[] DEFAULT '{}',
  city VARCHAR(255) NOT NULL DEFAULT 'Delhi',
  area VARCHAR(255) NOT NULL DEFAULT 'Connaught Place',
  distance_km NUMERIC(5,2) DEFAULT 25.0,
  hourly_rate NUMERIC(10,2) DEFAULT 2500.00,
  bio TEXT,
  occupation VARCHAR(255) DEFAULT 'Software Engineer',
  interests TEXT[] DEFAULT '{"Coffee", "Travel", "Dining"}',
  is_active BOOLEAN DEFAULT TRUE,
  show_in_discovery BOOLEAN DEFAULT TRUE,
  visible_in_areas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. City & Area Configs Table
CREATE TABLE IF NOT EXISTS public.city_area_configs (
  city VARCHAR(255) PRIMARY KEY,
  is_active BOOLEAN DEFAULT TRUE,
  max_profiles_per_city INTEGER DEFAULT 15,
  disabled_areas TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by city and active status
CREATE INDEX IF NOT EXISTS idx_dummy_profiles_city_active ON public.dummy_companion_profiles(city, is_active);
