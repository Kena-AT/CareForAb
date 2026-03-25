import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use local date for "Today"
      const now = new Date();
      const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

      // Fetch all data in parallel
      const [
        medsRes, 
        schedulesRes,
        logsRes, 
        sugarRes, 
        bpRes, 
        oxygenRes, 
        activityRes, 
        profileRes
      ] = await Promise.all([
        // 1. Medications (templates - just drug info)
        supabase.from('medications').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
        
        // 2. Schedules (timing rules) - only active ones that could affect today
        (supabase.from('medication_schedules' as any) as any).select('*').eq('user_id', user.id).eq('is_active', true),
        
        // 3. Today's logs (what happened today)
        supabase.from('medication_logs').select('*').eq('user_id', user.id).eq('date', today),
        
        // 4. Other health data
        supabase.from('blood_sugar_readings').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(50),
        supabase.from('blood_pressure_readings').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(50),
        supabase.from('oxygen_readings' as any).select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(20),
        supabase.from('activity_readings' as any).select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
        
        // 5. Profile (with language column)
        supabase.from('profiles').select('full_name, blood_type, avatar_url, language').eq('id', user.id).maybeSingle()
      ]);

      // Handle errors
      if (medsRes.error) throw medsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (logsRes.error) throw logsRes.error;
      if (sugarRes.error) throw sugarRes.error;
      if (bpRes.error) throw bpRes.error;

      // Update states
      setMedications(medsRes.data as Medication[] || []);
      setSchedules((schedulesRes.data as unknown as MedicationSchedule[]) || []);
      setMedicationLogs(logsRes.data as MedicationLog[] || []);
      
      // Compute today's schedule from medications, schedules, and logs
      computeTodaySchedule(
        medsRes.data as Medication[] || [],
        schedulesRes.data as MedicationSchedule[] || [],
        logsRes.data as MedicationLog[] || [],
        today
      );
      
      setBloodSugarReadings(sugarRes.data as BloodSugarReading[] || []);
      setBloodPressureReadings(bpRes.data as BloodPressureReading[] || []);
      setOxygenReadings(oxygenRes.data as unknown as OxygenReading[] || []);
      setActivityReadings(activityRes.data as unknown as ActivityReading[] || []);
      setProfile(profileRes.data as any);
    } catch (error: any) {
      console.error('Error fetching health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const createMedicationLog = async (medicationId: string, scheduledTime: string) => {
    if (!user) return;

    const now = new Date();
    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    try {
      const { data, error } = await supabase
        .from('medication_logs')
        .insert({
          user_id: user.id,
          medication_id: medicationId,
          scheduled_time: scheduledTime,
          date: today,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      setMedicationLogs(prev => [...prev, data as MedicationLog]);
    } catch (error: any) {
      console.error('Error creating medication log:', error);
      toast.error(`Log Error: ${error.message || 'Unknown error'}`);
    }
  };

  const addBloodSugarReading = async (reading: Omit<BloodSugarReading, 'id' | 'recorded_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blood_sugar_readings')
        .insert({
          user_id: user.id,
          value: reading.value,
          unit: reading.unit,
          meal_type: reading.meal_type,
          recorded_at: new Date().toISOString(),
          notes: reading.notes
        })
        .select()
        .single();

      if (error) throw error;
      setBloodSugarReadings(prev => [data as BloodSugarReading, ...prev]);
      toast.success('Blood sugar reading saved!');
    } catch (error: any) {
      console.error('Error adding blood sugar reading:', error);
      toast.error('Failed to save reading');
    }
  };

  const addBloodPressureReading = async (reading: Omit<BloodPressureReading, 'id' | 'recorded_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blood_pressure_readings')
        .insert({
          user_id: user.id,
          systolic: reading.systolic,
          diastolic: reading.diastolic,
          pulse: reading.pulse,
          notes: reading.notes
        })
        .select()
        .single();

      if (error) throw error;
      setBloodPressureReadings(prev => [data as BloodPressureReading, ...prev]);
      toast.success('Blood pressure reading saved!');
    } catch (error: any) {
      console.error('Error adding blood pressure reading:', error);
      toast.error('Failed to save reading');
    }
  };

  // ==========================================
  // MEDICATION CREATION (Separated: Medication + Schedule)
  // ==========================================

  const addMedication = async (
    medication: Omit<Medication, 'id' | 'created_at' | 'is_active' | 'user_id'>,
    schedule: Omit<MedicationSchedule, 'id' | 'created_at' | 'is_active' | 'medication_id' | 'user_id'>
  ) => {
    if (!user) return;

    try {
      // Step 1: Create medication (template - just drug info)
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,
          name: medication.name,
          dosage: medication.dosage,
          notes: medication.notes,
          doctor: medication.doctor,
          prescription_number: medication.prescription_number,
          is_active: true,
        })
        .select()
        .single();

      if (medError) throw medError;

      // Step 2: Create schedule (timing rules)
      const { data: scheduleData, error: scheduleError } = await (supabase
        .from('medication_schedules' as any) as any)
        .insert({
          user_id: user.id,
          medication_id: medData.id,
          frequency: schedule.frequency,
          times: schedule.times,
          start_date: schedule.start_date,
          end_date: schedule.end_date,
          reminder_minutes_before: schedule.reminder_minutes_before || 15,
          is_active: true,
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Step 3: Generate today's logs if applicable
      const today = new Date().toISOString().split('T')[0];
      if (schedule.start_date <= today && (!schedule.end_date || schedule.end_date >= today)) {
        // Create pending logs for each scheduled time today
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
        }
      }

      // Update local state
      setMedications(prev => [medData as Medication, ...prev]);
      setSchedules(prev => [scheduleData as MedicationSchedule, ...prev]);
      
      // Refresh data to get computed schedule
      await fetchData();

      toast.success('Medication created successfully!');
      return medData;
    } catch (error: any) {
      console.error('Error adding medication:', error);
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
    if (todaySchedule.length === 0) return 0;
    const taken = todaySchedule.filter(s => s.status === 'taken').length;
    return taken === todaySchedule.length && taken > 0 ? 1 : 0;
  }, [todaySchedule]);

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
    
    // User info
    userName: profile?.full_name,
    bloodType: profile?.blood_type,
    avatarUrl: profile?.avatar_url,
    language: profile?.language,
    timezone: profile?.timezone,
    refetch: fetchData
  };
};
