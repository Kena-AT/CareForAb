import express from 'express';
import { geminiService } from '../services/geminiService';

const router = express.Router();

router.post('/blood-pressure', async (req, res) => {
  try {
    const { readings } = req.body as {
      readings: Array<{ systolic: number; diastolic: number; pulse?: number; recorded_at: string }>;
    };

    const data = await geminiService.analyzeBloodPressure(readings || []);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze blood pressure' });
  }
});

router.post('/medication-safety', async (req, res) => {
  try {
    const { newMed, existingMeds } = req.body as {
      newMed: { name: string; dosage: string };
      existingMeds: Array<{ name: string; dosage: string }>;
    };

    const data = await geminiService.checkMedicationSafety(newMed, existingMeds || []);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check medication safety' });
  }
});

router.post('/clinical-report', async (req, res) => {
  try {
    const { data } = req.body;
    const report = await geminiService.generateClinicalReport(data);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate clinical report' });
  }
});

router.post('/action-plan', async (req, res) => {
  try {
    const { data } = req.body;
    const plan = await geminiService.generateActionPlan(data);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate action plan' });
  }
});

router.post('/medical-qa', async (req, res) => {
  try {
    const { question, data } = req.body as {
      question: string;
      data: any;
    };

    const response = await geminiService.answerMedicalQuestion(question, data || {
      bloodSugar: [],
      bloodPressure: [],
      medications: [],
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to answer medical question' });
  }
});

export default router;
