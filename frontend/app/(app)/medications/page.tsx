"use client";

import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useHealth } from "@/contexts/HealthContext";

export default function MedicationsPage() {
  const { medications, medicationLogs, markMedicationTaken, addMedication, deleteMedication, refetch } = useHealth();

  return (
    <MedicationsScreen
      medications={medications}
      medicationLogs={medicationLogs}
      onMarkMedicationTaken={markMedicationTaken}
      onAddMedication={addMedication as any}
      onDeleteMedication={deleteMedication}
      onRefresh={refetch}
    />
  );
}
