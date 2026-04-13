"use client";

import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMedications } from "@/hooks/useMedications";
import { useReadings } from "@/hooks/useReadings";
import { useAdherence } from "@/hooks/useAdherence";
import { useProfile } from "@/hooks/useProfile";
import { calculateGlucoseStability, calculateHealthScore } from "@/lib/health-calculations";
import { useMemo } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function DashboardPage() {
  const router = useRouter();
  useAuth();
  
  const { medications, isLoading: isMedsLoading } = useMedications();
  const { 
    bloodSugarReadings, 
    bloodPressureReadings, 
    activityReadings,
    isBloodSugarLoading,
    isBloodPressureLoading,
    isActivityLoading,
    addBloodSugarReading,
    addBloodPressureReading,
    updateTodaySteps
  } = useReadings({ types: ["blood_sugar", "blood_pressure", "activity"] });
  
  const { 
    todaySchedule, 
    markMedicationTaken, 
    adherenceStreak, 
    adherenceRate,
    isLoading: isAdherenceLoading 
  } = useAdherence({ includeHistory: false, includeSchedule: true });
  
  const { profile, isLoading: isProfileLoading } = useProfile();

  const healthScore = useMemo(() => {
    const stability = calculateGlucoseStability(bloodSugarReadings);
    return calculateHealthScore(stability, adherenceRate);
  }, [bloodSugarReadings, adherenceRate]);

  const latestPulse = useMemo(() => {
    return bloodPressureReadings[0]?.pulse ?? null;
  }, [bloodPressureReadings]);

  const steps = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayActivity = activityReadings.find(a => a.date === todayStr);
    return todayActivity?.steps ?? 0;
  }, [activityReadings]);

  return (
    <ErrorBoundary>
      <DashboardScreen
        medications={medications}
        medicationLogs={[]} // Deprecated in favor of todaySchedule
        todaySchedule={todaySchedule}
        bloodPressureReadings={bloodPressureReadings}
        isMedsLoading={isMedsLoading}
        isAdherenceLoading={isAdherenceLoading}
        isBloodPressureLoading={isBloodPressureLoading}
        isActivityLoading={isActivityLoading}
        onMarkMedicationTaken={(logId, medicationId, scheduledTime) => {
          if (!medicationId || !scheduledTime) return;
          void markMedicationTaken({
            logId,
            medicationId,
            scheduledTime,
          });
        }}
        onAddBloodSugar={addBloodSugarReading as any}
        onAddBloodPressure={addBloodPressureReading as any}
        onUpdateSteps={updateTodaySteps}
        onNavigate={(tab) => router.push(`/${tab}`)}
        pulse={latestPulse}
        steps={steps}
        healthScore={healthScore}
        adherenceStreak={adherenceStreak}
        userName={profile?.full_name}
      />
    </ErrorBoundary>
  );
}
