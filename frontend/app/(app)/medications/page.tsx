"use client";

import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useHealth } from "@/contexts/HealthContext";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function MedicationsPage() {
  const { user } = useAuth();
  const { 
    medications, 
    todaySchedule, 
    markMedicationTaken, 
    addMedication, 
    deleteMedication,
    updateMedication,
    isMedsLoading,
    refetch 
  } = useHealth();

  useEffect(() => {
    if (user?.id) {
      console.log("[MedicationsPage] Triggering data fetch");
      refetch();
    }
  }, [user?.id, refetch]);

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
