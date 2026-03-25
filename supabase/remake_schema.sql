-- ==========================================
-- CAREFORAB MASTER SCHEMA (UNIFIED)
-- Run this in Supabase SQL Editor to reset/sync
-- ==========================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  blood_type TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'English (United States)',
  notification_preferences JSONB DEFAULT '{"email": true, "medication": true, "vitals": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MEDICATIONS
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  doctor TEXT,
  prescription_number TEXT,
  inventory_count INTEGER DEFAULT NULL,
  refill_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MEDICATION LOGS
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
  taken_at TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BLOOD SUGAR READINGS
CREATE TABLE IF NOT EXISTS public.blood_sugar_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'mg/dL' CHECK (unit IN ('mg/dL', 'mmol/L')),
  meal_type TEXT NOT NULL DEFAULT 'other',
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. BLOOD PRESSURE READINGS
CREATE TABLE IF NOT EXISTS public.blood_pressure_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  systolic INTEGER NOT NULL,
  diastolic INTEGER NOT NULL,
  pulse INTEGER,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. OXYGEN READINGS
CREATE TABLE IF NOT EXISTS public.oxygen_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    value INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. ACTIVITY READINGS
CREATE TABLE IF NOT EXISTS public.activity_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    steps INTEGER DEFAULT 0 NOT NULL,
    UNIQUE(user_id, date)
);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==========================================
-- SECURITY (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_sugar_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oxygen_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Unified policy generation (simplified)
CREATE POLICY "Users can manage own profiles" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own medications" ON public.medications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own medication_logs" ON public.medication_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own blood_sugar" ON public.blood_sugar_readings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own blood_pressure" ON public.blood_pressure_readings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own oxygen" ON public.oxygen_readings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own activity" ON public.activity_readings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- Triggers & Helpers
-- ==========================================

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at timestamp helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VIEWS
-- ==========================================

-- Today's Schedule View: Combines medications with their logs for today
CREATE OR REPLACE VIEW public.today_schedule AS
SELECT 
    ml.id as log_id,
    ml.user_id,
    ml.medication_id,
    ml.scheduled_time,
    ml.status,
    ml.taken_at,
    ml.date,
    m.name as medication_name,
    m.dosage,
    m.frequency,
    m.doctor,
    m.inventory_count,
    m.refill_threshold,
    m.notes as medication_notes
FROM public.medication_logs ml
JOIN public.medications m ON ml.medication_id = m.id
WHERE ml.date = CURRENT_DATE
ORDER BY ml.scheduled_time;
