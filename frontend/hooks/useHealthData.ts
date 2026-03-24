import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Medication,
  MedicationLog,
  BloodSugarReading,
  BloodPressureReading,
  OxygenReading,
  ActivityReading
} from '@/types/health';
import { scheduleAllMedicationReminders } from '@/services/notifications';

export const useHealthData = () => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [bloodSugarReadings, setBloodSugarReadings] = useState<BloodSugarReading[]>([]);
  const [bloodPressureReadings, setBloodPressureReadings] = useState<BloodPressureReading[]>([]);
  const [oxygenReadings, setOxygenReadings] = useState<OxygenReading[]>([]);
  const [activityReadings, setActivityReadings] = useState<ActivityReading[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [medsRes, logsRes, sugarRes, bpRes, oxygenRes, activityRes, profileRes] = await Promise.all([
        supabase.from('medications').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('medication_logs').select('*').eq('date', today),
        supabase.from('blood_sugar_readings').select('*').order('recorded_at', { ascending: false }).limit(50),
        supabase.from('blood_pressure_readings').select('*').order('recorded_at', { ascending: false }).limit(50),
        supabase.from('oxygen_readings' as any).select('*').order('recorded_at', { ascending: false }).limit(20),
        supabase.from('activity_readings' as any).select('*').order('date', { ascending: false }).limit(7),
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      ]);

      if (medsRes.error) throw medsRes.error;
      if (logsRes.error) throw logsRes.error;
      if (sugarRes.error) throw sugarRes.error;
      if (bpRes.error) throw bpRes.error;
      
      setMedications(medsRes.data as Medication[] || []);
      setMedicationLogs(logsRes.data as MedicationLog[] || []);
      setBloodSugarReadings(sugarRes.data as BloodSugarReading[] || []);
      setBloodPressureReadings(bpRes.data as BloodPressureReading[] || []);
      setOxygenReadings(oxygenRes.data as unknown as OxygenReading[] || []);
      setActivityReadings(activityRes.data as unknown as ActivityReading[] || []);
      setProfile(profileRes.data as { full_name: string | null });
    } catch (error: any) {
      console.error('Error fetching health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (medications.length > 0) {
      const settings = localStorage.getItem('notification-settings');
      const preferences = settings ? JSON.parse(settings) : { medicationReminders: true };

      if (preferences.medicationReminders) {
        scheduleAllMedicationReminders(medications);
      }
    }
  }, [medications]);

  const markMedicationTaken = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('medication_logs')
        .update({ status: 'taken', taken_at: new Date().toISOString() })
        .eq('id', logId);

      if (error) throw error;

      setMedicationLogs(logs =>
        logs.map(log =>
          log.id === logId ? { ...log, status: 'taken' as const, taken_at: new Date().toISOString() } : log
        )
      );
      toast.success('Medication marked as taken!');
    } catch (error: any) {
      console.error('Error marking medication:', error);
      toast.error('Failed to update medication');
    }
  };

  const createMedicationLog = async (medicationId: string, scheduledTime: string) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

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

  const addMedication = async (medication: Omit<Medication, 'id' | 'created_at' | 'is_active'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,
          name: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          times: medication.times,
          notes: medication.notes
        })
        .select()
        .single();

      if (error) throw error;
      setMedications(prev => [data as Medication, ...prev]);

      // Create logs for today
      for (const time of medication.times) {
        await createMedicationLog(data.id, time);
      }

      toast.success('Medication added!');
      return data;
    } catch (error: any) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication');
    }
  };

  const deleteMedication = async (medicationId: string) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ is_active: false })
        .eq('id', medicationId);

      if (error) throw error;
      setMedications(prev => prev.filter(m => m.id !== medicationId));
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
    if (medicationLogs.length === 0) return 100; // Assume perfect if no logs
    const taken = medicationLogs.filter(l => l.status === 'taken').length;
    return Math.round((taken / medicationLogs.length) * 100);
  }, [medicationLogs]);

  const getLatestPulse = useCallback((): number | null => {
    const latestBP = bloodPressureReadings[0];
    return latestBP?.pulse ?? null;
  }, [bloodPressureReadings]);

  const getLatestOxygen = useCallback((): number | null => {
    return oxygenReadings[0]?.value ?? null;
  }, [oxygenReadings]);

  const getTodaySteps = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return activityReadings.find(a => a.date === today)?.steps || 0;
  }, [activityReadings]);

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
    const today = new Date().toISOString().split('T')[0];
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

  const calculateHealthScore = useCallback(() => {
    const stability = calculateGlucoseStability();
    const adherence = calculateAdherenceRate();
    // Weighted score: 60% stability, 40% adherence
    return Math.round((stability * 0.6) + (adherence * 0.4));
  }, [calculateGlucoseStability, calculateAdherenceRate]);

  const calculateAdherenceStreak = useCallback(() => {
    if (medicationLogs.length === 0) return 0;
    // For now, return 1 if all logs today are taken, 0 otherwise
    // In a real app, this would query historical log completeness
    const taken = medicationLogs.filter(l => l.status === 'taken').length;
    return taken === medicationLogs.length && taken > 0 ? 1 : 0;
  }, [medicationLogs]);

  return {
    medications,
    medicationLogs,
    bloodSugarReadings,
    bloodPressureReadings,
    oxygenReadings,
    activityReadings,
    isLoading,
    markMedicationTaken,
    addBloodSugarReading,
    addBloodPressureReading,
    addOxygenReading,
    updateTodaySteps,
    addMedication,
    deleteMedication,
    calculateGlucoseStability,
    calculateAdherenceRate,
    getLatestPulse,
    getLatestOxygen,
    getTodaySteps,
    calculateHealthScore,
    calculateAdherenceStreak,
    userName: profile?.full_name,
    refetch: fetchData
  };
};
