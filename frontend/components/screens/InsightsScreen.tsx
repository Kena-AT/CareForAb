"use client";

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, Target, Zap, Heart, Droplets, Calendar, ChevronRight, Info, User } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHealth } from '@/contexts/HealthContext';
import { analyzeHealthPatterns, HealthDataSnapshot } from '@/services/gemini';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

export const InsightsScreen = () => {
  const { 
    bloodSugarReadings, 
    bloodPressureReadings, 
    medicationLogs,
    calculateGlucoseStability,
    calculateAdherenceRate
  } = useHealth();

  const [aiInsight, setAiInsight] = useState<{
    pattern: string;
    explanation: string;
    recommendation: string;
    type: 'warning' | 'success' | 'info';
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleGenerateInsights = async () => {
    setIsAnalyzing(true);
    try {
      const data: HealthDataSnapshot = {
        bloodSugar: bloodSugarReadings.slice(0, 10).map(r => ({
          value: r.value,
          unit: r.unit,
          meal_type: r.meal_type,
          recorded_at: r.recorded_at
        })),
        bloodPressure: bloodPressureReadings.slice(0, 5).map(r => ({
          systolic: r.systolic,
          diastolic: r.diastolic,
          pulse: r.pulse || undefined,
          recorded_at: r.recorded_at
        })),
        medications: medicationLogs.slice(0, 10).map(l => ({
          name: 'Medication', // You could join with medications data if needed
          dosage: 'N/A',
          status: l.status,
          date: l.date
        }))
      };

      const result = await analyzeHealthPatterns(data);
      setAiInsight(result);
      toast.success('AI Health Analysis Complete');
    } catch (error) {
      toast.error('AI Analysis failed. Please check your Gemini API key.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate trends data from real readings (last 7 days)
  const trendsData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { 
        day: days[d.getDay()], 
        date: d.toISOString().split('T')[0],
        value: 0,
        count: 0 
      };
    });

    bloodSugarReadings.forEach(reading => {
      const readingDate = new Date(reading.recorded_at).toISOString().split('T')[0];
      const dayData = last7Days.find(d => d.date === readingDate);
      if (dayData) {
        dayData.value += reading.value;
        dayData.count += 1;
      }
    });

    return last7Days.map(d => ({
      day: d.day,
      value: d.count > 0 ? Math.round(d.value / d.count) : 0
    }));
  }, [bloodSugarReadings]);

  const stability = calculateGlucoseStability();
  const adherence = calculateAdherenceRate();
  const latestBP = bloodPressureReadings[0];
  const bpValue = latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '--/--';

  const insights = [
    {
      title: 'Glucose Stability',
      value: `${stability}%`,
      label: stability > 80 ? 'Optimal' : 'Variable',
      description: stability > 80 
        ? 'Your glucose levels are highly stable within target range.' 
        : 'Targeted adjustments may help stabilize your glucose spikes.',
      icon: Droplets,
      color: 'text-[#004c56ff]',
      bg: 'bg-[#f0fdfaff]',
      status: stability > 80 ? 'stable' : 'improving'
    },
    {
      title: 'Blood Pressure',
      value: bpValue,
      label: 'Latest Reading',
      description: latestBP 
        ? `Last recorded on ${new Date(latestBP.recorded_at).toLocaleDateString()}.`
        : 'No recent readings recorded.',
      icon: Heart,
      color: 'text-red-500',
      bg: 'bg-red-50',
      status: 'stable'
    },
    {
      title: 'Medication Sync',
      value: `${adherence}%`,
      label: 'Adherence',
      description: adherence > 90 
        ? 'Excellent adherence! Keep following your therapy protocol.' 
        : 'Try setting more reminders to improve your adherence rate.',
      icon: Zap,
      color: 'text-[#006672ff]',
      bg: 'bg-slate-50',
      status: adherence > 90 ? 'peak' : 'stable'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 bg-[#f6fafacc] backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="h-6 w-1 bg-primary rounded-full" />
           <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Health Insights Protocol</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" className="rounded-xl h-10 px-4 font-bold text-slate-400 hover:text-primary">
              <Calendar size={16} className="mr-2" /> Last 30 Days
           </Button>
           <Link href="/profile">
             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
               <User size={18} />
             </div>
           </Link>
        </div>
      </header>

      <main className="px-10 py-10 max-w-7xl mx-auto space-y-10">
        {/* Top Insights Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {insights.map((insight, idx) => (
              <motion.div
                 key={idx}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: idx * 0.1 }}
              >
                 <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[24px] overflow-hidden">
                    <CardContent className="p-8">
                       <div className="flex items-start justify-between mb-6">
                          <div className={`w-12 h-12 rounded-2xl ${insight.bg} ${insight.color} flex items-center justify-center`}>
                             <insight.icon size={24} />
                          </div>
                          <div className="text-right">
                             <p className="text-2xl font-black text-slate-900 tracking-tight">{insight.value}</p>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">{insight.label}</p>
                          </div>
                       </div>
                       <h3 className="text-sm font-black text-slate-900 mb-2">{insight.title}</h3>
                       <p className="text-xs font-medium text-slate-400 leading-relaxed">{insight.description}</p>
                    </CardContent>
                 </Card>
              </motion.div>
           ))}
        </section>

        {/* Analytics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
           {/* Detailed Trend Chart */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-[#004c56ff] rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Longitudinal Trends</h3>
                 </div>
              </div>
              
              <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[32px] p-8">
                 <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={trendsData}>
                          <defs>
                             <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#004c56" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#004c56" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                             dataKey="day" 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                          />
                          <YAxis 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
                          />
                          <Tooltip 
                             contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                fontWeight: 'black'
                             }} 
                          />
                          <Area 
                             type="monotone" 
                             dataKey="value" 
                             stroke="#004c56" 
                             strokeWidth={4} 
                             fillOpacity={1} 
                             fill="url(#colorValue)" 
                          />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>

            {/* Pattern Analysis */}
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="h-6 w-1 bg-[#006672ff] rounded-full" />
                     <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Pattern Intelligence</h3>
                  </div>
                  {!aiInsight && (
                    <Button 
                      onClick={handleGenerateInsights} 
                      disabled={isAnalyzing}
                      className="rounded-xl bg-[#004c56ff] hover:bg-[#003a42] text-white font-black text-[10px] uppercase h-8 px-4"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Generate AI Audit'}
                    </Button>
                  )}
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-12 bg-white rounded-3xl shadow-lg border border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 text-center"
                    >
                      <div className="w-12 h-12 rounded-full border-4 border-[#004c56ff] border-t-transparent animate-spin" />
                      <div>
                        <p className="text-sm font-black text-slate-900">Consulting Gemini AI...</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Analyzing longitudinal markers</p>
                      </div>
                    </motion.div>
                  )}

                  {aiInsight ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      <div className={`p-6 rounded-3xl shadow-lg flex items-center justify-between group ${
                        aiInsight.type === 'warning' ? 'bg-orange-50 border border-orange-100' : 'bg-[#f0fdfaff] border border-[#d1f7efff]'
                      }`}>
                        <div className="flex items-center gap-5">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                             aiInsight.type === 'warning' ? 'bg-white text-orange-500' : 'bg-white text-primary'
                           }`}>
                              {aiInsight.type === 'warning' ? <TrendingUp size={20} /> : <Target size={20} />}
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900">{aiInsight.pattern}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Detected Pattern</p>
                           </div>
                        </div>
                        <Info size={16} className="text-slate-300" />
                      </div>

                      <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[24px] overflow-hidden">
                        <CardContent className="p-8">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">AI Explanation</h4>
                          <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6">
                            {aiInsight.explanation}
                          </p>
                          <div className="p-5 bg-[#004c56ff] rounded-2xl text-white">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap size={14} className="text-emerald-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Actionable Suggestion</span>
                            </div>
                            <p className="text-sm font-bold">{aiInsight.recommendation}</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Button 
                        variant="ghost" 
                        onClick={() => setAiInsight(null)}
                        className="w-full text-[10px] font-black uppercase text-slate-400 tracking-widest"
                      >
                        Reset Analysis
                      </Button>
                    </motion.div>
                  ) : !isAnalyzing && (
                    <>
                      <motion.div whileHover={{ x: 4 }} className="p-6 bg-white rounded-3xl shadow-lg shadow-slate-200/50 flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                           <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                              <TrendingUp size={20} />
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">Postprandial Spike</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Data Match</p>
                           </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-200 group-hover:text-primary transition-all" />
                      </motion.div>

                      <Card className="border-none bg-[#004c56ff] shadow-xl shadow-[#004c5633] rounded-[24px] overflow-hidden">
                        <CardContent className="p-8">
                           <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                 <Activity size={16} className="text-white" />
                              </div>
                              <h4 className="text-xs font-black uppercase text-white/60 tracking-widest">Health Projection</h4>
                           </div>
                            <p className="text-sm font-bold text-white leading-relaxed">
                               Run a real-time AI audit to see deep patterns in your recent readings and clinical adherence.
                            </p>
                            <Button 
                              variant="ghost" 
                              onClick={handleGenerateInsights}
                              className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white rounded-xl h-12 font-black text-xs"
                            >
                              Run Analysis Now
                            </Button>
                        </CardContent>
                      </Card>
                    </>
                  )}
               </div>
            </div>
        </section>
      </main>
    </div>
  );
};
