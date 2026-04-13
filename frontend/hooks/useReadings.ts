"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BloodSugarReading, 
  BloodPressureReading, 
  OxygenReading, 
  ActivityReading 
} from "@/types/health";
import { toast } from "sonner";
import { getGlucoseStatus } from "@/types/health";

type ReadingType = 'blood_sugar' | 'blood_pressure' | 'oxygen' | 'activity';

export const useReadings = (options?: { types?: ReadingType[] }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const types = options?.types ?? ['blood_sugar', 'blood_pressure', 'oxygen', 'activity'];
  const includeSugar = types.includes('blood_sugar');
  const includePressure = types.includes('blood_pressure');
  const includeOxygen = types.includes('oxygen');
  const includeActivity = types.includes('activity');

  const getNotificationPreferences = async () => {
    const cachedProfile = queryClient.getQueryData<any>(["profile", user?.id]);
    if (cachedProfile?.notification_preferences) {
      return cachedProfile.notification_preferences;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user?.id)
      .single();

    return profile?.notification_preferences;
  };

  const sugarQuery = useQuery({
    queryKey: ["readings", "blood_sugar", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("blood_sugar_readings")
        .select("id, value, unit, recorded_at, meal_type, notes")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as BloodSugarReading[];
    },
    enabled: !!user?.id && includeSugar,
    staleTime: 300000,
  });

  const bpQuery = useQuery({
    queryKey: ["readings", "blood_pressure", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("blood_pressure_readings")
        .select("id, systolic, diastolic, pulse, recorded_at, notes")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as BloodPressureReading[];
    },
    enabled: !!user?.id && includePressure,
    staleTime: 300000,
  });

  const oxygenQuery = useQuery({
    queryKey: ["readings", "oxygen", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("oxygen_readings" as any)
        .select("id, value, recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as OxygenReading[];
    },
    enabled: !!user?.id && includeOxygen,
    staleTime: 300000,
  });

  const activityQuery = useQuery({
    queryKey: ["readings", "activity", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("activity_readings")
        .select("id, date, steps")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(7);
      if (error) throw error;
      return data as ActivityReading[];
    },
    enabled: !!user?.id && includeActivity,
    staleTime: 300000,
  });

  const addSugarMutation = useMutation({
    mutationFn: async (reading: Omit<BloodSugarReading, "id" | "recorded_at">) => {
      if (!user?.id) throw new Error("User not authenticated");
      const payload: any = {
        user_id: user.id,
        value: reading.value,
        unit: reading.unit,
        recorded_at: new Date().toISOString(),
        notes: reading.notes,
        meal_type: reading.meal_type
      };

      const { data, error } = await supabase
        .from("blood_sugar_readings")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        if (error.code === "PGRST204" && payload.meal_type) {
          const { meal_type: _, ...minimalPayload } = payload;
          const { data: retryData, error: retryError } = await supabase
            .from("blood_sugar_readings")
            .insert(minimalPayload)
            .select("id")
            .single();
          if (retryError) throw retryError;
          return retryData;
        }
        throw error;
      }
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["readings", "blood_sugar", user?.id] });
      
      const prefs = await getNotificationPreferences();
      if (prefs?.abnormal_readings) {
        const status = getGlucoseStatus(variables.value, variables.unit);
        if (status === 'low' || status === 'high') {
          toast.warning(`Clinic Alert: Abnormal Glucose detected (${variables.value} ${variables.unit} - ${status.toUpperCase()})`);
        }
      }
      
      toast.success("Blood sugar reading saved");
    },
  });

  const addBPMutation = useMutation({
    mutationFn: async (reading: Omit<BloodPressureReading, "id" | "recorded_at">) => {
      if (!user?.id) throw new Error("User not authenticated");
      const payload: any = {
        user_id: user.id,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        pulse: reading.pulse,
        recorded_at: new Date().toISOString(),
        notes: reading.notes
      };

      const { data, error } = await supabase
        .from("blood_pressure_readings")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        if (error.code === "PGRST204") {
          const fallbackPayload = {
            user_id: user.id,
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            recorded_at: new Date().toISOString()
          };
          const { data: retryData, error: retryError } = await (supabase.from("blood_pressure_readings") as any)
            .insert(fallbackPayload)
            .select("id")
            .single();
          if (retryError) throw retryError;
          return retryData;
        }
        throw error;
      }
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["readings", "blood_pressure", user?.id] });
      
      const prefs = await getNotificationPreferences();
      if (prefs?.abnormal_readings && variables.pulse) {
        if (variables.pulse > 100 || variables.pulse < 50) {
          toast.warning(`Clinic Alert: Abnormal Heart Rate detected (${variables.pulse} BPM)`);
        }
      }

      toast.success("Blood pressure reading saved");
    },
  });

  const addOxygenMutation = useMutation({
    mutationFn: async (value: number) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("oxygen_readings" as any)
        .insert({ user_id: user.id, value, recorded_at: new Date().toISOString() } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readings", "oxygen", user?.id] });
      toast.success("Oxygen reading saved");
    },
  });

  const updateStepsMutation = useMutation({
    mutationFn: async (steps: number) => {
      if (!user?.id) throw new Error("User not authenticated");
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase.from("activity_readings") as any)
        .upsert({ user_id: user.id, date: today, steps }, { onConflict: "user_id,date" })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readings", "activity", user?.id] });
      toast.success("Steps updated");
    },
  });

  return {
    bloodSugarReadings: sugarQuery.data ?? [],
    bloodPressureReadings: bpQuery.data ?? [],
    oxygenReadings: oxygenQuery.data ?? [],
    activityReadings: activityQuery.data ?? [],
    isLoading: sugarQuery.isLoading || bpQuery.isLoading || oxygenQuery.isLoading || activityQuery.isLoading,
    isBloodSugarLoading: sugarQuery.isLoading,
    isBloodPressureLoading: bpQuery.isLoading,
    isOxygenLoading: oxygenQuery.isLoading,
    isActivityLoading: activityQuery.isLoading,
    addBloodSugarReading: addSugarMutation.mutateAsync,
    addBloodPressureReading: addBPMutation.mutateAsync,
    addOxygenReading: addOxygenMutation.mutateAsync,
    updateTodaySteps: updateStepsMutation.mutateAsync,
  };
};
