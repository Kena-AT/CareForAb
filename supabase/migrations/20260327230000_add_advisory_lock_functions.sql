-- Create advisory lock functions for distributed cron locking
CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(key BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN pg_try_advisory_lock(key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(key BIGINT)
RETURNS VOID AS $$
BEGIN
    PERFORM pg_advisory_unlock(key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
