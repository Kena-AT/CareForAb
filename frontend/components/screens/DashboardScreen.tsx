"use client";

import { useState, useMemo } from 'react';
import { Droplets, Heart, Plus, ChevronRight, CheckCircle2, Clock, Calendar, Activity, TrendingUp, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-media-query';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { MedicationCard } from '@/components/health/MedicationCard';
import { BloodSugarCard, BloodPressureCard } from '@/components/health/ReadingCard';
import { QuickAddModal } from '@/components/health/QuickAddModal';
import { EditReadingModal } from '@/components/health/EditReadingModal';
import { Medication, MedicationLog, BloodSugarReading, BloodPressureReading } from '@/types/health';
import { motion } from 'framer-motion';

interface DashboardScreenProps {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  bloodSugarReadings: BloodSugarReading[];
  bloodPressureReadings: BloodPressureReading[];
  onMarkMedicationTaken: (logId: string) => void;
  onAddBloodSugar: (reading: Omit<BloodSugarReading, 'id' | 'recorded_at'>) => void;
  onAddBloodPressure: (reading: Omit<BloodPressureReading, 'id' | 'recorded_at'>) => void;
  onUpdateBloodSugar?: (readingId: string, updates: Partial<Omit<BloodSugarReading, 'id' | 'recorded_at'>>) => Promise<void>;
  onDeleteBloodSugar?: (readingId: string) => Promise<void>;
  onUpdateBloodPressure?: (readingId: string, updates: Partial<Omit<BloodPressureReading, 'id' | 'recorded_at'>>) => Promise<void>;
  onDeleteBloodPressure?: (readingId: string) => Promise<void>;
  onNavigate: (tab: 'medications' | 'readings') => void;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  pulse?: number | null;
  oxygen?: number | null;
  steps?: number | null;
  healthScore?: number | null;
  adherenceStreak?: number | null;
  userName?: string | null;
}

export const DashboardScreen = ({
  medications,
  medicationLogs,
  bloodSugarReadings,
  bloodPressureReadings,
  onMarkMedicationTaken,
  onAddBloodSugar,
  onAddBloodPressure,
  onUpdateBloodSugar,
  onDeleteBloodSugar,
  onUpdateBloodPressure,
  onDeleteBloodPressure,
  onNavigate,
  onNotificationsClick,
  onSettingsClick,
  pulse,
  oxygen,
  steps,
  healthScore,
  adherenceStreak,
  userName,
}: DashboardScreenProps) => {
  const [addModal, setAddModal] = useState<'blood_sugar' | 'blood_pressure' | null>(null);
  const [editReading, setEditReading] = useState<{ type: 'blood_sugar' | 'blood_pressure'; reading: BloodSugarReading | BloodPressureReading } | null>(null);

  const isMobile = useIsMobile();

  const today = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }), []);

  const todayLogs = medicationLogs.filter(log => {
    const logDate = new Date(log.date).toDateString();
    return logDate === new Date().toDateString();
  });

  const pendingMeds = todayLogs.filter(log => log.status === 'pending');
  const takenMeds = todayLogs.filter(log => log.status === 'taken');

  // Animation variants
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      <Header 
        title={today} 
        onSettingsClick={onSettingsClick}
      />

      <motion.main 
        variants={container}
        initial="hidden"
        animate="show"
        className="px-10 py-10 max-w-7xl mx-auto space-y-10"
      >
        {/* Section - Greeting & Hero Vitals (Node P6Lci) */}
        <motion.section variants={item} className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
           <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                {getTimeBasedGreeting(userName)}
              </h2>
              <p className="text-slate-500 font-medium">Your healthcare journey is on track today.</p>
           </div>
           
           {/* Quick Actions Bento (Node uGV5t) */}
           <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => setAddModal('blood_sugar')}
                className="bg-[#004c56ff] hover:bg-[#003a42] text-white rounded-[20px] h-14 px-8 font-black flex items-center gap-4 shadow-xl shadow-[#004c5633]"
              >
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                   <Droplets size={20} />
                </div>
                Log Glucose
              </Button>
              <Button 
                onClick={() => setAddModal('blood_pressure')}
                className="bg-[#dfe3e3ff] hover:bg-[#d0d6d6] text-slate-700 rounded-[20px] h-14 px-8 font-black flex items-center gap-4"
              >
                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-slate-700 shadow-sm">
                   <Heart size={20} />
                </div>
                Log Pressure
              </Button>
           </div>
        </motion.section>

        {/* Section - Vitals Grid (Asymmetric) (Node pGk07) */}
        <motion.section variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 h-auto lg:h-[192px]">
           {/* Vitals Card: Heart Rate (Node m1xXk) */}
           <Card className="lg:col-span-1 border-none bg-white shadow-xl shadow-slate-200/50 rounded-[20px] p-6 flex flex-col justify-between group hover:shadow-2xl transition-all h-full">
              <div className="flex items-start justify-between">
                 <div className="p-3 rounded-2xl bg-red-50 text-red-500 group-hover:scale-110 transition-transform">
                    <Heart size={24} />
                 </div>
                 <TrendingUp size={16} className="text-success opacity-50" />
              </div>
              <div>
                 <p className="text-3xl font-black text-slate-900 leading-none">{pulse ?? '--'}</p>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-2">Heart Rate (Avg)</p>
              </div>
           </Card>

           {/* Vitals Card: Blood Oxygen (Node B7ANj) */}
           <Card className="lg:col-span-1 border-none bg-white shadow-xl shadow-slate-200/50 rounded-[20px] p-6 flex flex-col justify-between group hover:shadow-2xl transition-all h-full">
              <div className="flex items-start justify-between">
                 <div className="p-3 rounded-2xl bg-info/10 text-info group-hover:scale-110 transition-transform">
                    <Droplets size={24} />
                 </div>
                 <CheckCircle2 size={16} className="text-success opacity-50" />
              </div>
              <div>
                 <p className="text-3xl font-black text-slate-900 leading-none">{oxygen !== null && oxygen !== undefined ? `${oxygen}%` : '--'}</p>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-2">Blood Oxygen</p>
              </div>
           </Card>

           {/* Vitals Card: Activity/Steps */}
           <Card className="lg:col-span-1 border-none bg-white shadow-xl shadow-slate-200/50 rounded-[20px] p-6 flex flex-col justify-between group hover:shadow-2xl transition-all h-full">
              <div className="flex items-start justify-between">
                 <div className="p-3 rounded-2xl bg-orange-50 text-orange-500 group-hover:scale-110 transition-transform">
                    <Activity size={24} />
                 </div>
                 <TrendingUp size={16} className="text-success opacity-50" />
              </div>
              <div>
                 <p className="text-3xl font-black text-slate-900 leading-none">{steps !== null && steps !== undefined ? steps.toLocaleString() : '--'}</p>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mt-2">Active Steps</p>
              </div>
           </Card>

           {/* Medication Summary Bento (Node xeIj5) */}
           <Card className="lg:col-span-2 border-none bg-[#006672ff] shadow-xl shadow-[#00667233] rounded-[20px] p-8 text-white relative overflow-hidden group hover:shadow-2xl transition-all">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-125 transition-transform" />
              <div className="relative z-10 flex flex-col justify-between h-full">
                 <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-white/10 text-white">
                       <ClipboardList size={28} />
                    </div>
                    <div>
                       <h4 className="text-xl font-black leading-tight">Daily Protocol</h4>
                       <p className="text-xs text-white/70 font-medium">Keep up the great adherence!</p>
                    </div>
                 </div>
                 <div className="flex items-end justify-between gap-4">
                    <div className="flex items-end gap-2">
                       <span className="text-5xl font-black leading-none">{takenMeds.length}</span>
                       <span className="text-sm font-bold opacity-70 mb-1">/ {todayLogs.length} Taken</span>
                    </div>
                    <Button 
                      onClick={() => onNavigate('medications')}
                      className="bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs"
                    >
                      View Protocol <ChevronRight size={14} className="ml-1" />
                    </Button>
                 </div>
              </div>
           </Card>
        </motion.section>

        {/* Bottom Section: Schedule & Activity (Node dc6AA) */}
        <div className="grid lg:grid-cols-3 gap-10">
           {/* Today's Schedule (Node 29CXS) */}
           <motion.section variants={item} className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Therapeutic Schedule</h3>
                 </div>
              </div>

              <div className="space-y-4">
                {pendingMeds.length > 0 ? (
                  pendingMeds.slice(0, 3).map((log) => {
                    const medication = medications.find(m => m.id === log.medication_id);
                    if (!medication) return null;
                    return (
                      <motion.div key={log.id} whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <MedicationCard
                          medication={medication}
                          log={log}
                          onMarkTaken={onMarkMedicationTaken}
                        />
                      </motion.div>
                    );
                  })
                ) : (
                  <Card className="border-none bg-slate-50/50 border border-slate-100 p-12 text-center rounded-[2.5rem]">
                    <CheckCircle2 size={48} className="text-success mx-auto mb-4 opacity-30" />
                    <h4 className="text-lg font-bold text-slate-400">All Medications Taken</h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-[200px] mx-auto">No pending items for this timeframe.</p>
                  </Card>
                )}
              </div>
           </motion.section>

           {/* Insights Snapshot (Node smKkl) */}
           <motion.section variants={item} className="space-y-6">
              <div className="flex items-center gap-2">
                 <div className="h-6 w-1 bg-accent rounded-full" />
                 <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Insights Overview</h3>
              </div>

              <Card className="border-none bg-[#f0f4f4ff] rounded-[20px] p-6 space-y-6 flex-1 h-full min-h-[300px]">
                 <div className="space-y-4">
                    <div className="p-4 bg-white rounded-2xl shadow-sm">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Health Score</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{healthScore !== null && healthScore !== undefined ? `${healthScore}/100` : '--/100'}</p>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${healthScore ?? 0}%` }} />
                        </div>
                     </div>
                     
                     <div className="p-4 bg-white rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Adherence Streak</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{adherenceStreak !== null && adherenceStreak !== undefined ? `${adherenceStreak} Days` : '-- Days'}</p>
                        {adherenceStreak ? <p className="text-[10px] text-success font-bold mt-1">Keep it up!</p> : <p className="text-[10px] text-slate-400 font-bold mt-1">Start tracking!</p>}
                     </div>

                    <div className="p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-between group cursor-pointer overflow-hidden relative">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform" />
                       <div className="relative z-10">
                          <p className="text-[10px] font-black uppercase text-white/60 tracking-wider">Recommendations</p>
                          <p className="text-xs font-bold mt-1">Check weekly insights</p>
                       </div>
                       <ChevronRight size={20} className="relative z-10 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </div>
                 </div>
              </Card>
           </motion.section>
        </div>
      </motion.main>

      {addModal && (
        <QuickAddModal
          type={addModal}
          onClose={() => setAddModal(null)}
          onAddBloodSugar={onAddBloodSugar}
          onAddBloodPressure={onAddBloodPressure}
        />
      )}

      {editReading && onUpdateBloodSugar && onUpdateBloodPressure && onDeleteBloodSugar && onDeleteBloodPressure && (
        <EditReadingModal
          type={editReading.type}
          reading={editReading.reading}
          onClose={() => setEditReading(null)}
          onUpdate={editReading.type === 'blood_sugar' ? onUpdateBloodSugar : onUpdateBloodPressure}
          onDelete={editReading.type === 'blood_sugar' ? onDeleteBloodSugar : onDeleteBloodPressure}
        />
      )}
    </div>
  );
};
