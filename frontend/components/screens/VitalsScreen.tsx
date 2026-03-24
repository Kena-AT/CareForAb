"use client";

import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  Heart, 
  Droplets, 
  Wind, 
  Plus, 
  ChevronRight, 
  Calendar,
  User,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { useHealth } from '@/contexts/HealthContext';
import { QuickAddModal } from '@/components/health/QuickAddModal';
import { analyzeBloodPressure } from '@/services/gemini';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const VitalsScreen = () => {
  const { 
    bloodSugarReadings, 
    bloodPressureReadings, 
    oxygenReadings,
    addBloodSugarReading,
    addBloodPressureReading
  } = useHealth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'blood_sugar' | 'blood_pressure'>('blood_sugar');
  const [bpAnalysis, setBpAnalysis] = useState<{
    headline: string; detail: string; status: 'stable' | 'warning' | 'critical'
  } | null>(null);
  const [isBpLoading, setIsBpLoading] = useState(false);

  // Auto-generate BP analysis when data is loaded
  useEffect(() => {
    if (bloodPressureReadings.length === 0 || bpAnalysis) return;
    setIsBpLoading(true);
    analyzeBloodPressure(bloodPressureReadings.map(r => ({
      systolic: r.systolic,
      diastolic: r.diastolic,
      pulse: r.pulse ?? undefined,
      recorded_at: r.recorded_at
    }))).then(res => {
      setBpAnalysis(res);
    }).catch(() => {
      // Fail silently - don't disrupt UI if AI is unavailable
    }).finally(() => setIsBpLoading(false));
  }, [bloodPressureReadings]);

  // Chart data processing
  const chartData = useMemo(() => {
    return [...bloodSugarReadings]
      .reverse()
      .slice(-14)
      .map(r => ({
        time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: r.value,
        status: r.value > 140 ? 'High' : r.value < 70 ? 'Low' : 'Target'
      }));
  }, [bloodSugarReadings]);

  const latestGlucose = bloodSugarReadings[0];
  const latestBP = bloodPressureReadings[0];
  const latestOxygen = oxygenReadings[0];

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      <Header title="Health Readings" subtitle="Vitals" />

      <main className="px-10 py-10 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Chart Section - Editorial Large */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-8 space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Longitudinal Stability</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Glucose Trend Analysis</p>
               </div>
               <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                     <div className="w-2 h-2 rounded-full bg-[#004c56ff]" />
                     <span className="text-[10px] font-black uppercase text-slate-600">Blood Sugar</span>
                  </div>
               </div>
            </div>

            <Card className="border-none bg-white shadow-2xl shadow-slate-200/40 rounded-[40px] p-10 h-[480px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#004c56" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#004c56" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                       dataKey="time" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                       dy={10}
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                       dx={-10}
                    />
                    <Tooltip 
                       contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                          padding: '16px 24px'
                       }} 
                       itemStyle={{ fontWeight: 900, color: '#0f172a' }}
                    />
                    <Area 
                       type="monotone" 
                       dataKey="value" 
                       stroke="#004c56" 
                       strokeWidth={6} 
                       fillOpacity={1} 
                       fill="url(#colorValue)" 
                       animationDuration={2000}
                    />
                  </AreaChart>
               </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Recent Readings - Vertical Accent */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 space-y-6"
          >
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Latest Logs</h3>
               <Button variant="ghost" size="sm" className="text-xs font-black text-primary p-0 h-auto hover:bg-transparent">See All</Button>
            </div>

            <div className="space-y-4">
               {bloodSugarReadings.slice(0, 5).map((reading, idx) => (
                  <motion.div
                    key={reading.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-5 bg-white rounded-[24px] shadow-lg shadow-slate-200/40 border border-slate-50 flex items-center justify-between group hover:border-[#004c5633] transition-all"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#f0fdfaff] text-[#004c56ff] flex items-center justify-center font-black">
                           <Droplets size={20} />
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                              <p className="text-lg font-black text-slate-900 leading-none">{reading.value}</p>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">mg/dL</span>
                           </div>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                              {new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {reading.meal_type}
                           </p>
                        </div>
                     </div>
                     <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        reading.value > 140 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'
                     }`}>
                        {reading.value > 140 ? 'Abnormal' : 'Stable'}
                     </div>
                  </motion.div>
               ))}
            </div>

            <Card className="border-none bg-[#004c56ff] shadow-xl shadow-[#004c5633] rounded-[32px] p-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Activity size={80} />
               </div>
               <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                        <Heart size={16} />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Heart Health · AI</span>
                  </div>
                  {isBpLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 size={20} className="animate-spin opacity-60" />
                      <span className="text-xs font-bold opacity-60">Analyzing BP patterns...</span>
                    </div>
                  ) : bpAnalysis ? (
                    <>
                      <h4 className="text-xl font-black mb-2 tracking-tight">{bpAnalysis.headline}</h4>
                      <p className="text-xs font-bold leading-relaxed opacity-70">{bpAnalysis.detail}</p>
                      <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        bpAnalysis.status === 'stable' ? 'bg-emerald-400/20 text-emerald-300' :
                        bpAnalysis.status === 'warning' ? 'bg-amber-400/20 text-amber-300' :
                        'bg-red-400/20 text-red-300'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {bpAnalysis.status}
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-xl font-black mb-2 tracking-tight">Vascular Analysis</h4>
                      <p className="text-xs font-bold leading-relaxed opacity-60">Log blood pressure readings to enable AI-powered cardiovascular analysis.</p>
                    </>
                  )}
               </div>
            </Card>
          </motion.div>
        </div>

        {/* Tonal Layering Insights - Bottom Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
           {[
              { 
                title: 'Glucose Status', 
                value: latestGlucose?.value || '--', 
                label: 'Stable Range',
                icon: Droplets,
                color: 'text-[#004c56ff]',
                bg: 'bg-[#f0fdfaff]',
                meta: latestGlucose?.meal_type || 'N/A'
              },
              { 
                title: 'Blood Pressure', 
                value: latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '--/--', 
                label: 'Systemic Pressure',
                icon: Heart,
                color: 'text-rose-500',
                bg: 'bg-rose-50',
                meta: latestBP?.pulse ? `${latestBP.pulse} BPM` : 'No Pulse Data'
              },
              { 
                title: 'Oxygen Level', 
                value: `${latestOxygen?.value || '--'}%`, 
                label: 'Saturation',
                icon: Wind,
                color: 'text-indigo-500',
                bg: 'bg-indigo-50',
                meta: 'Optimal'
              }
           ].map((stat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className={`${stat.bg} ${stat.color} p-8 rounded-[40px] flex flex-col justify-between h-56 transition-all duration-300 border border-white`}
              >
                 <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center">
                       <stat.icon size={24} />
                    </div>
                    <div className="text-right">
                       <p className="text-3xl font-black leading-none">{stat.value}</p>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-2">{stat.label}</p>
                    </div>
                 </div>
                 <div className="flex items-center justify-between">
                    <div>
                       <h4 className="text-sm font-black text-slate-900 opacity-80">{stat.title}</h4>
                       <p className="text-[10px] font-bold uppercase opacity-60">{stat.meta}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center">
                       <ChevronRight size={14} />
                    </div>
                 </div>
              </motion.div>
           ))}
        </section>
      </main>

      {isAddModalOpen && (
        <QuickAddModal
          type={modalType}
          onClose={() => setIsAddModalOpen(false)}
          onAddBloodSugar={addBloodSugarReading}
          onAddBloodPressure={addBloodPressureReading}
        />
      )}
    </div>
  );
};
