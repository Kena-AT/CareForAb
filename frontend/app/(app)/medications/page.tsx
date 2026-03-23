"use client";

import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useHealth } from "@/contexts/HealthContext";

export default function MedicationsPage() {
  const { medications, medicationLogs, markMedicationTaken, addMedication } = useHealth();

  return (
    <MedicationsScreen
      medications={medications}
      medicationLogs={medicationLogs}
      onMarkMedicationTaken={markMedicationTaken}
      onAddMedication={addMedication as any}
      onNotificationsClick={() => {}}
      onSettingsClick={() => {}}
    />
  );
}
