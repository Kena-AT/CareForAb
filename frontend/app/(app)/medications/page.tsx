"use client";

import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useHealth } from "@/contexts/HealthContext";

export default function MedicationsPage() {
  const { 
    medications, 
    todaySchedule, 
    markMedicationTaken, 
    addMedication, 
    deleteMedication,
    updateMedication,
    refetch 
  } = useHealth();

  return (
    <MedicationsScreen
      medications={medications}
      todaySchedule={todaySchedule}
      onMarkMedicationTaken={markMedicationTaken}
      onAddMedication={addMedication}
      onUpdateMedication={updateMedication}
      onDeleteMedication={deleteMedication}
      onRefresh={refetch}
    />
  );
}
