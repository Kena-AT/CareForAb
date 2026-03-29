"use client";

import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { useHealth } from "@/contexts/HealthContext";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
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
    calculateHealthScore,
    calculateAdherenceStreak,
    userName,
    isMedsLoading,
    isReadingsLoading,
  } = useHealth();

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
      onNavigate={(tab) => router.push(`/${tab}`)}
      pulse={getLatestPulse()}
      oxygen={getLatestOxygen()}
      steps={getTodaySteps()}
      healthScore={calculateHealthScore()}
      adherenceStreak={calculateAdherenceStreak()}
      userName={userName}
    />
  );
}
