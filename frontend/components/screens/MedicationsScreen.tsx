"use client";

import { useState, useMemo } from 'react';
import { Plus, Pill, Edit, Trash2, MoreVertical, Calendar, Clock, CheckCircle2, AlertCircle, ChevronRight, Bell, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { MedicationCard } from '@/components/health/MedicationCard';
import { AddMedicationModal } from '@/components/health/AddMedicationModal';
import { EditMedicationModal } from '@/components/health/EditMedicationModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Medication, MedicationLog } from '@/types/health';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface MedicationsScreenProps {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  onMarkMedicationTaken: (logId: string) => void;
  onAddMedication: (medication: Omit<Medication, 'id' | 'created_at' | 'is_active'>) => Promise<any>;
  onUpdateMedication?: (medicationId: string, updates: Partial<Medication>) => Promise<any>;
  onDeleteMedication?: (medicationId: string) => Promise<void>;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
}

export const MedicationsScreen = ({
  medications,
  medicationLogs,
  onMarkMedicationTaken,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onNotificationsClick,
  onSettingsClick,
}: MedicationsScreenProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [view, setView] = useState<'schedule' | 'all'>('schedule');

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = useMemo(() => {
    return medicationLogs
      .filter(log => log.date === today)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [medicationLogs, today]);

  // Animation variants
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } };

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      {/* Header - Design ruQjr */}
      <header className="sticky top-0 z-40 h-16 bg-[#f6fafacc] backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="h-6 w-1 bg-primary rounded-full" />
           <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Therapeutic Protocol</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={onNotificationsClick} className="w-10 h-10 rounded-xl hover:bg-slate-50 group">
             <Bell size={18} className="text-slate-500 group-hover:text-primary transition-colors" />
           </Button>
           <Link href="/profile">
             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
               <User size={18} />
             </div>
           </Link>
        </div>
      </header>
      
      <main className="px-10 py-10 max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex bg-white p-1 rounded-[20px] border border-slate-100 shadow-sm">
            <button
              onClick={() => setView('schedule')}
              className={`px-8 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-wider transition-all ${
                view === 'schedule' 
                ? 'bg-[#f0fdfaff] text-primary shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Daily Schedule
            </button>
            <button
              onClick={() => setView('all')}
              className={`px-8 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-wider transition-all ${
                view === 'all' 
                ? 'bg-[#f0fdfaff] text-primary shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              All Medications
            </button>
          </div>

          <Button 
            onClick={() => setShowAddModal(true)}
            className="rounded-[20px] h-12 px-8 font-black bg-[#004c56ff] hover:bg-[#003a42] text-white shadow-lg shadow-[#004c5633]"
          >
            <Plus size={18} className="mr-2" /> New Medication
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {view === 'schedule' ? (
            <motion.section
              key="schedule"
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-6 w-1 bg-primary rounded-full" />
                 <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Active Timeline</h3>
              </div>

              {todayLogs.length > 0 ? (
                <div className="relative space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {todayLogs.map((log) => {
                    const medication = medications.find(m => m.id === log.medication_id);
                    if (!medication) return null;
                    const isTaken = log.status === 'taken';

                    return (
                      <motion.div key={log.id} variants={item} className="relative pl-12">
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm ${
                          isTaken ? 'bg-success text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isTaken ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        </div>
                        
                        <MedicationCard
                          medication={medication}
                          log={log}
                          onMarkTaken={onMarkMedicationTaken}
                          showActions={true}
                          onEdit={onUpdateMedication ? (med) => setEditingMedication(med) : undefined}
                          onDelete={onDeleteMedication}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-none bg-white shadow-xl shadow-slate-200/50 p-12 text-center rounded-[20px]">
                  <CardContent className="p-0 space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Calendar size={40} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 leading-none">Your schedule is empty</h4>
                      <p className="text-sm text-slate-400 max-w-[280px] mx-auto mt-2">
                        You have no medications scheduled for today.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.section>
          ) : (
            <motion.section
              key="all"
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-6 w-1 bg-primary rounded-full" />
                 <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Medication Inventory</h3>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {medications.length > 0 ? (
                  medications.map((medication) => (
                    <motion.div key={medication.id} variants={item} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group rounded-[20px] hover:shadow-2xl transition-all">
                        <CardContent className="p-6 space-y-6">
                          <div className="flex items-start justify-between">
                            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                              <Pill size={28} />
                            </div>
                            {onUpdateMedication && onDeleteMedication && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-50">
                                    <MoreVertical size={16} className="text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl">
                                  <DropdownMenuItem onClick={() => setEditingMedication(medication)} className="font-black text-xs p-3 cursor-pointer">
                                    <Edit className="h-4 w-4 mr-2 text-slate-400" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => onDeleteMedication(medication.id)}
                                    className="text-destructive font-black text-xs p-3 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Archive Medication
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">{medication.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{medication.dosage}</p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-50">
                             <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] mb-3">Protocol</p>
                             <div className="flex flex-wrap gap-2">
                                {medication.times.map((time, i) => (
                                   <span key={i} className="px-3 py-1.5 rounded-lg bg-[#f0fdfaff] text-primary text-[10px] font-black">
                                      {time}
                                   </span>
                                ))}
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                     <Card className="border-none bg-white shadow-xl shadow-slate-200/50 p-12 text-center rounded-[2.5rem]">
                        <CardContent className="p-0 space-y-4">
                          <Pill size={48} className="text-slate-200 mx-auto" />
                          <h4 className="text-xl font-bold text-slate-900">No medications added</h4>
                          <Button onClick={() => setShowAddModal(true)} className="mt-4 rounded-xl px-8 font-bold">Add Medication</Button>
                        </CardContent>
                     </Card>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {showAddModal && (
        <AddMedicationModal
          onClose={() => setShowAddModal(false)}
          onAdd={onAddMedication}
        />
      )}

      {editingMedication && onUpdateMedication && (
        <EditMedicationModal
          medication={editingMedication}
          onClose={() => setEditingMedication(null)}
          onUpdate={onUpdateMedication}
        />
      )}
    </div>
  );
};
