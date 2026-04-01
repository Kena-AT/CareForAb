import { BloodSugarReading, BloodPressureReading, TodayScheduleItem, MedicationLog } from "@/types/health";

export const calculateGlucoseStability = (readings: BloodSugarReading[]) => {
  if (readings.length < 2) return 0;
  const values = readings.map(r => r.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  // Stability score: 100 - (CV * 100)
  const cv = stdDev / mean;
  return Math.max(0, Math.min(100, Math.round(100 - (cv * 100))));
};

export const calculateAdherenceRate = (todaySchedule: TodayScheduleItem[]) => {
  if (todaySchedule.length === 0) return 100;
  const taken = todaySchedule.filter(s => s.status === 'taken').length;
  return Math.round((taken / todaySchedule.length) * 100);
};

export const calculateHealthScore = (glucoseStability: number, adherenceRate: number) => {
  return Math.round((glucoseStability * 0.6) + (adherenceRate * 0.4));
};

export const calculateAdherenceStreak = (medicationLogs: MedicationLog[]) => {
  if (medicationLogs.length === 0) return 0;
  
  const logsByDate = medicationLogs.reduce((acc: Record<string, { taken: number; total: number }>, log) => {
    if (!acc[log.date]) acc[log.date] = { taken: 0, total: 0 };
    acc[log.date].total += 1;
    if (log.status === 'taken') acc[log.date].taken += 1;
    return acc;
  }, {});

  const dates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));
  let streak = 0;
  for (const date of dates) {
    if (logsByDate[date].taken === logsByDate[date].total) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};
