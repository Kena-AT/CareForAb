-- Create audit_logs table for tracking sensitive changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (only admins or service role should see this, but for now we limit to self-access if user_id matches)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Generic function to log changes
CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data)
    VALUES (v_user_id, TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD)::jsonb);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, table_name, record_id, action, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, table_name, record_id, action, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to health data tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_blood_sugar') THEN
    CREATE TRIGGER tr_audit_blood_sugar AFTER INSERT OR UPDATE OR DELETE ON public.blood_sugar_readings
    FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_blood_pressure') THEN
    CREATE TRIGGER tr_audit_blood_pressure AFTER INSERT OR UPDATE OR DELETE ON public.blood_pressure_readings
    FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_medications') THEN
    CREATE TRIGGER tr_audit_medications AFTER INSERT OR UPDATE OR DELETE ON public.medications
    FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
  END IF;
END $$;
