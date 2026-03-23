"use client";

import { useState, useMemo } from 'react';
import { Droplets, Heart, Plus, ChevronRight, CheckCircle2, Clock, Calendar, Activity, TrendingUp } from 'lucide-react';
import { useIsMobile, useIsTablet } from '@/hooks/use-media-query';
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
  userName,
}: DashboardScreenProps) => {
  const [addModal, setAddModal] = useState<'blood_sugar' | 'blood_pressure' | null>(null);
  const [editReading, setEditReading] = useState<{ type: 'blood_sugar' | 'blood_pressure'; reading: BloodSugarReading | BloodPressureReading } | null>(null);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isCompact = isMobile || isTablet;

  const today = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }), []);

  const todayLogs = medicationLogs.filter(log => {
    const logDate = new Date(log.date).toDateString();
    return logDate === new Date().toDateString();
  });

  const pendingMeds = todayLogs.filter(log => log.status === 'pending');
  const takenMeds = todayLogs.filter(log => log.status === 'taken');
  const totalMeds = todayLogs.length;
  const progressPercent = totalMeds > 0 ? (takenMeds.length / totalMeds) * 100 : 0;

  const latestBloodSugar = bloodSugarReadings[0];
  const latestBloodPressure = bloodPressureReadings[0];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      <Header
        title={getTimeBasedGreeting(userName)}
        subtitle={today}
        onNotificationsClick={onNotificationsClick}
        onSettingsClick={onSettingsClick}
      />

      <motion.main 
        variants={container}
        initial="hidden"
        animate="show"
        className="px-6 py-8 max-w-7xl mx-auto space-y-10"
      >
        {/* Daily Progress Section */}
        <motion.section variants={item} className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 overflow-hidden border-none shadow-xl shadow-slate-200/50 bg-white group">
            <CardContent className="p-0">
              <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-gradient-to-br from-white to-slate-50">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                    <Activity size={12} /> Daily Adherence
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Your health is our <br />
                    <span className="text-primary">top priority today.</span>
                  </h2>
                  <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                    You've completed {takenMeds.length} of {totalMeds} medications scheduled for today. Keep up the great work!
                  </p>
                </div>
                
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-slate-100"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * progressPercent) / 100}
                      className="text-primary transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-slate-900">{Math.round(progressPercent)}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Goal</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900 leading-none">{takenMeds.length}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Confirmed Taken</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:shadow-2xl hover:shadow-warning/5 transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning group-hover:scale-110 transition-transform">
                  <Clock size={28} />
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900 leading-none">{pendingMeds.length}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Awaiting Action</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section variants={item} className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
             <div className="h-6 w-1 bg-primary rounded-full" />
             <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Quick Actions</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => setAddModal('blood_sugar')}
              className="h-24 justify-start p-6 bg-white border-none shadow-lg shadow-slate-100/50 hover:shadow-primary/10 hover:bg-white group rounded-[2rem]"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Droplets size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Add Glucose</p>
                  <p className="text-[10px] text-slate-400">Log blood sugar levels</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setAddModal('blood_pressure')}
              className="h-24 justify-start p-6 bg-white border-none shadow-lg shadow-slate-100/50 hover:shadow-accent/10 hover:bg-white group rounded-[2rem]"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="h-12 w-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                  <Heart size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Add Pressure</p>
                  <p className="text-[10px] text-slate-400">Log blood pressure</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => onNavigate('medications')}
              className="h-24 justify-start p-6 bg-white border-none shadow-lg shadow-slate-100/50 hover:shadow-slate-200/20 hover:bg-white group rounded-[2rem] hidden sm:flex"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <Calendar size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Schedule</p>
                  <p className="text-[10px] text-slate-400">View full calendar</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setAddModal(null)}
              className="h-24 justify-start p-6 bg-white border-none shadow-lg shadow-slate-100/50 hover:shadow-slate-200/20 hover:bg-white group rounded-[2rem] hidden lg:flex"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <TrendingUp size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">Reports</p>
                  <p className="text-[10px] text-slate-400">Coming soon</p>
                </div>
              </div>
            </Button>
          </div>
        </motion.section>

        {/* Dynamic Content Grid */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Today's Medications */}
          <motion.section variants={item} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="h-6 w-1 bg-primary rounded-full" />
                 <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Today's Protocol</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('medications')}
                className="text-xs font-bold text-primary hover:bg-primary/5 uppercase tracking-tighter"
              >
                Expand <ChevronRight size={14} className="ml-1" />
              </Button>
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
                <Card className="border-none bg-success/5 shadow-none p-10 text-center rounded-[2rem]">
                  <CheckCircle2 size={48} className="text-success mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-bold text-success">Protocol Complete</h4>
                  <p className="text-xs text-success/70 mt-1 max-w-[200px] mx-auto">All scheduled medications for today have been confirmed.</p>
                </Card>
              )}
            </div>
          </motion.section>

          {/* Latest Vitals */}
          <motion.section variants={item} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="h-6 w-1 bg-accent rounded-full" />
                 <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Vitals Status</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('readings')}
                className="text-xs font-bold text-accent hover:bg-accent/5 uppercase tracking-tighter"
              >
                Analytics <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>

            <div className="space-y-4">
              {latestBloodSugar || latestBloodPressure ? (
                <>
                  {latestBloodSugar && (
                    <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <BloodSugarCard
                        reading={latestBloodSugar}
                        showActions={!isMobile}
                        compact={isCompact}
                        onEdit={(reading) => setEditReading({ type: 'blood_sugar', reading })}
                        onDelete={onDeleteBloodSugar}
                      />
                    </motion.div>
                  )}
                  {latestBloodPressure && (
                    <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <BloodPressureCard
                        reading={latestBloodPressure}
                        showActions={!isMobile}
                        compact={isCompact}
                        onEdit={(reading) => setEditReading({ type: 'blood_pressure', reading })}
                        onDelete={onDeleteBloodPressure}
                      />
                    </motion.div>
                  )}
                </>
              ) : (
                <Card className="border-none bg-slate-100 shadow-none p-10 text-center rounded-[2rem]">
                  <Activity size={48} className="text-slate-300 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-slate-400">No Vitals Logged</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Start by adding your first reading using the quick actions above.</p>
                </Card>
              )}
            </div>
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
