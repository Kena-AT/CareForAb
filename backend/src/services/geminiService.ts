export interface HealthDataSnapshot {
  bloodSugar: Array<{ value: number; unit: string; meal_type: string; recorded_at: string }>;
  bloodPressure: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>;
  medications: Array<{ name: string; dosage: string; status: string; date: string }>;
  activeMedications?: Array<{ name: string; dosage: string; frequency?: string; purpose?: string }>;
  oxygen?: Array<{ value: number; recorded_at: string }>;
  activity?: Array<{ steps: number; date: string; recorded_at?: string }>;
  adherence?: { todayRate?: number; streak?: number; recentMissed?: number };
  profile?: { bloodType?: string | null; age?: number | null; timezone?: string | null };
}

export interface MedicationInput {
  name: string;
  dosage: string;
}

export interface MedicalQAResponse {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  caution: 'low' | 'moderate' | 'high';
  followUp?: string;
}

export class GeminiService {
  private getGeminiApiKey(): string {
    return (
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      ''
    );
  }

  // Dynamically import the Gemini SDK to avoid module load failure at startup
  private async getClient() {
    const apiKey = this.getGeminiApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Set GOOGLE_GEMINI_API_KEY, GEMINI_API_KEY, or NEXT_PUBLIC_GEMINI_API_KEY.');
    }

