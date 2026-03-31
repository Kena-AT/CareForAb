import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isNetworkError } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Medication,
  MedicationSchedule,
  MedicationLog,
  TodayScheduleItem,
  BloodSugarReading,
  BloodPressureReading,
  OxygenReading,
  ActivityReading
} from '@/types/health';

export const useHealthData = () => {
  const { user } = useAuth();
  
  // Core data states - separated medications, schedules, and logs
  const [medications, setMedications] = useState<Medication[]>([]);
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<TodayScheduleItem[]>([]);
  
  // Health readings
  const [bloodSugarReadings, setBloodSugarReadings] = useState<BloodSugarReading[]>([]);
  const [bloodPressureReadings, setBloodPressureReadings] = useState<BloodPressureReading[]>([]);
  const [oxygenReadings, setOxygenReadings] = useState<OxygenReading[]>([]);
  const [activityReadings, setActivityReadings] = useState<ActivityReading[]>([]);
  
  // User profile
  const [profile, setProfile] = useState<{ 
    full_name: string | null; 
    blood_type: string | null; 
    avatar_url: string | null;
    language?: string | null;
    timezone?: string | null;
  } | null>(null);
  
  const [isMedsLoading, setIsMedsLoading] = useState(true);
  const [isReadingsLoading, setIsReadingsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setIsMedsLoading(false);
      setIsReadingsLoading(false);
      setIsProfileLoading(false);
      return;
    }

    // Prevent duplicate parallel fetches for the same user
    if (fetchingRef.current === user.id) {
      console.log(`[useHealthData] Fetch already in progress for ${user.id}, skipping`);
      return;
    }
    
    fetchingRef.current = user.id;
    console.log(`[Performance] 🚀 Starting health data fetch sequence for user: ${user.id}`);
    const start = performance.now();

    try {
      // Use local date for "Today"
      const now = new Date();
      const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

      // --- PHASE 1: Critical Medication Data ---
      const phase1Start = performance.now();
      setIsMedsLoading(true);
      
      const [medsRes, schedulesRes, logsRes] = await Promise.all([
        supabase.from('medications').select('id,name,dosage,notes,doctor,inventory_count,refill_threshold,is_active,created_at').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
        (supabase.from('medication_schedules' as any) as any).select('id,medication_id,frequency,times,start_date,end_date,is_indefinite,is_active').eq('user_id', user.id).eq('is_active', true),
        supabase.from('medication_logs').select('id,medication_id,scheduled_time,status,taken_at,date').eq('user_id', user.id).eq('date', today),
      ]);

      if (medsRes.error) throw medsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (logsRes.error) throw logsRes.error;

      setMedications(medsRes.data as Medication[] || []);
      setSchedules((schedulesRes.data as unknown as MedicationSchedule[]) || []);
      setMedicationLogs(logsRes.data as MedicationLog[] || []);
      
      computeTodaySchedule(
        medsRes.data as Medication[] || [],
        schedulesRes.data as MedicationSchedule[] || [],
        logsRes.data as MedicationLog[] || [],
        today
      );
      
      console.log(`[Performance] 💊 Medication phase done in ${(performance.now() - phase1Start).toFixed(2)}ms`);

      // --- PHASE 2: Profile & Other Health Data ---
      const phase2Start = performance.now();
      setIsReadingsLoading(true);
      setIsProfileLoading(true);
      
      const [profileRes, sugarRes, bpRes, oxygenRes, activityRes] = await Promise.all([
        supabase.from('profiles').select('full_name, blood_type, avatar_url, language').eq('id', user.id).maybeSingle(),
        supabase.from('blood_sugar_readings').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(50),
        supabase.from('blood_pressure_readings').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(50),
        supabase.from('oxygen_readings' as any).select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(20),
        supabase.from('activity_readings' as any).select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (sugarRes.error) throw sugarRes.error;
      if (bpRes.error) throw bpRes.error;
      if (oxygenRes.error) throw oxygenRes.error;
      if (activityRes.error) throw activityRes.error;

      setProfile(profileRes.data as any);
      setIsProfileLoading(false);

      setBloodSugarReadings(sugarRes.data as BloodSugarReading[] || []);
      setBloodPressureReadings(bpRes.data as BloodPressureReading[] || []);
      setOxygenReadings(oxygenRes.data as unknown as OxygenReading[] || []);
      setActivityReadings(activityRes.data as unknown as ActivityReading[] || []);
      setIsReadingsLoading(false);

      console.log(`[Performance] 📊 Vital signs phase done in ${(performance.now() - phase2Start).toFixed(2)}ms`);
      console.log(`[Performance] ✅ Entire sequence complete in ${(performance.now() - start).toFixed(2)}ms`);
    } catch (error: any) {
      if (isNetworkError(error)) {
        console.warn('[useHealthData] Network error fetching health data. Keeping current state.');
        return;
      }
      console.error('Error fetching health data:', error?.message || 'Unknown error');
      toast.error(`Failed to load health data: ${error?.message || 'Unknown error'}`);
    } finally {
      fetchingRef.current = null;
      setIsMedsLoading(false);
      setIsReadingsLoading(false);
      setIsProfileLoading(false);
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial data fetch is now handled by pages explicitly
  // to avoid redundant global fetches on every page load

  // Compute today's schedule from medications, schedules, and logs
  const computeTodaySchedule = (
    meds: Medication[],
    schedules: MedicationSchedule[],
    logs: MedicationLog[],
    today: string
  ) => {
    const scheduleItems: TodayScheduleItem[] = [];

    // For each active schedule that applies to today
    schedules.forEach(schedule => {
      // Check if schedule is active today
      if (schedule.start_date > today) return; // hasn't started
      if (schedule.end_date && schedule.end_date < today) return; // has ended

      const medication = meds.find(m => m.id === schedule.medication_id);
      if (!medication || !medication.is_active) return;

      // For each time in the schedule
      schedule.times.forEach(time => {
        // Check if there's already a log for this dose
        const existingLog = logs.find(
          log => log.medication_id === schedule.medication_id && log.scheduled_time === time
        );

        scheduleItems.push({
          log_id: existingLog?.id,
          medication_id: medication.id,
          medication_name: medication.name,
          dosage: medication.dosage,
          doctor: medication.doctor,
          scheduled_time: time,
          status: (existingLog?.status as any) || 'pending',
          taken_at: existingLog?.taken_at || null,
          date: today,
          inventory_count: medication.inventory_count,
          refill_threshold: medication.refill_threshold,
        });
      });
    });

    // Sort by time
    scheduleItems.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
    setTodaySchedule(scheduleItems);
  };

  const markMedicationTaken = async (logId: string) => {
    try {
      const { data: logData, error } = await supabase
        .from('medication_logs')
        .update({ status: 'taken', taken_at: new Date().toISOString() })
        .eq('id', logId)
        .select('medication_id, status')
        .single();

      if (error) throw error;

      // Inventory is now decremented by database trigger when status changes from pending to taken
      // Just update local state to reflect the change
      setMedicationLogs(logs =>
        logs.map(log =>
          log.id === logId ? { ...log, status: 'taken' as const, taken_at: new Date().toISOString() } : log
        )
      );
      
      // Refresh medications to get updated inventory count from trigger
      const { data: updatedMed } = await supabase
        .from('medications')
        .select('id, inventory_count')
        .eq('id', logData.medication_id)
        .single();
        
      if (updatedMed) {
        setMedications(prev => 
          prev.map(m => m.id === updatedMed.id ? { ...m, inventory_count: updatedMed.inventory_count } : m)
        );
      }
      
      // Refresh today's schedule to reflect changes
      await fetchData();
      
      toast.success('Medication marked as taken!');
    } catch (error: any) {
      console.error('Error marking medication:', error);
      toast.error('Failed to update medication');
    }
  };

  const addMedication = async (
    medication: Omit<Medication, 'id' | 'created_at' | 'is_active' | 'user_id'>,
    schedule: Omit<MedicationSchedule, 'id' | 'created_at' | 'is_active' | 'medication_id' | 'user_id'>
  ) => {
    if (!user) return;

    try {
      console.log('Adding medication for user:', user.id);
      
      // Step 1: Create medication (template - drug info + inventory)
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,
          name: medication.name,
          dosage: medication.dosage,
          notes: medication.notes,
          doctor: medication.doctor,
          prescription_number: medication.prescription_number,
          inventory_count: medication.inventory_count,
          refill_threshold: medication.refill_threshold,
          is_active: true,
          frequency: 'custom',
        } as any)
        .select()
        .single();

      if (medError) {
        console.error('Medication insert error:', medError);
        throw medError;
      }

      console.log('Medication created:', medData.id);

      // Step 2: Create schedule (timing rules)
      const { data: scheduleData, error: scheduleError } = await (supabase
        .from('medication_schedules' as any) as any)
        .insert({
          user_id: user.id,
          medication_id: medData.id,
          frequency: schedule.frequency,
          treatment_type: schedule.treatment_type,
          times: schedule.times,
          start_date: schedule.start_date,
          end_date: schedule.end_date,
          is_indefinite: schedule.is_indefinite,
          reminder_minutes_before: schedule.reminder_minutes_before || 15,
          is_active: true,
        })
        .select()
        .single();

      if (scheduleError) {
        console.error('Schedule insert error:', scheduleError);
        throw scheduleError;
      }

      console.log('Schedule created:', scheduleData.id);

      // Step 3: Generate today's logs if applicable
      const today = new Date().toISOString().split('T')[0];
      const isActiveToday = schedule.start_date <= today && (schedule.is_indefinite || !schedule.end_date || schedule.end_date >= today);
      
      if (isActiveToday) {
        const logInserts = schedule.times.map(time => ({
          user_id: user.id,
          medication_id: medData.id,
          scheduled_time: time,
          date: today,
          status: 'pending'
        }));

        const { error: logsError } = await supabase
          .from('medication_logs')
          .insert(logInserts);

        if (logsError) {
          console.error('Error creating initial logs:', logsError);
          // Don't throw here as the main medication was already created
        }
      }

      // Update local state immediately for responsiveness
      setMedications(prev => [medData as Medication, ...prev]);
      setSchedules(prev => [scheduleData as MedicationSchedule, ...prev]);
      
      // Refresh data in background to get computed schedule without blocking UI closing
      fetchData().catch(err => console.error('Background refresh error:', err));

      toast.success('Medication created successfully!');
      return medData;
    } catch (error: any) {
      console.error('Error in addMedication sequence:', error);
      toast.error(`Error: ${error.message || 'Failed to create medication'}`);
      throw error;
    }
  };

  const updateMedication = async (medicationId: string, updates: Partial<Medication>) => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', medicationId)
        .select()
        .single();

      if (error) throw error;

      setMedications(prev => 
        prev.map(m => m.id === medicationId ? { ...m, ...data } as Medication : m)
      );
      
      toast.success('Medication updated');
      return data;
    } catch (error: any) {
      console.error('Error updating medication:', error);
      toast.error('Failed to update medication');
      throw error;
    }
  };

  const deleteMedication = async (medicationId: string) => {
    try {
      // Soft delete - just deactivate
      const { error } = await supabase
        .from('medications')
        .update({ is_active: false })
        .eq('id', medicationId);

      if (error) throw error;
      
      // Also deactivate associated schedules
      await supabase
        .from('medication_schedules')
        .update({ is_active: false })
        .eq('medication_id', medicationId);

      setMedications(prev => prev.filter(m => m.id !== medicationId));
      setSchedules(prev => prev.filter(s => s.medication_id !== medicationId));
      
      // Refresh to update today's schedule
      await fetchData();
      
      toast.success('Medication removed');
    } catch (error: any) {
      console.error('Error deleting medication:', error);
      toast.error('Failed to remove medication');
    }
  };

  const calculateGlucoseStability = useCallback(() => {
    if (bloodSugarReadings.length < 2) return 0;
    const values = bloodSugarReadings.map(r => r.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    // Stability score: 100 - (CV * 100)
    const cv = stdDev / mean;
    return Math.max(0, Math.min(100, Math.round(100 - (cv * 100))));
  }, [bloodSugarReadings]);

  const calculateAdherenceRate = useCallback(() => {
    if (todaySchedule.length === 0) return 100;
    const taken = todaySchedule.filter(s => s.status === 'taken').length;
    return Math.round((taken / todaySchedule.length) * 100);
  }, [todaySchedule]);

  const calculateAdherenceStreak = useCallback(() => {
    if (medicationLogs.length === 0) return 0;
    
    // Group logs by date and count 'taken' vs total scheduled for that date
    const logsByDate = medicationLogs.reduce((acc: any, log) => {
      if (!acc[log.date]) acc[log.date] = { taken: 0, total: 0 };
      acc[log.date].total += 1;
      if (log.status === 'taken') acc[log.date].taken += 1;
      return acc;
    }, {});

    const dates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));
    let streak = 0;
    for (const date of dates) {
      if (logsByDate[date].taken === logsByDate[date].total) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [medicationLogs]);

  const detectTrendDeterioration = useCallback(() => {
    // Blood Sugar Deterioration (3 consecutive rises)
    if (bloodSugarReadings.length >= 3) {
      const last3 = bloodSugarReadings.slice(0, 3).map(r => r.value).reverse();
      if (last3[2] > last3[1] && last3[1] > last3[0]) return { type: 'blood_sugar', severity: 'medium', message: 'Glucose trend rising over last 3 readings.' };
    }
    
    // Blood Pressure Deterioration
    if (bloodPressureReadings.length >= 3) {
      const last3Sys = bloodPressureReadings.slice(0, 3).map(r => r.systolic).reverse();
      if (last3Sys[2] > last3Sys[1] && last3Sys[1] > last3Sys[0]) return { type: 'blood_pressure', severity: 'medium', message: 'Blood pressure trend rising.' };
    }
    
    return null;
  }, [bloodSugarReadings, bloodPressureReadings]);

  const detectMissedMedicationRisk = useCallback(() => {
    const historicalLogs = [...medicationLogs].sort((a, b) => b.date.localeCompare(a.date) || b.scheduled_time.localeCompare(a.scheduled_time));
    const last3 = historicalLogs.slice(0, 3);
    const missedCount = last3.filter(l => l.status === 'missed').length;
    
    if (missedCount >= 2) {
      return { severity: 'high', message: `You missed ${missedCount} of your last 3 doses.` };
    }
    return null;
  }, [medicationLogs]);

  const getLatestPulse = useCallback((): number | null => {
    const latestBP = bloodPressureReadings[0];
    return latestBP?.pulse ?? null;
  }, [bloodPressureReadings]);

  const getLatestOxygen = useCallback((): number | null => {
    return oxygenReadings[0]?.value ?? null;
  }, [oxygenReadings]);

  const getTodaySteps = useCallback(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    return activityReadings.find(a => a.date === today)?.steps || 0;
  }, [activityReadings]);

  const calculateHealthScore = useCallback(() => {
    const stability = calculateGlucoseStability();
    const adherence = calculateAdherenceRate();
    return Math.round((stability * 0.6) + (adherence * 0.4));
  }, [calculateGlucoseStability, calculateAdherenceRate]);

  const addBloodSugarReading = async (reading: Omit<BloodSugarReading, 'id' | 'recorded_at'>) => {
    if (!user) {
      console.error('[addBloodSugarReading] No user found');
      return;
    }

    const payload: any = {
      user_id: user.id,
      value: reading.value,
      unit: reading.unit,
      recorded_at: new Date().toISOString(),
      notes: reading.notes
    };

    // Try including meal_type by default
    if (reading.meal_type) {
      payload.meal_type = reading.meal_type;
    }

    try {
      console.log('[addBloodSugarReading] Attempting insert:', payload);
      const { data, error } = await supabase
        .from('blood_sugar_readings')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // PGRST204 means the column 'meal_type' (or another) doesn't exist in the DB
        if (error.code === 'PGRST204' && payload.meal_type) {
          console.warn('[useHealthData] meal_type column missing, retrying without it...');
          const { meal_type: _unused, ...minimalPayload } = payload;
          const { data: retryData, error: retryError } = await supabase
            .from('blood_sugar_readings')
            .insert(minimalPayload)
            .select()
            .single();
          
          if (retryError) throw retryError;
          setBloodSugarReadings(prev => [retryData as BloodSugarReading, ...prev]);
          toast.success('Reading saved (without meal type)');
          return;
        }
        throw error;
      }
      
      console.log('[addBloodSugarReading] Success:', data);
      setBloodSugarReadings(prev => [data as BloodSugarReading, ...prev]);
      toast.success('Blood sugar reading saved!');
    } catch (error: any) {
      console.error('[addBloodSugarReading] Error:', error);
      toast.error(`Failed to save reading: ${error?.message || 'Unknown error'}`);
    }
  };

  const addBloodPressureReading = async (reading: Omit<BloodPressureReading, 'id' | 'recorded_at'>) => {
    if (!user) {
      console.warn('[addBloodPressureReading] No user found in AuthContext');
      return;
    }

    const payload: any = {
      user_id: user.id,
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      pulse: reading.pulse,
      recorded_at: new Date().toISOString(),
      notes: reading.notes
    };

    try {
      console.log('[addBloodPressureReading] Attempting insert:', payload);
      const { data, error } = await supabase
        .from('blood_pressure_readings')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Handle common schema mismatch: missing optional columns pulse or notes
        if (error.code === 'PGRST204') {
          console.warn('[addBloodPressureReading] Column mismatch detected, retrying without pulse/notes...');
          const fallbackPayload = {
            user_id: user.id,
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            recorded_at: new Date().toISOString()
          };
          
          const { data: retryData, error: retryError } = await supabase
            .from('blood_pressure_readings')
            .insert(fallbackPayload)
            .select()
            .single();
            
          if (retryError) throw retryError;
          setBloodPressureReadings(prev => [retryData as BloodPressureReading, ...prev]);
          toast.success('Reading saved!');
          return;
        }
        throw error;
      }
      
      console.log('[addBloodPressureReading] Success:', data);
      setBloodPressureReadings(prev => [data as BloodPressureReading, ...prev]);
      toast.success('Blood pressure reading saved!');
    } catch (error: any) {
      console.error('[addBloodPressureReading] Critical error:', error);
      toast.error(`Failed to save reading: ${error?.message || 'Unknown error'}`);
    }
  };

  const addOxygenReading = async (value: number) => {
    if (!user) return;
    try {
      const { data, error } = await (supabase.from('oxygen_readings' as any) as any)
        .insert({ user_id: user.id, value })
        .select()
        .single();
      if (error) throw error;
      setOxygenReadings(prev => [data as OxygenReading, ...prev]);
      toast.success('Oxygen level saved');
    } catch (error) {
      console.error('Error adding oxygen reading:', error);
    }
  };

  const updateTodaySteps = async (steps: number) => {
    if (!user) return;
    const now = new Date();
    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    try {
      const { data, error } = await (supabase.from('activity_readings' as any) as any)
        .upsert({ user_id: user.id, date: today, steps }, { onConflict: 'user_id,date' })
        .select()
        .single();
      if (error) throw error;
      setActivityReadings(prev => {
        const filtered = prev.filter(a => a.date !== today);
        return [data as ActivityReading, ...filtered];
      });
    } catch (error) {
      console.error('Error updating steps:', error);
    }
  };

  return {
    // Core data - separated structure
    medications,
    schedules,
    medicationLogs,
    todaySchedule, // Computed from medications + schedules + logs
    
    // Health readings
    bloodSugarReadings,
    bloodPressureReadings,
    oxygenReadings,
    activityReadings,
    
    // Loading state
    isMedsLoading,
    isReadingsLoading,
    isProfileLoading,
    isLoading,
    
    // Actions
    markMedicationTaken,
    addMedication, // Now takes (medication, schedule)
    deleteMedication,
    updateMedication,
    addBloodSugarReading,
    addBloodPressureReading,
    addOxygenReading,
    updateTodaySteps,
    
    // Calculations
    calculateGlucoseStability,
    calculateAdherenceRate,
    getLatestPulse,
    getLatestOxygen,
    getTodaySteps,
    calculateHealthScore,
    calculateAdherenceStreak,
    detectTrendDeterioration,
    detectMissedMedicationRisk,
    
    // User info
    userName: profile?.full_name,
    bloodType: profile?.blood_type,
    avatarUrl: profile?.avatar_url,
    language: profile?.language,
    timezone: profile?.timezone,
    profile, // Added full profile for screens that need it
    refetch: fetchData
  };
};
