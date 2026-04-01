"use client";

import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useMedications } from "@/hooks/useMedications";
import { useSchedules } from "@/hooks/useSchedules";
import { useAdherence } from "@/hooks/useAdherence";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function MedicationsPage() {
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
        onRefresh={() => {}} // React Query handles auto-refresh
      />
    </ErrorBoundary>
  );
}
