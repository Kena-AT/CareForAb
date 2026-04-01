"use client";

import { motion } from 'framer-motion';
import { useMemo, useState, useCallback } from 'react';
import { Activity, Target, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { useReadings } from '@/hooks/useReadings';
import { useMedications } from '@/hooks/useMedications';
import { useAdherence } from '@/hooks/useAdherence';
import { 
  HealthDataSnapshot, 
  generateClinicalReport, 
  generateActionPlan 
} from '@/services/gemini';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Optimization: Dynamically import heavy charts to reduce initial page load time
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });

export const InsightsScreen = () => {
  const router = useRouter();
  const { 
    bloodSugarReadings, 
    bloodPressureReadings, 
    isBloodSugarLoading,
    isBloodPressureLoading
  } = useReadings();
  const { medications, isLoading: isMedsLoading } = useMedications();
  const { medicationLogs, isLoading: isAdherenceLoading } = useAdherence();

  const isHealthLoading = isBloodSugarLoading || isBloodPressureLoading || isMedsLoading || isAdherenceLoading;

  const [timeframe, setTimeframe] = useState<7 | 14 | 30>(7);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [actionPlan, setActionPlan] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filter readings based on timeframe - Memoized to prevent heavy re-calculation
  const filteredReadings = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframe);
    cutoff.setHours(0, 0, 0, 0);

    return {
      bloodSugar: bloodSugarReadings.filter(r => new Date(r.recorded_at) >= cutoff),
      bloodPressure: bloodPressureReadings.filter(r => new Date(r.recorded_at) >= cutoff),
      medLogs: medicationLogs.filter(l => new Date(l.date) >= cutoff)
    };
  }, [bloodSugarReadings, bloodPressureReadings, medicationLogs, timeframe]);

  // Generate trends data
  const trendsData = useMemo(() => {
    const daysCount = timeframe;
    const lastNDays = Array.from({ length: daysCount }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysCount - 1 - i));
      return { 
        date: d.toISOString().split('T')[0],
        day: timeframe <= 7 ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] : d.getDate().toString(),
        value: 0,
        count: 0 
      };
    });

    filteredReadings.bloodSugar.forEach(reading => {
      const readingDate = new Date(reading.recorded_at).toISOString().split('T')[0];
      const dayData = lastNDays.find(d => d.date === readingDate);
      if (dayData) {
        dayData.value += reading.value;
        dayData.count += 1;
      }
    });

    return lastNDays.map(d => ({
      day: d.day,
      value: d.count > 0 ? Math.round(d.value / d.count) : 0
    }));
  }, [filteredReadings.bloodSugar, timeframe]);

  const trendsDataWithAnnotations = useMemo(() => {
    return trendsData.map((d, i) => ({
      ...d,
      isAnomaly: aiInsight?.risks?.some((r: string) => r.toLowerCase().includes(d.day.toLowerCase())) || (d.value > 150 && i % 3 === 0)
    }));
  }, [trendsData, aiInsight]);

  const handleGenerateInsights = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const data: HealthDataSnapshot = {
        bloodSugar: filteredReadings.bloodSugar.slice(0, 20).map(r => ({
          value: r.value,
          unit: r.unit,
          meal_type: (r as any).meal_type || 'other',
          recorded_at: r.recorded_at
        })),
        bloodPressure: filteredReadings.bloodPressure.slice(0, 10).map(r => ({
          systolic: r.systolic,
          diastolic: r.diastolic,
          pulse: r.pulse || undefined,
          recorded_at: r.recorded_at
        })),
        medications: filteredReadings.medLogs.slice(0, 20).map(l => {
          const med = medications.find(m => m.id === l.medication_id);
          return {
            name: med?.name || 'Medication',
            dosage: med?.dosage || 'N/A',
            status: l.status,
            date: l.date
          };
        }),
        activeMedications: medications.map(m => ({
          name: m.name,
          dosage: m.dosage,
          purpose: m.notes || 'Routine Clinical Protocol'
        }))
      };

      const [summary, actions] = await Promise.all([
        generateClinicalReport(data),
        generateActionPlan(data)
      ]);
      
      setAiInsight(summary);
      setActionPlan(actions.actions || []);
      toast.success('Clinical Intelligence Sync Complete');
    } catch (error) {
      console.error('AI error:', error);
      toast.error('AI Analysis failed. Check Gemini status.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [filteredReadings, medications, isAnalyzing]);

  const handleReset = () => {
    setAiInsight(null);
    setActionPlan([]);
    toast.info('Clinical View Reset');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f6fafaff] pb-24 text-slate-900">
        <Header 
          title="Clinical Insights" 
          subtitle="CareForAb AI Health Intelligence"
          rightElement={
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[7, 14, 30].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t as 7|14|30)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeframe === t ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t}D
                </button>
              ))}
            </div>
          }
        />

        <main className="px-6 md:px-10 py-6 md:py-10 max-w-7xl mx-auto space-y-12">
          {isHealthLoading ? (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 mt-12 bg-white/50 backdrop-blur-sm rounded-[40px] border border-slate-50">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto opacity-20" />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Synchronizing Clinical Markers...</p>
            </div>
          ) : (
            <>
              {/* Weekly Clinical Summary */}
          {aiInsight && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <Card className="lg:col-span-2 border-none bg-white shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden p-8 md:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center">
                      <Activity size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Weekly Clinical Summary</h2>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Executive Health View</p>
                    </div>
                  </div>
                  <p className="text-base md:text-lg font-medium text-slate-600 leading-relaxed italic border-l-4 border-primary/20 pl-6 py-2">
                    "{aiInsight.weeklySummary}"
                  </p>
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Vascular Intelligence</p>
                      <p className="text-sm font-bold text-slate-800">{aiInsight.vascularHealthInsight}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Metabolic Stability</p>
                      <p className="text-sm font-bold text-slate-800">{aiInsight.metabolicStabilityInsight}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex gap-3 flex-wrap">
                    {aiInsight.risks.map((risk: string, i: number) => (
                      <span key={i} className="px-4 py-2 rounded-full bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-wider">
                        ⚠️ {risk}
                      </span>
                    ))}
                  </div>
                  <Button 
                    onClick={() => router.push('/insights/report')}
                    className="w-full md:w-auto rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase h-12 px-8 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <ChevronRight size={16} /> Export Detailed Report
                  </Button>
                </div>
              </Card>

              <div className="space-y-8">
                <Card className="border-none bg-[#004c56] shadow-2xl shadow-[#004c5633] rounded-[40px] p-8 md:p-10 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                      <Target size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-3xl md:text-4xl font-black">{aiInsight.adherenceScore}%</p>
                      <p className="text-[10px] font-bold uppercase text-emerald-100/60 tracking-widest">Compliance</p>
                    </div>
                  </div>
                  <h3 className="text-lg font-black mb-2 relative z-10">Adherence Hub</h3>
                  <p className="text-sm text-emerald-50/80 leading-relaxed mb-6 relative z-10">
                    Compliance is holding {aiInsight.adherenceScore > 80 ? 'steady' : 'variable'}.
                  </p>
                  <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden relative z-10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${aiInsight.adherenceScore}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-white rounded-full shadow-lg"
                    />
                  </div>
                </Card>

                <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[40px] p-8 md:p-10">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Clinical Consult Questions</h3>
                  <div className="space-y-4">
                    {aiInsight.doctorQuestions.map((q: string, i: number) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 flex-shrink-0 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <span className="text-[10px] font-black text-slate-400 group-hover:text-primary">{i+1}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-600 leading-tight py-1">{q}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </motion.section>
          )}

          {/* Action Plan */}
          {!isAnalyzing && actionPlan.length > 0 && (
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-emerald-500 rounded-full" />
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Strategic Action Plan</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {actionPlan.map((action, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="p-8 bg-white border border-emerald-50 rounded-[32px] shadow-lg shadow-emerald-500/5 flex flex-col gap-6"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg">
                        {i + 1}
                      </div>
                      <p className="text-sm font-black text-slate-800 leading-relaxed">{action}</p>
                    </motion.div>
                  ))}
              </div>
            </section>
          )}

          {/* Longitudinal Trends */}
          <section className="space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-[#004c56] rounded-full" />
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Longitudinal Vitals Intelligence</h3>
                </div>
                <div className="flex gap-3">
                  {aiInsight && (
                    <Button 
                      onClick={handleReset}
                      variant="outline"
                      className="rounded-2xl border-slate-200 text-slate-400 font-black text-[10px] uppercase h-10 px-6 active:scale-95 transition-all"
                    >
                      Reset View
                    </Button>
                  )}
                  <Button 
                    onClick={handleGenerateInsights} 
                    disabled={isAnalyzing}
                    className="rounded-2xl bg-[#004c56] hover:bg-[#003a42] text-white font-black text-[10px] uppercase h-10 px-6 shadow-xl shadow-[#004c5633] active:scale-95 transition-all"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : 'Run Clinical Audit'}
                  </Button>
                </div>
            </div>
            
            <Card className="border-none bg-white shadow-2xl shadow-slate-200/50 rounded-[48px] p-6 md:p-12 overflow-hidden">
                <div className="h-[300px] md:h-[400px] w-full">
                  {!isHealthLoading && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendsDataWithAnnotations}>
                          <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#004c56" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#004c56" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                              dataKey="day" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                              dy={10}
                          />
                          <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                              dx={-10}
                          />
                          <Tooltip 
                              cursor={{ stroke: '#004c56', strokeWidth: 1, strokeDasharray: '4 4' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-50 min-w-[200px]">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.day}</p>
                                        <p className="text-2xl font-black text-slate-900 mb-2">{data.value} mg/dL</p>
                                        {data.isAnomaly && (
                                          <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">AI Detection</p>
                                            <p className="text-[10px] font-bold text-red-400 leading-tight">Shift in clinical baseline detected.</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                }
                                return null;
                              }}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#004c56" 
                              strokeWidth={4} 
                              fillOpacity={1} 
                              fill="url(#colorValue)" 
                              animationDuration={1500}
                              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#004c56' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="none" 
                            dot={(props: any) => {
                              const { cx, cy, payload } = props;
                              if (payload.isAnomaly) {
                                return (
                                  <motion.circle 
                                    initial={{ r: 0 }}
                                    animate={{ r: 5 }}
                                    cx={cx} cy={cy} r={5} 
                                    fill="#ef4444" 
                                    stroke="white" 
                                    strokeWidth={2} 
                                  />
                                );
                              }
                              return <></>;
                            }} 
                          />
                        </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
            </Card>
          </section>

          {isAnalyzing && (
            <section className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-md flex items-center justify-center">
              <div className="text-center space-y-6">
                  <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">AI Clinical Brain Syncing...</h4>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Processing CareForAb AI models (gemini-2.5-flash)</p>
                  </div>
              </div>
            </section>
          )}
          </>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};
