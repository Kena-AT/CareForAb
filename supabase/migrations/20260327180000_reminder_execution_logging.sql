-- Reminder execution logging and idempotency protection
-- This table tracks all reminder attempts for debugging and prevents duplicate sends

CREATE TABLE IF NOT EXISTS reminder_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_log_id UUID NOT NULL REFERENCES medication_logs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'abandoned')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    email_provider_response TEXT,
    reminder_type TEXT NOT NULL DEFAULT 'medication',
    
    -- Idempotency protection: prevent duplicate sends for same log
    UNIQUE(medication_log_id, reminder_type)
);

-- Index for quick lookup by medication log
CREATE INDEX IF NOT EXISTS idx_reminder_executions_log_id 
ON reminder_executions(medication_log_id);

-- Index for debugging failed reminders
CREATE INDEX IF NOT EXISTS idx_reminder_executions_status_attempted 
ON reminder_executions(status, attempted_at) 
WHERE status IN ('failed', 'pending');

-- Index for user-specific debugging
CREATE INDEX IF NOT EXISTS idx_reminder_executions_user_attempted 
ON reminder_executions(user_id, attempted_at DESC);

-- RLS policies
ALTER TABLE reminder_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all reminder executions"
ON reminder_executions FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view own reminder executions"
ON reminder_executions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Function to prevent updating already sent reminders (idempotency)
CREATE OR REPLACE FUNCTION prevent_reminder_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'sent' AND NEW.status != 'sent' THEN
        RAISE EXCEPTION 'Cannot modify already sent reminder';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reminder_execution_update_protect
BEFORE UPDATE ON reminder_executions
FOR EACH ROW
EXECUTE FUNCTION prevent_reminder_update();
