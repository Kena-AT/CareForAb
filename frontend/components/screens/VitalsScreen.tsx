"use client";

import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  Heart, 
  Droplets, 
  ChevronRight, 
  Loader2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReadings } from '@/hooks/useReadings';
import { QuickAddModal } from '@/components/health/QuickAddModal';
import { analyzeBloodPressure } from '@/services/gemini';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export const VitalsScreen = () => {
  const { 
    bloodSugarReadings, 
    bloodPressureReadings, 
    activityReadings,
    addBloodSugarReading,
    addBloodPressureReading,
    isLoading
  } = useReadings();

  const [activeVital, setActiveVital] = useState<'blood_sugar' | 'blood_pressure' | 'heart_rate' | 'steps'>('blood_sugar');


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
    }))).then((res: any) => {
      setBpAnalysis(res);
    }).catch(() => {
      // Fail silently - don't disrupt UI if AI is unavailable
    }).finally(() => setIsBpLoading(false));
  }, [bloodPressureReadings, bpAnalysis]);

  // Chart data processing based on activeVital
  const chartData = useMemo(() => {
    switch (activeVital) {
      case 'blood_sugar':
        return [...bloodSugarReadings]
          .reverse()
          .slice(-10)
          .map(r => ({
            time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: r.value,
          }));
      case 'blood_pressure':
        return [...bloodPressureReadings]
          .reverse()
          .slice(-10)
          .map(r => ({
            time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            systolic: r.systolic,
            diastolic: r.diastolic,
          }));
      case 'heart_rate':
        return [...bloodPressureReadings]
          .filter(r => r.pulse)
          .reverse()
          .slice(-10)
          .map(r => ({
            time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: r.pulse,
          }));
      case 'steps':
        return [...activityReadings]
          .reverse()
          .slice(-7)
          .map(r => ({
            time: new Date(r.date).toLocaleDateString([], { weekday: 'short' }),
            value: r.steps,
          }));
      default:
        return [];
    }
  }, [activeVital, bloodSugarReadings, bloodPressureReadings, activityReadings]);

  const latestGlucose = bloodSugarReadings[0];
  const latestBP = bloodPressureReadings[0];
  const latestSteps = activityReadings[0];

  const vitalConfig = {
    blood_sugar: { label: 'Blood Sugar', color: '#004c56', unit: 'mg/dL', icon: Droplets },
    blood_pressure: { label: 'Blood Pressure', color: '#f43f5e', unit: 'mmHg', icon: Heart },
    heart_rate: { label: 'Heart Rate', color: '#f59e0b', unit: 'BPM', icon: Activity },
    steps: { label: 'Steps', color: '#10b981', unit: 'Steps', icon: Activity },
  };

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      <Header title="Health Readings" subtitle="Vitals" />

      <main className="px-10 py-10 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Chart Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-8 space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
               <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Vitals Overview</h2>
                  <div className="flex items-center gap-2">
                     <Select value={activeVital} onValueChange={(val: any) => setActiveVital(val)}>
                        <SelectTrigger className="w-[180px] h-9 bg-white border-slate-100 rounded-xl font-bold text-xs ring-0 focus:ring-0">
                           <SelectValue placeholder="Select Vital" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                           <SelectItem value="blood_sugar" className="text-xs font-bold py-3"><div className="flex items-center gap-2"><Droplets size={14} className="text-[#004c56]" /> Blood Sugar</div></SelectItem>
                           <SelectItem value="blood_pressure" className="text-xs font-bold py-3"><div className="flex items-center gap-2"><Heart size={14} className="text-rose-500" /> Blood Pressure</div></SelectItem>
                           <SelectItem value="heart_rate" className="text-xs font-bold py-3"><div className="flex items-center gap-2"><Activity size={14} className="text-amber-500" /> Heart Rate</div></SelectItem>
                           <SelectItem value="steps" className="text-xs font-bold py-3"><div className="flex items-center gap-2"><Activity size={14} className="text-emerald-500" /> Active Steps</div></SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>
               <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: vitalConfig[activeVital].color }} />
                     <span className="text-[10px] font-black uppercase text-slate-600">{vitalConfig[activeVital].label} Trend</span>
                  </div>
               </div>
            </div>

            <Card className="border-none bg-white shadow-2xl shadow-slate-200/40 rounded-[40px] p-10 h-[480px]">
               <ResponsiveContainer width="100%" height="100%">
                  {activeVital === 'blood_pressure' ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px 24px' }}
                        itemStyle={{ fontWeight: 900 }}
                      />
                      <Line type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={4} dot={{ fill: '#f43f5e', r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="diastolic" stroke="#fb7185" strokeWidth={4} dot={{ fill: '#fb7185', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={vitalConfig[activeVital].color} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={vitalConfig[activeVital].color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px 24px' }}
                        itemStyle={{ fontWeight: 900, color: '#0f172a' }}
                      />
                      <Area type="monotone" dataKey="value" stroke={vitalConfig[activeVital].color} strokeWidth={6} fillOpacity={1} fill="url(#colorValue)" animationDuration={1500} />
                    </AreaChart>
                  )}
               </ResponsiveContainer>
            </Card>

            <div className="flex items-center justify-between px-2">
                <Button 
                   onClick={() => { setModalType('blood_sugar'); setIsAddModalOpen(true); }}
                   className="bg-[#004c56ff] hover:bg-[#003a42] text-white rounded-[20px] h-12 px-6 font-black flex items-center gap-3 shadow-xl shadow-[#004c5633]"
                >
                   <Droplets size={18} /> Log Glucose
                </Button>
                <Button 
                   onClick={() => { setModalType('blood_pressure'); setIsAddModalOpen(true); }}
                   className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-100 rounded-[20px] h-12 px-6 font-black flex items-center gap-3"
                >
                   <Heart size={18} /> Log Pressure
                </Button>
            </div>
          </motion.div>

          {/* Recent Readings */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 space-y-6"
          >
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Clinical History</h3>
               <Button variant="ghost" size="sm" className="text-xs font-black text-primary p-0 h-auto hover:bg-transparent">Archive</Button>
            </div>

            <div className="space-y-4">
               {activeVital === 'blood_sugar' ? (
                 bloodSugarReadings.slice(0, 5).map((reading, idx) => (
                    <motion.div key={reading.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="p-5 bg-white rounded-[24px] shadow-lg shadow-slate-200/40 border border-slate-50 flex items-center justify-between transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#f0fdfaff] text-[#004c56ff] flex items-center justify-center">
                             <Droplets size={20} />
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                <p className="text-lg font-black text-slate-900 leading-none">{reading.value}</p>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">mg/dL</span>
                             </div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                                {new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {reading.meal_type || 'General'}
                              </p>
                          </div>
                       </div>
                    </motion.div>
                 ))
               ) : activeVital === 'blood_pressure' ? (
                 bloodPressureReadings.slice(0, 5).map((reading, idx) => (
                    <motion.div key={reading.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="p-5 bg-white rounded-[24px] shadow-lg shadow-slate-200/40 border border-slate-50 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                             <Heart size={20} />
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                <p className="text-lg font-black text-slate-900 leading-none">{reading.systolic}/{reading.diastolic}</p>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">mmHg</span>
                             </div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                                {new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {reading.pulse ? `${reading.pulse} BPM` : 'No Pulse'}
                              </p>
                          </div>
                       </div>
                    </motion.div>
                 ))
               ) : activeVital === 'heart_rate' ? (
                  bloodPressureReadings.filter(r => r.pulse).slice(0, 5).map((reading, idx) => (
                    <motion.div key={reading.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="p-5 bg-white rounded-[24px] shadow-lg shadow-slate-200/40 border border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                            <Activity size={20} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                               <p className="text-lg font-black text-slate-900 leading-none">{reading.pulse}</p>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">BPM</span>
                            </div>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                               {new Date(reading.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Resting
                             </p>
                         </div>
                      </div>
                    </motion.div>
                  ))
               ) : (
                  activityReadings.slice(0, 5).map((reading, idx) => (
                    <motion.div key={reading.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="p-5 bg-white rounded-[24px] shadow-lg shadow-slate-200/40 border border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                            <Activity size={20} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                               <p className="text-lg font-black text-slate-900 leading-none">{reading.steps.toLocaleString()}</p>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Steps</span>
                            </div>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                               {new Date(reading.date).toLocaleDateString([], { weekday: 'long' })} • Today
                             </p>
                         </div>
                      </div>
                    </motion.div>
                  ))
               )}
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
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">CareForAb AI Analysis</span>
                  </div>
                  {isBpLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 size={20} className="animate-spin opacity-60" />
                      <span className="text-xs font-bold opacity-60">Processing vitals...</span>
                    </div>
                  ) : bpAnalysis && activeVital === 'blood_pressure' ? (
                    <>
                      <h4 className="text-xl font-black mb-2 tracking-tight">{bpAnalysis.headline}</h4>
                      <p className="text-xs font-bold leading-relaxed opacity-70">{bpAnalysis.detail}</p>
                    </>
                  ) : (
                    <>
                      <h4 className="text-xl font-black mb-2 tracking-tight">Active Monitoring</h4>
                      <p className="text-xs font-bold leading-relaxed opacity-60">Switch to Blood Pressure to see AI insights on your cardiovascular patterns.</p>
                    </>
                  )}
               </div>
            </Card>
          </motion.div>
        </div>

        {/* Dynamic Insights Snapshot */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
           {[
              { 
                title: 'Daily Protocol', 
                value: latestGlucose?.value || '--', 
                label: 'Blood Glucose',
                icon: Droplets,
                color: 'text-[#004c56ff]',
                bg: 'bg-[#f0fdfaff]',
                meta: latestGlucose?.meal_type || 'Latest'
              },
              { 
                title: 'Pressures', 
                value: latestBP ? `${latestBP.systolic}/${latestBP.diastolic}` : '--/--', 
                label: 'Systemic Pulse',
                icon: Heart,
                color: 'text-rose-500',
                bg: 'bg-rose-50',
                meta: latestBP?.pulse ? `${latestBP.pulse} BPM` : 'N/A'
              },
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
