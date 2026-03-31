"use client";

import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { useHealth } from "@/contexts/HealthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    medications, 
    medicationLogs, 
    bloodSugarReadings, 
    bloodPressureReadings, 
    markMedicationTaken, 
    addBloodSugarReading, 
    addBloodPressureReading, 
    getLatestPulse, 
    getLatestOxygen, 
    getTodaySteps, 
    updateTodaySteps,
    calculateHealthScore, 
    calculateAdherenceStreak, 
    userName, 
    isMedsLoading, 
    isReadingsLoading, 
    refetch 
  } = useHealth();

  useEffect(() => {
    if (user?.id) {
      console.log("[DashboardPage] Triggering data fetch");
      refetch();
    }
  }, [user?.id, refetch]);

  return (
    <DashboardScreen
      medications={medications}
      medicationLogs={medicationLogs}
      bloodSugarReadings={bloodSugarReadings}
      bloodPressureReadings={bloodPressureReadings}
      isMedsLoading={isMedsLoading}
      isReadingsLoading={isReadingsLoading}
      onMarkMedicationTaken={markMedicationTaken}
      onAddBloodSugar={addBloodSugarReading as any}
      onAddBloodPressure={addBloodPressureReading as any}
      onUpdateSteps={updateTodaySteps}
      onNavigate={(tab) => router.push(`/${tab}`)}
      pulse={getLatestPulse()}
      steps={getTodaySteps()}
      healthScore={calculateHealthScore()}
      adherenceStreak={calculateAdherenceStreak()}
      userName={userName}
    />
  );
}
