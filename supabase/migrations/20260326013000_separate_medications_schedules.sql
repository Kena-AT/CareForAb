-- ==========================================
-- MAJOR SCHEMA REFACTOR: Separate Medications from Schedules
-- This migration separates medications (templates) from schedules (timing rules)
-- ==========================================

-- ==========================================
-- PART 1: Ensure profiles table has language column
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'language'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN language TEXT DEFAULT 'English (United States)';
    END IF;
END $$;

-- ==========================================
-- PART 2: Create medication_schedules table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'twice_daily', 'weekly', 'as_needed')),
    treatment_type TEXT DEFAULT 'chronic' CHECK (treatment_type IN ('chronic', 'acute', 'supplement')),
    times TEXT[] NOT NULL DEFAULT '{}',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_indefinite BOOLEAN NOT NULL DEFAULT false,
    reminder_minutes_before INTEGER DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT indefinite_end_date_check CHECK (
        (is_indefinite = true AND end_date IS NULL)
        OR
        (is_indefinite = false)
    )
);

-- Enable RLS on medication_schedules
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for medication_schedules
CREATE POLICY "Users can manage own medication_schedules" 
    ON public.medication_schedules 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Create index for efficient schedule queries
CREATE INDEX IF NOT EXISTS idx_medication_schedules_user_active 
    ON public.medication_schedules(user_id, is_active, start_date, end_date);

