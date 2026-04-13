"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Medication, MedicationSchedule } from "@/types/health";
import { toast } from "sonner";

import { scheduleAllMedicationReminders, cancelAllReminders } from "@/services/notifications";

interface UseMedicationsOptions {
  enabled?: boolean;
}

export const useMedications = ({ enabled = true }: UseMedicationsOptions = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Helper inside hook to get full schedule for notifications
  const refreshReminders = async () => {
    if (!user?.id) return;
    
    const cachedProfile = queryClient.getQueryData<any>(["profile", user.id]);
    let prefs = cachedProfile?.notification_preferences;

    if (!prefs) {
      const { data: profile } = (await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()) as any;
      prefs = profile?.notification_preferences;
    }

    if (!prefs?.medication) {
      await cancelAllReminders();
      return;
    }

    const { data: meds } = await supabase
      .from("medications")
      .select("id, name, dosage, medication_schedules(times)")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (meds) {
      const scheduleMap = meds.map(m => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        times: Array.isArray(m.medication_schedules) ? m.medication_schedules.flatMap((s: any) => s.times) : (m.medication_schedules as any)?.times || []
      }));
      await scheduleAllMedicationReminders(scheduleMap);
    }
  };

  const query = useQuery({
    queryKey: ["medications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("medications")
        .select("id, user_id, name, dosage, doctor, prescription_number, inventory_count, refill_threshold, created_at, updated_at, is_active, notes, form_type")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Medication[];
    },
    enabled: !!user?.id && enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const addMedicationMutation = useMutation({
    mutationFn: async ({ medication, schedule }: { 
      medication: Omit<Medication, "id" | "created_at" | "is_active" | "user_id">;
      schedule: Omit<MedicationSchedule, "id" | "created_at" | "is_active" | "medication_id" | "user_id">;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Step 1: Create medication
      const medicationInsert: any = {
        ...(medication as any),
        // Backward-compatibility: some DBs still require frequency on medications
        frequency: (schedule as any)?.frequency ?? 'daily',
        user_id: user.id,
        is_active: true,
      };

      const { data: medData, error: medError } = await (supabase.from("medications") as any)
        .insert(medicationInsert)
        .select("id")
        .single();

      if (medError) throw medError;

      // Step 2: Create schedule
      const scheduleInsert: any = {
        ...(schedule as any),
        frequency: (schedule as any)?.frequency ?? 'daily',
        medication_id: medData.id,
        user_id: user.id,
        is_active: true,
      };

      const { error: schedError } = await (supabase.from("medication_schedules") as any)
        .insert(scheduleInsert);

      if (schedError) {
        // Cleanup medication if schedule fails
        await supabase.from("medications").delete().eq("id", medData.id);
        throw schedError;
      }

      return medData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["schedules", user?.id] });
      refreshReminders();
      toast.success("Medication and schedule added");
    },
    onError: (err) => {
      toast.error(`Failed to add medication: ${err.message}`);
    },
  });

  const updateMedicationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Medication> }) => {
      const { data, error } = await (supabase.from("medications") as any)
        .update(updates)
        .eq("id", id)
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications", user?.id] });
      refreshReminders();
      toast.success("Medication updated");
    },
    onError: (err) => {
      toast.error(`Failed to update medication: ${err.message}`);
    },
  });

  const deleteMedicationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("medications") as any)
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["schedules", user?.id] });
      refreshReminders();
      toast.success("Medication removed");
    },
    onError: (err) => {
      toast.error(`Failed to remove medication: ${err.message}`);
    },
  });

  return {
    medications: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addMedication: addMedicationMutation.mutateAsync,
    updateMedication: updateMedicationMutation.mutateAsync,
    deleteMedication: deleteMedicationMutation.mutateAsync,
    isMutating: addMedicationMutation.isPending || updateMedicationMutation.isPending || deleteMedicationMutation.isPending,
  };
};
