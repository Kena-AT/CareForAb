-- Sprint 3: Performance Optimization Migration
-- Focus: Sub-second fetches and efficient index usage

-- 1. Standardize user_id indexes for all health tables
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON public.medications(user_id);
CREATE INDEX IF NOT EXISTS idx_blood_sugar_user_id ON public.blood_sugar_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_blood_pressure_user_id ON public.blood_pressure_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_oxygen_readings_user_id ON public.oxygen_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_readings_user_id ON public.activity_readings(user_id);

-- 2. Foreign Key Indexes for Medications/Schedules/Logs
CREATE INDEX IF NOT EXISTS idx_medication_schedules_medication_id ON public.medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_id ON public.medication_logs(medication_id);

-- 3. Composite Indexes for Trend Queries (descending recorded_at)
CREATE INDEX IF NOT EXISTS idx_oxygen_user_recorded_at ON public.oxygen_readings(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user_date ON public.activity_readings(user_id, date DESC);

-- 4. Covered indexes for common selects (Example for adherence)
-- Helps with select(id, medication_id, status, date)
CREATE INDEX IF NOT EXISTS idx_medication_logs_adherence_lookup 
ON public.medication_logs(user_id, date) 
INCLUDE (medication_id, status, scheduled_time);
