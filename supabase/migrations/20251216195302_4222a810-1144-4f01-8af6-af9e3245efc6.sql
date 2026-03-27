-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create medications table with all columns needed for future migrations
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  doctor TEXT,
  prescription_number TEXT,
  inventory_count INTEGER,
  refill_threshold INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create medication_logs table to track if taken/missed
CREATE TABLE public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed', 'skipped')),
  taken_at TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create blood_sugar_readings table
CREATE TABLE public.blood_sugar_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'mg/dL' CHECK (unit IN ('mg/dL', 'mmol/L')),
  meal_context TEXT NOT NULL DEFAULT 'other' CHECK (meal_context IN ('fasting', 'before_meal', 'after_meal', 'bedtime', 'other')),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create blood_pressure_readings table
CREATE TABLE public.blood_pressure_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  systolic INTEGER NOT NULL,
  diastolic INTEGER NOT NULL,
  pulse INTEGER,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_sugar_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_pressure_readings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Medications policies
CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medications" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE USING (auth.uid() = user_id);

-- Medication logs policies
CREATE POLICY "Users can view own medication logs" ON public.medication_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medication logs" ON public.medication_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medication logs" ON public.medication_logs FOR UPDATE USING (auth.uid() = user_id);

-- Blood sugar readings policies
CREATE POLICY "Users can view own blood sugar readings" ON public.blood_sugar_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own blood sugar readings" ON public.blood_sugar_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own blood sugar readings" ON public.blood_sugar_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own blood sugar readings" ON public.blood_sugar_readings FOR DELETE USING (auth.uid() = user_id);

-- Blood pressure readings policies
CREATE POLICY "Users can view own blood pressure readings" ON public.blood_pressure_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own blood pressure readings" ON public.blood_pressure_readings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own blood pressure readings" ON public.blood_pressure_readings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own blood pressure readings" ON public.blood_pressure_readings FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();