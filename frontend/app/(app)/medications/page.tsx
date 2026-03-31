"use client";

import { MedicationsScreen } from "@/components/screens/MedicationsScreen";
import { useHealth } from "@/contexts/HealthContext";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function MedicationsPage() {
  const { user } = useAuth();
  const { 
    medications, 
    schedules,
    todaySchedule, 
    markMedicationTaken, 
    addMedication, 
    deleteMedication,
    updateMedication,
    updateMedicationSchedule,
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
      schedules={schedules}
      todaySchedule={todaySchedule}
      isMedsLoading={isMedsLoading}
      onMarkMedicationTaken={markMedicationTaken}
      onAddMedication={addMedication}
      onUpdateMedication={updateMedication}
      onUpdateSchedule={updateMedicationSchedule}
      onDeleteMedication={deleteMedication}
      onRefresh={refetch}
    />
  );
}