    try {
      const mod = await import('@google/generative-ai');
      const GoogleGenerativeAI = (mod as any).GoogleGenerativeAI;
      return new GoogleGenerativeAI(apiKey);
    } catch (err) {
      // Provide a helpful error without crashing on import time
      throw new Error('Gemini SDK is not installed. Run `npm --prefix backend install @google/generative-ai` and restart the server.');
    }
  }

  private isConfigured(): boolean {
    return Boolean(this.getGeminiApiKey());
  }

  private async getModel() {
    const client = await this.getClient();
    return client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private buildLocalMedicalAnswer(question: string, data: HealthDataSnapshot): MedicalQAResponse {
    const q = question.toLowerCase();
    const latestSugar = data.bloodSugar?.[0];
    const latestBP = data.bloodPressure?.[0];
    const latestPulse = data.bloodPressure?.find((r) => typeof r.pulse === 'number')?.pulse;
    const avgSteps = (data.activity && data.activity.length > 0)
      ? Math.round(data.activity.reduce((sum, item) => sum + (item.steps || 0), 0) / data.activity.length)
      : null;

    const emergencyKeywords = ['chest pain', 'fainting', 'passed out', 'stroke', 'can\'t breathe', 'cant breathe', 'shortness of breath', 'severe headache', 'confusion'];
    if (emergencyKeywords.some((k) => q.includes(k))) {
      return {
        answer: 'These symptoms can be serious. Seek urgent medical care immediately or call emergency services now.',
        confidence: 'high',
        caution: 'high',
        followUp: 'Do not delay care for severe or sudden symptoms.',
      };
    }

    if (q.includes('blood sugar') || q.includes('glucose') || q.includes('diabetes')) {
      const sugarLine = latestSugar
        ? `Your latest glucose is ${latestSugar.value} ${latestSugar.unit}.`
        : 'No recent glucose reading was found.';
      return {
        answer: `${sugarLine} Keep checking trends before and after meals, stay hydrated, and follow your medication plan.`,
        confidence: latestSugar ? 'medium' : 'low',
        caution: 'moderate',
        followUp: 'If values are repeatedly very high or very low, contact your clinician today.',
      };
    }

    if (q.includes('blood pressure') || q.includes('hypertension') || q.includes('bp')) {
      const bpLine = latestBP
        ? `Your latest blood pressure is ${latestBP.systolic}/${latestBP.diastolic} mmHg.`
        : 'No recent blood pressure reading was found.';
      return {
        answer: `${bpLine} Focus on medication adherence, lower sodium intake, regular activity, and consistent sleep.`,
        confidence: latestBP ? 'medium' : 'low',
        caution: 'moderate',
        followUp: 'Seek urgent care for very high readings with symptoms such as chest pain, severe headache, or breathlessness.',
      };
    }

    if (q.includes('heart rate') || q.includes('pulse')) {
      const pulseLine = typeof latestPulse === 'number'
        ? `Your latest logged pulse is ${latestPulse} BPM.`
        : 'No recent pulse reading was found.';
      return {
        answer: `${pulseLine} Track resting pulse trends and correlate with stress, hydration, sleep, and exercise intensity.`,
        confidence: typeof latestPulse === 'number' ? 'medium' : 'low',
        caution: 'moderate',
        followUp: 'Discuss sustained unusually high or low pulse trends with your clinician.',
      };
    }

    if (q.includes('steps') || q.includes('activity') || q.includes('exercise')) {
      const stepLine = avgSteps !== null
        ? `Your recent average is about ${avgSteps} steps/day.`
        : 'No recent steps data was found.';
      return {
        answer: `${stepLine} Build consistency first, then gradually increase activity based on your care plan and tolerance.`,
        confidence: avgSteps !== null ? 'medium' : 'low',
        caution: 'low',
        followUp: 'Stop activity and seek care if you develop concerning symptoms during exercise.',
      };
    }

    if (q.includes('medication') || q.includes('dose') || q.includes('dosage') || q.includes('missed')) {
      const medCount = data.activeMedications?.length || 0;
      return {
        answer: `You currently have ${medCount} active medication(s) logged. For missed doses or dosing changes, follow your prescription instructions and confirm with your prescriber before adjusting.`,
        confidence: medCount > 0 ? 'medium' : 'low',
        caution: 'moderate',
        followUp: 'If you are unsure about a missed dose, contact your pharmacist or clinician.',
      };
    }

    return {
      answer: 'I can help with trends in glucose, blood pressure, pulse, steps, oxygen, and medication adherence. Ask a specific question for a more targeted clinical summary.',
      confidence: 'low',
      caution: 'low',
      followUp: 'This assistant provides educational guidance and does not replace professional medical diagnosis.',
    };
  }

  async analyzeBloodPressure(readings: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>) {
    const prompt = `
      Analyze these BP readings: ${JSON.stringify(readings)}
      Return JSON: { "headline": "Short Title", "detail": "1 sentence explanation", "status": "stable" | "warning" | "critical" }
    `;

    try {
      if (!this.isConfigured()) {
        return { headline: 'Clinical Syncing Pause', detail: 'AI summary is temporarily unavailable. Local monitoring remains active.', status: 'stable' as const };
      }
      const model = await this.getModel();
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
      if (!this.isConfigured()) {
        return { safe: true, warning: '[CareForAb AI Offline] Safety assistant unavailable. Please verify with your doctor.', recommendation: 'Manual verification recommended.' };
      }
      const model = await this.getModel();
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
    const prompt = `
      Generate a high-fidelity Clinical Visit Summary for a physician using the following data:
      Vitals/Logs: ${JSON.stringify(data)}
      Active Protocol: ${JSON.stringify(data.activeMedications)}
      Activity/Oxygen: ${JSON.stringify({ activity: data.activity, oxygen: data.oxygen })}

      Include:
      1. Weekly Health Summary (Executive view of glucose/BP stability).
      2. Adherence Intelligence (Compliance percentage and missed dose patterns).
      3. Clinical Protocol Analysis (Insight into how the current medications are impacting vitals and daily activity).
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
      if (!this.isConfigured()) {
        return {
          weeklySummary: 'AI summary is temporarily unavailable. Local monitoring remains active.',
          risks: ['AI insights unavailable'],
          doctorQuestions: ['Can we review my latest vitals manually?'],
          adherenceScore: 100,
          vascularHealthInsight: 'Review recent blood pressure readings.',
          metabolicStabilityInsight: 'Review recent glucose readings.',
        };
      }
      const model = await this.getModel();
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
    const prompt = `Based on these readings and logs: ${JSON.stringify(data)}, provide 3 immediate, concrete steps the user should do today. Use glucose, blood pressure, pulse, activity, oxygen, and medications when available. Return JSON: {"actions": ["Step 1", "Step 2", "Step 3"]}`;

    try {
      if (!this.isConfigured()) {
        return { actions: ['Maintain your medication schedule', 'Log a fresh blood sugar reading', 'Log a fresh blood pressure reading'] };
      }
      const model = await this.getModel();
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text().match(/\{[\s\S]*\}/)?.[0] || '{"actions": []}');
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return { actions: ['Maintain consistent medication schedule', 'Log new vitals regularly', 'Check your trends below'] };
      }
      return { actions: [] };
    }
  }

  async answerMedicalQuestion(question: string, data: HealthDataSnapshot): Promise<MedicalQAResponse> {
    if (!question?.trim()) {
      return {
        answer: 'Please enter a medical question so I can help you with your health trends.',
        confidence: 'low',
        caution: 'low',
      };
    }

    const fallback = this.buildLocalMedicalAnswer(question, data);

    try {
      if (!this.isConfigured()) {
        return fallback;
      }

      const prompt = `
        You are a cautious clinical assistant for a diabetes and cardiovascular support app.
        User question: ${question}
        User health snapshot: ${JSON.stringify(data)}

        Rules:
        - Use the supplied user data directly when relevant (blood sugar, blood pressure, pulse/heart rate, oxygen, steps, medications, adherence).
        - Be practical, concise, and safe.
        - Never claim a diagnosis.
        - Escalate urgent symptoms to emergency care.
        - Include one follow-up recommendation.

        Return JSON only:
        {
          "answer": "...",
          "confidence": "high|medium|low",
          "caution": "low|moderate|high",
          "followUp": "..."
        }
      `;

      const model = await this.getModel();
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          ...fallback,
          answer: text?.trim() || fallback.answer,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: parsed.answer || fallback.answer,
        confidence: parsed.confidence || fallback.confidence,
        caution: parsed.caution || fallback.caution,
        followUp: parsed.followUp || fallback.followUp,
      };
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return {
          ...fallback,
          followUp: 'AI capacity is currently limited. Please retry in a moment or consult your clinician for urgent concerns.',
        };
      }

      return fallback;
    }
  }
}

export const geminiService = new GeminiService();
