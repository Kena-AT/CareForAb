-- Self-contained migration: creates schema and guards external dependencies
CREATE SCHEMA IF NOT EXISTS audit;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create oxygen_readings table
CREATE TABLE IF NOT EXISTS public.oxygen_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    value INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create activity_readings table
CREATE TABLE IF NOT EXISTS public.activity_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    steps INTEGER DEFAULT 0 NOT NULL,
    UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.oxygen_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_readings ENABLE ROW LEVEL SECURITY;

-- Policies for oxygen_readings
CREATE POLICY "Users can insert their own oxygen readings" 
ON public.oxygen_readings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own oxygen readings" 
ON public.oxygen_readings FOR SELECT USING (auth.uid() = user_id);

-- Policies for activity_readings
CREATE POLICY "Users can insert their own activity readings" 
ON public.activity_readings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity readings" 
ON public.activity_readings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity readings" 
ON public.activity_readings FOR UPDATE USING (auth.uid() = user_id);

-- Guarded audit tracking - only runs if audit.enable_tracking exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'enable_tracking'
  ) THEN
    PERFORM audit.enable_tracking('public.oxygen_readings');
    PERFORM audit.enable_tracking('public.activity_readings');
  END IF;
END $$;
