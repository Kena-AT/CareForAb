-- Add indexes to improve query performance for logs and readings

-- Medications lookup
CREATE INDEX IF NOT EXISTS idx_medications_user_id_active ON public.medications(user_id) WHERE is_active = true;

-- Medication logs lookup (frequently filtered by user and date)
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date ON public.medication_logs(user_id, date);

-- Blood sugar readings (ordered by recorded_at for trends)
CREATE INDEX IF NOT EXISTS idx_blood_sugar_user_recorded_at ON public.blood_sugar_readings(user_id, recorded_at DESC);

-- Blood pressure readings (ordered by recorded_at for trends)
CREATE INDEX IF NOT EXISTS idx_blood_pressure_user_recorded_at ON public.blood_pressure_readings(user_id, recorded_at DESC);
