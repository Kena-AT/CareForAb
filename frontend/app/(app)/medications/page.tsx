"use client";

import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useHealthData } from "@/hooks/useHealthData";

export default function MedicationsPage() {
  const { 
    medications, 
    todaySchedule, 
    markMedicationTaken, 
    addMedication, 
    deleteMedication,
    updateMedication,
    isMedsLoading,
    refetch 
  } = useHealthData();

  return (
    <MedicationsScreen
      medications={medications}
      todaySchedule={todaySchedule}
      isMedsLoading={isMedsLoading}
      onMarkMedicationTaken={markMedicationTaken}
      onAddMedication={addMedication}
      onUpdateMedication={updateMedication}
      onDeleteMedication={deleteMedication}
      onRefresh={refetch}
    />
  );
}