-- Create index for medication_id lookups
CREATE INDEX IF NOT EXISTS idx_medication_schedules_medication_id 
    ON public.medication_schedules(medication_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_schedules_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_medication_schedules_updated_at 
    BEFORE UPDATE ON public.medication_schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_schedules_updated_at_column();

-- ==========================================
-- PART 3: Migrate existing medications to new structure
-- ==========================================

-- For existing medications, create a schedule entry based on their current frequency/times
INSERT INTO public.medication_schedules (
    user_id,
    medication_id,
    frequency,
    times,
    start_date,
    end_date,
    is_active
)
SELECT 
    user_id,
    id as medication_id,
    frequency,
    times,
    CURRENT_DATE as start_date,
    NULL as end_date,
    is_active
FROM public.medications
WHERE is_active = true
AND NOT EXISTS (
    SELECT 1 FROM public.medication_schedules ms 
    WHERE ms.medication_id = medications.id
);

-- ==========================================
-- PART 4: Create function to generate today's schedule
-- ==========================================
CREATE OR REPLACE FUNCTION public.generate_today_schedule(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    log_id UUID,
    medication_id UUID,
    medication_name TEXT,
    dosage TEXT,
    doctor TEXT,
    scheduled_time TEXT,
    status TEXT,
    taken_at TIMESTAMPTZ,
    date DATE,
    inventory_count INTEGER,
    refill_threshold INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ml.id, gen_random_uuid()) as log_id,
        m.id as medication_id,
        m.name as medication_name,
        m.dosage,
        m.doctor,
        unnest(ms.times) as scheduled_time,
        COALESCE(ml.status, 'pending') as status,
        ml.taken_at,
        p_date as date,
        m.inventory_count,
        m.refill_threshold
    FROM public.medications m
    JOIN public.medication_schedules ms ON m.id = ms.medication_id
    LEFT JOIN public.medication_logs ml ON m.id = ml.medication_id 
        AND ml.date = p_date 
        AND ml.scheduled_time = unnest(ms.times)
    WHERE m.user_id = p_user_id
        AND m.is_active = true
        AND ms.is_active = true
        AND ms.start_date <= p_date
        AND (ms.end_date IS NULL OR ms.end_date >= p_date)
    ORDER BY unnest(ms.times);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 5: Create today's schedule view (computed, not stored)
-- ==========================================
CREATE OR REPLACE VIEW public.today_schedule AS
SELECT 
    m.id as medication_id,
    m.user_id,
    m.name as medication_name,
    m.dosage,
    m.doctor,
    ms.frequency,
    ms.treatment_type,
    unnest(ms.times) as scheduled_time,
    ms.start_date,
    ms.end_date,
    ms.is_indefinite,
    m.inventory_count,
    m.refill_threshold,
    CURRENT_DATE as date,
    ms.id as schedule_id
FROM public.medications m
JOIN public.medication_schedules ms ON m.id = ms.medication_id
WHERE m.is_active = true
    AND ms.is_active = true
    AND ms.start_date <= CURRENT_DATE
    AND (ms.is_indefinite = true OR ms.end_date >= CURRENT_DATE)
ORDER BY m.user_id, unnest(ms.times);

-- ==========================================
-- PART 6: Create function to get or create today's logs
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_or_create_today_logs(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS SETOF public.medication_logs AS $$
DECLARE
    v_schedule RECORD;
    v_log_id UUID;
    v_existing_log public.medication_logs;
BEGIN
    -- Iterate through all scheduled doses for today
    FOR v_schedule IN
        SELECT 
            m.id as medication_id,
            unnest(ms.times) as scheduled_time
        FROM public.medications m
        JOIN public.medication_schedules ms ON m.id = ms.medication_id
        WHERE m.user_id = p_user_id
            AND m.is_active = true
            AND ms.is_active = true
            AND ms.start_date <= p_date
            AND (ms.is_indefinite = true OR ms.end_date >= p_date)
    LOOP
        -- Check if log already exists
        SELECT * INTO v_existing_log
        FROM public.medication_logs
        WHERE user_id = p_user_id
            AND medication_id = v_schedule.medication_id
            AND date = p_date
            AND scheduled_time = v_schedule.scheduled_time;
        
        IF FOUND THEN
            RETURN NEXT v_existing_log;
        ELSE
            -- Create new log
            INSERT INTO public.medication_logs (
                user_id,
                medication_id,
                scheduled_time,
                status,
                date
            ) VALUES (
                p_user_id,
                v_schedule.medication_id,
                v_schedule.scheduled_time,
                'pending',
                p_date
            )
            RETURNING * INTO v_existing_log;
            
            RETURN NEXT v_existing_log;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 7: Update medication_logs to handle schedules properly
-- ==========================================

-- Add unique constraint to prevent duplicate logs
ALTER TABLE public.medication_logs 
    DROP CONSTRAINT IF EXISTS unique_medication_log;
    
ALTER TABLE public.medication_logs 
    ADD CONSTRAINT unique_medication_log 
    UNIQUE (medication_id, scheduled_time, date);

-- Ensure medication_logs has proper indexes
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date 
    ON public.medication_logs(user_id, date);

CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id 
    ON public.medication_logs(medication_id);

-- ==========================================
-- PART 8: Add timezone to profiles
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
    END IF;
END $$;

-- ==========================================
-- PART 9: Create inventory decrement trigger
-- ==========================================
CREATE OR REPLACE FUNCTION decrement_inventory_on_taken()
RETURNS TRIGGER AS $$
BEGIN
    -- Only decrement if status changed FROM pending TO taken
    IF OLD.status = 'pending' AND NEW.status = 'taken' THEN
        UPDATE public.medications 
        SET inventory_count = GREATEST(0, inventory_count - 1)
        WHERE id = NEW.medication_id 
        AND inventory_count IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_inventory ON public.medication_logs;

CREATE TRIGGER trg_decrement_inventory
    AFTER UPDATE ON public.medication_logs
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION decrement_inventory_on_taken();

-- ==========================================
-- PART 10: Create medication_reminders table for tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS public.medication_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.medication_logs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    scheduled_time TEXT NOT NULL,
    reminder_date DATE NOT NULL,
    type TEXT NOT NULL DEFAULT 'email' CHECK (type IN ('email', 'push', 'sms')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own reminders" 
    ON public.medication_reminders 
    FOR ALL 
    USING (auth.uid() = user_id);

-- Unique constraint to prevent duplicate reminders
ALTER TABLE public.medication_reminders 
    DROP CONSTRAINT IF EXISTS unique_reminder;
    
ALTER TABLE public.medication_reminders 
    ADD CONSTRAINT unique_reminder 
    UNIQUE (log_id, type, reminder_date);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_medication_reminders_pending 
    ON public.medication_reminders(user_id, status, reminder_date) 
    WHERE status IN ('pending', 'failed');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_reminders_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_medication_reminders_updated_at ON public.medication_reminders;

CREATE TRIGGER update_medication_reminders_updated_at 
    BEFORE UPDATE ON public.medication_reminders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_reminders_updated_at_column();

-- ==========================================
-- PART 11: Verify all tables have created_at/updated_at
-- ==========================================

-- medications table already has both
-- medication_schedules table already has both
-- medication_logs already has created_at

-- Add updated_at to medication_logs if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medication_logs' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.medication_logs ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_medication_logs_updated_at ON public.medication_logs;

CREATE TRIGGER update_medication_logs_updated_at 
    BEFORE UPDATE ON public.medication_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PART 12: Create function to auto-deactivate expired schedules
-- ==========================================
CREATE OR REPLACE FUNCTION public.deactivate_expired_schedules()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.medication_schedules 
    SET is_active = false
    WHERE is_active = true 
    AND end_date IS NOT NULL 
    AND end_date < CURRENT_DATE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 13: Create optimized get_today_schedule function (RPC)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_today_schedule(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    log_id UUID,
    medication_id UUID,
    medication_name TEXT,
    dosage TEXT,
    doctor TEXT,
    scheduled_time TEXT,
    status TEXT,
    taken_at TIMESTAMPTZ,
    date DATE,
    inventory_count INTEGER,
    refill_threshold INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ml.id as log_id,
        m.id as medication_id,
        m.name as medication_name,
        m.dosage,
        m.doctor,
        ml.scheduled_time,
        ml.status,
        ml.taken_at,
        ml.date,
        m.inventory_count,
        m.refill_threshold
    FROM public.medication_logs ml
    JOIN public.medications m ON ml.medication_id = m.id
    WHERE ml.user_id = p_user_id
        AND ml.date = p_date
    ORDER BY ml.scheduled_time;
END;
$$ LANGUAGE plpgsql;

