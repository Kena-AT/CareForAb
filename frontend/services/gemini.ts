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
 * Analyzes health data using Gemini Pro to find patterns and provide insights.
 */
export const analyzeHealthPatterns = async (data: HealthDataSnapshot) => {
  if (!API_KEY) {
    throw new Error("Gemini API key is missing. Please add it to your .env file.");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are an AI Medical Health Analyst for the CareForAb app. 
    Analyze the following patient health data and provide:
    1. One primary pattern detected (e.g., "Post-dinner glucose spike").
    2. A brief 2-sentence explanation of why this pattern is occurring based on the data.
    3. A specific, actionable recommendation for the patient.

    Data Snapshot:
    - Glucose Readings: ${JSON.stringify(data.bloodSugar)}
    - Blood Pressure: ${JSON.stringify(data.bloodPressure)}
    - Medication Adherence: ${JSON.stringify(data.medications)}

    Expected JSON Format:
    {
      "pattern": "Pattern Name",
      "explanation": "Explanation here...",
      "recommendation": "Recommendation here...",
      "type": "warning" | "success" | "info"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response (Gemini sometimes wraps it in markdown blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse AI response.");
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
      return {
        pattern: "Analysis Temporarily Unavailable",
        explanation: "Our AI service is currently experiencing high demand. We pause analysis to ensure secure, accurate results.",
        recommendation: "Please try running your health audit again in a few minutes.",
        type: "info"
      };
    }
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * Analyzes blood pressure readings to generate a concise cardiovascular insight.
 */
export const analyzeBloodPressure = async (
  readings: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>
): Promise<{ headline: string; detail: string; status: 'stable' | 'warning' | 'critical' }> => {
  if (!API_KEY) throw new Error("Gemini API key is missing.");

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are a clinical AI assistant for the CareForAb health app.
    Analyze these blood pressure readings and return a brief, plain-language vascular health insight.

    Readings (most recent first): ${JSON.stringify(readings.slice(0, 5))}

    Respond ONLY with JSON in this exact format:
    {
      "headline": "Short title, e.g. 'Vascular Stability'",
      "detail": "One or two concise sentences about the trend.",
      "status": "stable" | "warning" | "critical"
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse BP analysis.");
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota")) {
      return {
        headline: "Analysis Paused",
        detail: "AI health analysis is temporarily paused due to high server demand. Please check back shortly.",
        status: "stable" // Default safe fallback
      };
    }
    console.error("Gemini BP Analysis Error:", error);
    throw error;
  }
};
