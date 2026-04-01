"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MedicationSchedule } from "@/types/health";
import { toast } from "sonner";

export const useSchedules = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["schedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("medication_schedules")
        .select("id, user_id, medication_id, frequency, treatment_type, times, start_date, end_date, is_indefinite, reminder_minutes_before, is_active, created_at, updated_at")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data as MedicationSchedule[];
    },
    enabled: !!user?.id,
    staleTime: 300000,
    gcTime: 600000,
  });

  const addScheduleMutation = useMutation({
    mutationFn: async (schedule: Omit<MedicationSchedule, "id" | "created_at" | "is_active" | "user_id">) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("medication_schedules")
        .insert({
          ...schedule,
          user_id: user.id,
          is_active: true,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["medications-with-schedules", user?.id] });
      toast.success("Schedule created successfully");
    },
    onError: (err) => {
      toast.error(`Failed to create schedule: ${err.message}`);
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MedicationSchedule> }) => {
      const { data, error } = await supabase
        .from("medication_schedules")
        .update(updates)
        .eq("id", id)
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["medications-with-schedules", user?.id] });
      toast.success("Schedule updated");
    },
    onError: (err) => {
      toast.error(`Failed to update schedule: ${err.message}`);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("medication_schedules")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["medications-with-schedules", user?.id] });
      toast.success("Schedule removed");
    },
    onError: (err) => {
      toast.error(`Failed to remove schedule: ${err.message}`);
    },
  });

  return {
    schedules: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addSchedule: addScheduleMutation.mutateAsync,
    updateSchedule: updateScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    isMutating: addScheduleMutation.isPending || updateScheduleMutation.isPending || deleteScheduleMutation.isPending,
  };
};
