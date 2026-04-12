"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useMedications } from "@/hooks/useMedications";
import { useSchedules } from "@/hooks/useSchedules";
import { useAdherence } from "@/hooks/useAdherence";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function MedicationsPage() {
  const queryClient = useQueryClient();
  
  const { 
    medications, 
    isLoading: isMedsLoading,
    addMedication,
    updateMedication,
    deleteMedication
  } = useMedications();
  
  const { 
    schedules, 
    isLoading: isSchedulesLoading,
    updateSchedule: updateMedicationSchedule
  } = useSchedules();
  
  const { 
    todaySchedule, 
    markMedicationTaken, 
    isLoading: isAdherenceLoading 
  } = useAdherence();

  const isLoading = isMedsLoading || isSchedulesLoading || isAdherenceLoading;

  return (
    <ErrorBoundary>
      <MedicationsScreen
        medications={medications}
        schedules={schedules}
        todaySchedule={todaySchedule}
        isMedsLoading={isLoading}
        onMarkMedicationTaken={(logId, medicationId, scheduledTime) => 
          markMedicationTaken({ logId, medicationId: medicationId!, scheduledTime: scheduledTime! })
        }
        onAddMedication={(med, sched) => addMedication({ medication: med, schedule: sched })}
        onUpdateMedication={(id, updates) => updateMedication({ id, updates })}
        onUpdateSchedule={(id, updates) => updateMedicationSchedule({ id, updates })}
        onDeleteMedication={(id) => deleteMedication(id)}
        onRefresh={async () => {
          const loadingToast = toast.loading("Syncing medications data...");
          try {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["medications"] }),
              queryClient.invalidateQueries({ queryKey: ["schedules"] }),
              queryClient.invalidateQueries({ queryKey: ["medications-with-schedules"] }),
              queryClient.invalidateQueries({ queryKey: ["logs"] }),
            ]);
            toast.success("Medications up to date", { id: loadingToast });
          } catch (error) {
            toast.error("Failed to sync data", { id: loadingToast });
          }
        }}
      />
    </ErrorBoundary>
  );
}
