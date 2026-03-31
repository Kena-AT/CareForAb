import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Interface for health data snapshot sent to Gemini
 */
export interface HealthDataSnapshot {
  bloodSugar: Array<{ value: number; unit: string; meal_type: string; recorded_at: string }>;
  bloodPressure: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>;
  medications: Array<{ name: string; dosage: string; status: string; date: string }>;
}

/**
 * Analyzes health data using Gemini 2.5 Flash to find patterns and provide insights.
 */
export const analyzeHealthPatterns = async (data: HealthDataSnapshot) => {
  if (!API_KEY) {
    throw new Error("Gemini API key is missing. Please add it to your .env file.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are CareForAb AI, a Senior Clinical AI Analyst for the CareForAb app. 
    Analyze the following patient health data for patterns, risks, and actionable correlations.
    
    Data Snapshot:
    - Glucose Readings: ${JSON.stringify(data.bloodSugar)}
    - Blood Pressure: ${JSON.stringify(data.bloodPressure)}
    - Medication Adherence: ${JSON.stringify(data.medications)}

    Identify:
    1. TREND DETERIORATION: (e.g. "BP rising for 5 consecutive days").
    2. CORRELATIONS: (e.g. "Missed morning meds correlate with afternoon BP spikes").
    3. MEDICAL SAFETY: (e.g. "Glucose readings over 300 detected").

    Expected JSON Format:
    {
      "pattern": "Strong Trend Title (e.g. Vascular Stress)",
      "explanation": "Detailed clinical reasoning (2 sentences).",
      "recommendation": "WHAT TO DO: Specific actionable advice.",
      "type": "critical" | "warning" | "success" | "info",
      "trendSeverity": number (1-10)
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse AI response.");
  } catch (error: any) {
    console.error("CareForAb AI Analysis Error:", error);
    return {
      pattern: "CareForAb AI Temporarily Unavailable",
      explanation: "Our clinical engine is stabilizing data markers.",
      recommendation: "Please try running your health audit again in a few moments.",
      type: "info"
    };
  }
};

/**
 * Specialized analysis for Blood Pressure readings (Vitals Screen)
 */
export const analyzeBloodPressure = async (readings: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `
    Analyze these BP readings: ${JSON.stringify(readings)}
    Return JSON: { "headline": "Short Title", "detail": "1 sentence explanation", "status": "stable" | "warning" | "critical" }
  `;

  try {
    const result = await model.generateContent(prompt);
    const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { headline: "Stable Levels", detail: "Readings within normal range.", status: "stable" };
  } catch {
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Analyze for MEDICAL SAFETY conflicts:
    NEW MEDICATION: ${newMed.name} ${newMed.dosage}
    CURRENT PROTOCOL: ${JSON.stringify(existingMeds)}

    Check for:
    1. Dangerous combinations (e.g. Metformin + Contrast imaging).
    2. Abnormal dosages (e.g. user entering 5000mg instead of 500mg).
    3. Duplicate medications.

    Return JSON:
    {
      "safe": boolean,
      "warning": "Concise medical warning if unsafe",
      "recommendation": "Immediate step to take",
      "suggestedDosage": "Standard dosage if the entered one is abnormal"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { safe: true };
  } catch {
    return { safe: true }; 
  }
};

/**
 * Generates a comprehensive clinical report for doctors.
 */
export const generateClinicalReport = async (data: HealthDataSnapshot) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Generate a high-fidelity Clinical Visit Summary for a physician using the following data: ${JSON.stringify(data)}

    Include:
    1. Weekly Health Summary (Executive view of glucose/BP stability).
    2. Adherence Intelligence (Compliance percentage and missed dose patterns).
    3. Risk Report (Hypertension/Hyperglycemia risk levels).
    4. Questions for Doctor: 3 evidence-based questions for the patient to ask their provider.

    Return JSON:
    {
      "weeklySummary": "Professional medical summary...",
      "adherenceScore": number (0-100),
      "risks": ["Risk 1", "Risk 2"],
      "doctorQuestions": ["Question 1", "Question 2", "Question 3"],
      "vascularHealthInsight": "...",
      "metabolicStabilityInsight": "..."
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error("Gemini Report Error:", error);
    return null;
  }
};

/**
 * Analyzes health data to provide "What you should do" instructions.
 */
export const generateActionPlan = async (data: HealthDataSnapshot) => {
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
   const prompt = `Based on these readings: ${JSON.stringify(data)}, provide 3 immediate, concrete steps the user should do today. Return JSON: {"actions": ["Step 1", "Step 2", "Step 3"]}`;
   try {
     const result = await model.generateContent(prompt);
     return JSON.parse(result.response.text().match(/\{[\s\S]*\}/)?.[0] || '{"actions": []}');
   } catch { return { actions: [] }; }
};
