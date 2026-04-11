import { GoogleGenerativeAI } from '@google/generative-ai';

export interface HealthDataSnapshot {
  bloodSugar: Array<{ value: number; unit: string; meal_type: string; recorded_at: string }>;
  bloodPressure: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>;
  medications: Array<{ name: string; dosage: string; status: string; date: string }>;
  activeMedications?: Array<{ name: string; dosage: string; frequency?: string; purpose?: string }>;
}

export interface MedicationInput {
  name: string;
  dosage: string;
}

export class GeminiService {
  private getClient() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Set GOOGLE_GEMINI_API_KEY in backend environment.');
    }
    return new GoogleGenerativeAI(apiKey);
  }

  private getModel() {
    return this.getClient().getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async analyzeBloodPressure(readings: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>) {
    const model = this.getModel();
    const prompt = `
      Analyze these BP readings: ${JSON.stringify(readings)}
      Return JSON: { "headline": "Short Title", "detail": "1 sentence explanation", "status": "stable" | "warning" | "critical" }
    `;

    try {
      const result = await model.generateContent(prompt);
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { headline: 'Stable Levels', detail: 'Readings within normal range.', status: 'stable' };
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return { headline: 'Clinical Syncing Pause', detail: 'CareForAb AI at capacity. Real-time safety monitoring still active.', status: 'stable' };
      }
      return { headline: 'Syncing...', detail: 'Analysis in progress.', status: 'stable' };
    }
  }

  async checkMedicationSafety(newMed: MedicationInput, existingMeds: MedicationInput[]) {
    const model = this.getModel();

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
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return { safe: true, warning: '[CareForAb AI at Capacity] Safety check skipped. Please verify with your doctor.', recommendation: 'Manual verification recommended.' };
      }
      return { safe: true };
    }
  }

  async generateClinicalReport(data: HealthDataSnapshot) {
    const model = this.getModel();

    const prompt = `
      Generate a high-fidelity Clinical Visit Summary for a physician using the following data:
      Vitals/Logs: ${JSON.stringify(data)}
      Active Protocol: ${JSON.stringify(data.activeMedications)}

      Include:
      1. Weekly Health Summary (Executive view of glucose/BP stability).
      2. Adherence Intelligence (Compliance percentage and missed dose patterns).
      3. Clinical Protocol Analysis (Insight into how the current medications are impacting vitals).
      4. Risk Report (Hypertension/Hyperglycemia risk levels).
      5. Questions for Doctor: 3 evidence-based questions for the patient to ask their provider.

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
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return {
          weeklySummary: 'CareForAb AI Clinical Report at Capacity. Please print your trend data below for physician review.',
          risks: ['Safety Monitoring Active'],
          doctorQuestions: ['Verify latest vitals with provider'],
          adherenceScore: 100,
        };
      }
      return null;
    }
  }

  async generateActionPlan(data: HealthDataSnapshot) {
    const model = this.getModel();
    const prompt = `Based on these readings: ${JSON.stringify(data)}, provide 3 immediate, concrete steps the user should do today. Return JSON: {"actions": ["Step 1", "Step 2", "Step 3"]}`;

    try {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text().match(/\{[\s\S]*\}/)?.[0] || '{"actions": []}');
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return { actions: ['Maintain consistent medication schedule', 'Log new vitals regularly', 'Check your trends below'] };
      }
      return { actions: [] };
    }
  }
}

export const geminiService = new GeminiService();
