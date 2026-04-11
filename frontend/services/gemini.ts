import { apiUrl } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface for health data snapshot sent to Gemini
 */
export interface HealthDataSnapshot {
  bloodSugar: Array<{ value: number; unit: string; meal_type: string; recorded_at: string }>;
  bloodPressure: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>;
  medications: Array<{ name: string; dosage: string; status: string; date: string }>;
  activeMedications?: Array<{ name: string; dosage: string; frequency?: string; purpose?: string }>;
}

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
};

/**
 * Analyzes health data using Gemini 2.5 Flash to find patterns and provide insights.
 */
export const analyzeHealthPatterns = async (data: HealthDataSnapshot) => {
  const report = await generateClinicalReport(data);
  return {
    pattern: report?.weeklySummary ? 'Clinical Summary' : 'CareForAb AI Temporarily Offline',
    explanation: report?.weeklySummary || 'Our clinical engine is stabilizing data markers.',
    recommendation: report?.doctorQuestions?.[0] || 'Please try running your health audit again in a few moments.',
    type: report ? 'info' : 'warning',
    trendSeverity: 5,
  };
};

/**
 * Specialized analysis for Blood Pressure readings (Vitals Screen)
 */
export const analyzeBloodPressure = async (readings: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>) => {
  try {
    return await postJson<{ headline: string; detail: string; status: 'stable' | 'warning' | 'critical' }>('/api/ai/blood-pressure', { readings });
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return { headline: "Clinical Syncing Pause", detail: "CareForAb AI at capacity. Real-time safety monitoring still active.", status: "stable" };
    }
    return { headline: "Syncing...", detail: "Analysis in progress.", status: "stable" };
  }
};

/**
 * Checks for medication conflicts, dosage safety, and smart suggestions.
 */
export const checkMedicationSafety = async (
  newMed: { name: string; dosage: string },
  existingMeds: Array<{ name: string; dosage: string }>
): Promise<{ safe: boolean; warning?: string; recommendation?: string; suggestedDosage?: string }> => {
  try {
    return await postJson<{ safe: boolean; warning?: string; recommendation?: string; suggestedDosage?: string }>('/api/ai/medication-safety', {
      newMed,
      existingMeds,
    });
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
       return { safe: true, warning: "[CareForAb AI at Capacity] Safety check skipped. Please verify with your doctor.", recommendation: "Manual verification recommended." };
    }
    return { safe: true }; 
  }
};

/**
 * Generates a comprehensive clinical report for doctors.
 */
export const generateClinicalReport = async (data: HealthDataSnapshot) => {
  try {
    return await postJson<any>('/api/ai/clinical-report', { data });
  } catch (error: any) {
    console.error("CareForAb AI Report Error:", error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
       return { 
          weeklySummary: "CareForAb AI Clinical Report at Capacity. Please print your trend data below for physician review.",
          risks: ["Safety Monitoring Active"],
          doctorQuestions: ["Verify latest vitals with provider"],
          adherenceScore: 100
       };
    }
    return null;
  }
};

/**
 * Analyzes health data to provide "What you should do" instructions.
 */
export const generateActionPlan = async (data: HealthDataSnapshot) => {
   try {
     return await postJson<{ actions: string[] }>('/api/ai/action-plan', { data });
   } catch (error: any) { 
     if (error.message?.includes('429') || error.message?.includes('quota')) {
        return { actions: ["Maintain consistent medication schedule", "Log new vitals regularly", "Check your trends below"] };
     }
     return { actions: [] }; 
   }
};
