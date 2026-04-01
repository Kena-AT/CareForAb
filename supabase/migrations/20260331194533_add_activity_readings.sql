-- Create the activity_readings table for tracking daily steps
CREATE TABLE IF NOT EXISTS public.activity_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    steps INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one entry per user per day for easy upserting
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.activity_readings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own activity data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own activity' AND tablename = 'activity_readings') THEN
        CREATE POLICY "Users can view own activity" ON public.activity_readings FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can insert their own activity data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own activity' AND tablename = 'activity_readings') THEN
        CREATE POLICY "Users can insert own activity" ON public.activity_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Policy: Users can update their own activity data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own activity' AND tablename = 'activity_readings') THEN
        CREATE POLICY "Users can update own activity" ON public.activity_readings FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_activity_readings_updated_at ON public.activity_readings;
CREATE TRIGGER update_activity_readings_updated_at
    BEFORE UPDATE ON public.activity_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
