export type MedicationFormType = 'tablet' | 'capsule' | 'injection' | 'liquid' | 'patch' | 'inhaler' | 'other';

export const FORM_TYPE_META: Record<MedicationFormType, { label: string; emoji: string; unit: string; dosagePlaceholder: string }> = {
  tablet:    { label: 'Tablet',    emoji: '💊', unit: 'tablets',  dosagePlaceholder: 'e.g. 500mg' },
  capsule:   { label: 'Capsule',   emoji: '💊', unit: 'capsules', dosagePlaceholder: 'e.g. 250mg' },
  injection: { label: 'Injection', emoji: '💉', unit: 'vials',    dosagePlaceholder: 'e.g. 5mL / 1 vial' },
  liquid:    { label: 'Liquid',    emoji: '🧴', unit: 'mL',       dosagePlaceholder: 'e.g. 10mL' },
  patch:     { label: 'Patch',     emoji: '🩹', unit: 'patches',  dosagePlaceholder: 'e.g. 5mg/24hr' },
  inhaler:   { label: 'Inhaler',   emoji: '💨', unit: 'doses',    dosagePlaceholder: 'e.g. 100mcg/dose' },
  other:     { label: 'Other',     emoji: '🔬', unit: 'units',    dosagePlaceholder: 'e.g. 1 unit' },
};

// Database types matching Supabase schema
export interface Medication {
  id: string;
  user_id?: string;
  name: string;
  dosage: string;
  form_type?: MedicationFormType | null;
  notes?: string | null;
  doctor?: string | null;
  prescription_number?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Inventory is tracked separately at medication level
  inventory_count?: number | null;
  refill_threshold?: number | null;
}

export interface MedicationSchedule {
  id: string;
  user_id?: string;
  medication_id: string;
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'as_needed';
  treatment_type: 'chronic' | 'acute' | 'supplement';
  times: string[];
  start_date: string;
  end_date?: string | null;
  is_indefinite: boolean;
  reminder_minutes_before?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MedicationLog {
  id: string;
  user_id?: string;
  medication_id: string;
  scheduled_time: string;
  taken_at?: string | null;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  date: string;
  notes?: string | null;
  created_at?: string;
}

// Computed schedule for display - combines medication + schedule + log status
export interface TodayScheduleItem {
  log_id?: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  form_type?: MedicationFormType | null;
  doctor?: string | null;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string | null;
  date: string;
  inventory_count?: number | null;
  refill_threshold?: number | null;
}

export interface BloodSugarReading {
  id: string;
  user_id?: string;
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'fasting' | 'other';
  notes?: string | null;
  recorded_at: string;
}

export interface BloodPressureReading {
  id: string;
  user_id?: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string | null;
  recorded_at: string;
}

export interface OxygenReading {
  id: string;
  user_id?: string;
  value: number;
  notes?: string | null;
  recorded_at: string;
}

export interface ActivityReading {
  id: string;
  user_id?: string;
  steps: number;
  date: string;
  recorded_at?: string;
}

export type GlucoseStatus = 'low' | 'normal' | 'high';
export type BPStatus = 'low' | 'normal' | 'elevated' | 'high';

export const getGlucoseStatus = (value: number, unit: 'mg/dL' | 'mmol/L'): GlucoseStatus => {
  const mgdL = unit === 'mmol/L' ? value * 18 : value;
  if (mgdL < 70) return 'low';
  if (mgdL <= 140) return 'normal';
  return 'high';
};

export const getBPStatus = (systolic: number, diastolic: number): BPStatus => {
  if (systolic < 90 || diastolic < 60) return 'low';
  if (systolic < 120 && diastolic < 80) return 'normal';
  if (systolic < 140 || diastolic < 90) return 'elevated';
  return 'high';
};
