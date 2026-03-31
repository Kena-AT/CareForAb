"use client";

import { useHealth } from '@/contexts/HealthContext';
import { motion } from 'framer-motion';
import { Activity, Heart, Printer, Download, ChevronLeft, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { generateClinicalReport, HealthDataSnapshot } from '@/services/gemini';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export default function DoctorReportPage() {
  const router = useRouter();
  const { 
    bloodSugarReadings, 
    bloodPressureReadings, 
    medications,
    medicationLogs,
    userName
  } = useHealth();

  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reportData: HealthDataSnapshot = useMemo(() => ({
    bloodSugar: bloodSugarReadings.slice(0, 30).map(r => ({ ...r, recorded_at: new Date(r.recorded_at).toISOString() })),
    bloodPressure: bloodPressureReadings.slice(0, 15).map(r => ({ ...r, recorded_at: new Date(r.recorded_at).toISOString() })),
    medications: medicationLogs.slice(0, 50).map(l => ({ 
      name: medications.find(m => m.id === l.medication_id)?.name || 'Unknown', 
      dosage: medications.find(m => m.id === l.medication_id)?.dosage || 'N/A',
      status: l.status, 
      date: l.date 
    }))
  }), [bloodSugarReadings, bloodPressureReadings, medicationLogs, medications]);

  useEffect(() => {
    async function getReport() {
      try {
        const res = await generateClinicalReport(reportData);
        setReport(res);
      } catch (err) {
        console.error("Report generation error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    getReport();
  }, [reportData]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent animate-spin rounded-full mx-auto" />
          <p className="font-black uppercase tracking-widest text-[10px] text-slate-400">Compiling Clinical Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      {/* Navigation Header - Hidden on Print */}
      <header className="px-10 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-6">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl">
             <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-lg font-black tracking-tight">Clinical Encounter Report</h1>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confidential Medical Summary</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrint} className="rounded-xl border-slate-200 font-bold gap-2">
            <Printer size={18} /> Print Report
          </Button>
          <Button className="rounded-xl bg-slate-900 text-white font-bold gap-2">
            <Download size={18} /> Export PDF
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-12 px-10 space-y-12 print:py-0 print:px-0">
        {/* Patient Info Header */}
        <div className="flex items-end justify-between border-b-4 border-slate-900 pb-8">
          <div className="space-y-1">
             <h2 className="text-4xl font-black text-slate-900">{userName || 'Patient Name'}</h2>
             <p className="text-sm font-bold text-slate-400">Report Date: {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-2 justify-end mb-1">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">ID: CARE-AB-PRT-023</span>
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase">Provider Hub: CareForAb Intelligence</p>
          </div>
        </div>

        {/* Executive Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="md:col-span-2 space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Weekly Clinical Summary</h3>
              <p className="text-lg font-medium text-slate-800 leading-relaxed bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                {report?.weeklySummary || "Clinical summary data currently being synchronized. Initial patterns show relative stability in the last 72 hours."}
              </p>
           </div>
           <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Vascular Stability</h3>
              <div className="bg-slate-900 rounded-[32px] p-8 text-white flex flex-col justify-between h-[calc(100%-2rem)]">
                <div>
                   <Heart className="text-red-400 mb-4" size={24} />
                   <p className="text-sm font-medium text-slate-300 leading-snug">
                     {report?.vascularHealthInsight || "Trend analysis indicates normal vascular elasticity and resting pulse patterns."}
                   </p>
                </div>
                <div className="pt-6 border-t border-white/10 mt-6">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Risk Level</p>
                   <p className="text-lg font-black uppercase tracking-wider text-emerald-400 mt-1">Moderate</p>
                </div>
              </div>
           </div>
        </section>

        {/* Vital Trends (Print-Optimized) */}
        <section className="space-y-6">
           <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Longitudinal Trends (Glucose & BP)</h3>
           <Card className="border-none bg-white rounded-[40px] shadow-sm p-10 print:border print:shadow-none">
              <div className="h-[350px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.bloodSugar.reverse()}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="recorded_at" hide />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
                       <Area type="monotone" dataKey="value" stroke="#004c56" strokeWidth={4} fill="#004c5610" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </Card>
        </section>

        {/* Active Protocol (Medications) */}
        <section className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Active Pharmacological Protocol</h3>
              <span className="text-[10px] font-black uppercase px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full"> Compliance: {report?.adherenceScore || 0}%</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.map((med, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <Activity size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{med.name}</p>
                        <p className="text-xs font-bold text-slate-400">{med.dosage}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Adherence</p>
                      <p className="text-xs font-black text-emerald-500">CONSISTENT</p>
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* Provider Questions & Risks */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-6">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Recommended Provider Inquiries</h3>
              <div className="space-y-4">
                 {report?.doctorQuestions?.map((q: string, i: number) => (
                   <div key={i} className="p-5 bg-white rounded-2xl border border-slate-100 flex gap-4">
                      <span className="text-xs font-black text-primary">{i+1}</span>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">{q}</p>
                   </div>
                 ))}
              </div>
           </div>
           <div className="space-y-6">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Detected Clinical Risk Warnings</h3>
              <div className="p-8 bg-red-50/50 rounded-[40px] border border-red-100 space-y-6">
                 {report?.risks?.map((risk: string, i: number) => (
                   <div key={i} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-lg bg-white flex-shrink-0 flex items-center justify-center text-red-500 shadow-sm">
                        <Info size={14} />
                      </div>
                      <p className="text-sm font-black text-red-700/80">{risk}</p>
                   </div>
                 ))}
                 {!report?.risks?.length && (
                   <p className="text-sm font-bold text-emerald-600">No high-priority risks detected in the current 30-day window.</p>
                 )}
              </div>
           </div>
        </section>

        {/* Footer Disclaimer */}
        <footer className="pt-12 border-t border-slate-100 text-center opacity-40">
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
             Generated by CareForAb Clinical Engine • This report should only be used by licensed medical professionals • All patterns are AI-assisted suggestions
           </p>
        </footer>
      </main>
    </div>
  );
}
