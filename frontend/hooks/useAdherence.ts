"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MedicationLog, 
  TodayScheduleItem 
} from "@/types/health";
import { toast } from "sonner";
import { useMemo } from "react";

export const useAdherence = (options?: { summaryOnly?: boolean; includeSchedule?: boolean; includeHistory?: boolean }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const summaryOnly = options?.summaryOnly ?? false;
  const includeSchedule = options?.includeSchedule ?? true;
  const includeHistory = options?.includeHistory ?? !summaryOnly;

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  }, []);

  // Optimized Fetch: Medications with their Schedules in a single query
  const combinedMedsQuery = useQuery({
    queryKey: ["medications-with-schedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("medications")
        .select(`
          id, name, dosage, form_type, doctor, inventory_count, refill_threshold, is_active,
          medication_schedules(id, frequency, times, start_date, end_date, is_active)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);
        
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && includeSchedule,
  });

  // Fetch logs for today (Targeted columns)
  const logsQuery = useQuery({
    queryKey: ["logs", "today", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("medication_logs")
        .select("id, medication_id, scheduled_time, status, taken_at, date")
        .eq("user_id", user.id)
        .eq("date", today);
      if (error) throw error;
      return data as MedicationLog[];
    },
    enabled: !!user?.id && includeSchedule,
    staleTime: 60000, 
  });

  // Fetch all logs for streak/rate calculations (Targeted columns)
  const allLogsQuery = useQuery({
    queryKey: ["logs", "all", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("medication_logs")
        .select("id, medication_id, status, date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(100); // Limit historical logs for performance
      if (error) throw error;
      return data as MedicationLog[];
    },
    enabled: !!user?.id && includeHistory,
    staleTime: 300000,
  });

  // Compute today's schedule
  const todaySchedule = useMemo(() => {
    if (!combinedMedsQuery.data) return [];
    
    const medicationLogs = logsQuery.data ?? [];
    const medicationsData = combinedMedsQuery.data;

    const scheduleItems: TodayScheduleItem[] = [];

    medicationsData.forEach(medication => {
      const schedules = (medication.medication_schedules as any[]) || [];
      
      schedules.forEach(schedule => {
        if (!schedule.is_active) return;
        if (schedule.start_date > today) return;
        if (schedule.end_date && schedule.end_date < today) return;

        schedule.times.forEach((time: string) => {
          const existingLog = medicationLogs.find(
            log => log.medication_id === medication.id && log.scheduled_time === time
          );

          scheduleItems.push({
            log_id: existingLog?.id,
            medication_id: medication.id,
            medication_name: medication.name,
            dosage: medication.dosage,
            form_type: medication.form_type as any,
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
    });

    return scheduleItems.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  }, [combinedMedsQuery.data, logsQuery.data, today]);

  const markMedicationTakenMutation = useMutation({
    mutationFn: async ({ logId, medicationId, scheduledTime }: { logId?: string; medicationId: string; scheduledTime: string }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("medication_logs")
        .upsert({
          ...(logId ? { id: logId } : {}),
          user_id: user.id,
          medication_id: medicationId,
          scheduled_time: scheduledTime,
          status: "taken",
          taken_at: new Date().toISOString(),
          date: today
        }, { 
          onConflict: 'medication_id,scheduled_time,date',
          ignoreDuplicates: false 
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      queryClient.invalidateQueries({ queryKey: ["medications-with-schedules"] });
      toast.success("Medication marked as taken");
    },
    onError: (err) => {
      toast.error(`Failed to mark medication: ${err.message}`);
    },
  });

  const adherenceRate = useMemo(() => {
    if (todaySchedule.length === 0) return 100;
    const taken = todaySchedule.filter(s => s.status === 'taken').length;
    return Math.round((taken / todaySchedule.length) * 100);
  }, [todaySchedule]);

  const adherenceStreak = useMemo(() => {
    if (!includeHistory) return 0;
    const logs = allLogsQuery.data ?? [];
    if (logs.length === 0) return 0;
    
    // Group logs by date
    const logsByDate = logs.reduce((acc: Record<string, { taken: number; total: number }>, log) => {
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
  }, [allLogsQuery.data, includeHistory]);

  const missedMedicationRisk = useMemo(() => {
    if (!includeHistory) return null;
    const logs = allLogsQuery.data ?? [];
    const historicalLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    const last3 = historicalLogs.slice(0, 3);
    const missedCount = last3.filter(l => l.status === 'missed').length;
    
    if (missedCount >= 2) {
      return { severity: 'high', message: `You missed ${missedCount} of your last 3 doses.` };
    }
    return null;
  }, [allLogsQuery.data, includeHistory]);

  return {
    todaySchedule,
    adherenceRate,
    adherenceStreak,
    missedMedicationRisk,
    medicationLogs: summaryOnly ? (logsQuery.data ?? []) : (allLogsQuery.data ?? []),
    isLoading: (includeSchedule && (combinedMedsQuery.isLoading || logsQuery.isLoading)) || (includeHistory && allLogsQuery.isLoading),
    markMedicationTaken: markMedicationTakenMutation.mutateAsync,
  };
};
