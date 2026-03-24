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

-- Add to audit logging if exists
SELECT audit.enable_tracking('public.oxygen_readings');
SELECT audit.enable_tracking('public.activity_readings');
