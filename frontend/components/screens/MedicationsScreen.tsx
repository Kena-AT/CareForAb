
"use client";

import { useState, useMemo } from 'react';
import { Plus, Pill, MoreVertical, Clock, CheckCircle2, AlertCircle, Sun, Moon, Sunset, RefreshCcw, PackageOpen, Filter, LayoutGrid, User, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { AddMedicationModal } from '@/components/health/AddMedicationModal';
import { InventoryModal } from '@/components/health/InventoryModal';
import { RegisterRxModal } from '@/components/health/RegisterRxModal';
import { DeleteConfirmationModal } from '@/components/health/DeleteConfirmationModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Medication, MedicationSchedule, TodayScheduleItem } from '@/types/health';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/contexts/NotificationContext';

interface MedicationsScreenProps {
  medications: Medication[];
  todaySchedule: TodayScheduleItem[];
  onMarkMedicationTaken: (logId: string) => void;
  onAddMedication: (
    medication: Omit<Medication, 'id' | 'created_at' | 'is_active'>,
    schedule: Omit<MedicationSchedule, 'id' | 'created_at' | 'is_active' | 'medication_id' | 'user_id'>
  ) => Promise<any>;
  onUpdateMedication?: (medicationId: string, updates: Partial<Medication>) => Promise<any>;
  onDeleteMedication?: (medicationId: string) => Promise<void>;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  onRefresh?: () => Promise<void>;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  twice_daily: 'Twice Daily',
  weekly: 'Weekly',
  as_needed: 'As Needed',
};

const getTimeOfDay = (time: string) => {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const TimeIcon = ({ time }: { time: string }) => {
  const period = getTimeOfDay(time);
  if (period === 'morning') return <Sun size={16} className="text-amber-500" />;
  if (period === 'afternoon') return <Sunset size={16} className="text-orange-500" />;
  return <Moon size={16} className="text-indigo-500" />;
};

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export const MedicationsScreen = ({
  medications,
  todaySchedule,
  onMarkMedicationTaken,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onRefresh,
  onSettingsClick,
}: MedicationsScreenProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRegisterRxModal, setShowRegisterRxModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<string | null>(null);
  const [inventoryModalMed, setInventoryModalMed] = useState<Medication | null>(null);
  const [deleteConfirmMed, setDeleteConfirmMed] = useState<Medication | null>(null);
  const { addNotification } = useNotifications();

  // Use todaySchedule directly from props - computed from medications + schedules
  const takenToday = todaySchedule.filter(s => s.status === 'taken').length;
  const adherencePercent = todaySchedule.length > 0
    ? Math.round((takenToday / todaySchedule.length) * 100)
    : 100;

  // Medications with low inventory (refill needed)
  const refillAlerts = useMemo(() =>
    medications.filter(m =>
      m.is_active &&
      m.inventory_count !== null &&
      m.inventory_count !== undefined &&
      m.refill_threshold !== null &&
      m.refill_threshold !== undefined &&
      m.inventory_count <= m.refill_threshold
    ), [medications]);

  const handleMarkTaken = async (logId: string) => {
    if (logId) {
      onMarkMedicationTaken(logId);
    }
  };

  const handleAddMedication = async (
    med: Omit<Medication, 'id' | 'created_at' | 'is_active'>,
    schedule: Omit<MedicationSchedule, 'id' | 'created_at' | 'is_active' | 'medication_id' | 'user_id'>
  ) => {
    const result = await onAddMedication(med, schedule);
    if (result) {
      setShowSuccessModal(med.name);
      addNotification({
        title: 'Medication Added',
        message: `${med.name} has been added to your medication schedule.`,
        type: 'success',
      });
      setShowAddModal(false);
      setTimeout(() => setShowSuccessModal(null), 3000);
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      <Header
        title="Clinical Adherence"
        onSettingsClick={onSettingsClick}
        subtitle="Management Console"
        rightElement={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="rounded-xl hover:bg-slate-50 text-slate-400 border-none shadow-sm h-11 w-11"
            >
              <RefreshCcw size={18} />
            </Button>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#004c56] hover:bg-[#003a42] text-white rounded-2xl h-11 px-6 font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-900/20"
            >
              <Plus size={18} /> Add New Medication
            </Button>
          </div>
        }
      />

      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="px-10 py-10 max-w-7xl mx-auto space-y-8"
      >

        {/* === TOP: Schedule + Stats Row === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Today's Schedule (2/3 width) */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
              <CardContent className="p-0">
                {/* Schedule Header */}
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Schedule</p>
                    <p className="font-bold text-slate-900">{formatDate(new Date())}</p>
                  </div>
                </div>

                {/* Schedule Items */}
                <div className="divide-y divide-slate-50">
                  {todaySchedule.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Pill size={28} className="text-slate-300" />
                      </div>
                      <p className="font-bold text-slate-400">No medications scheduled for today</p>
                      <p className="text-xs text-slate-300 mt-1">Add a medication to start tracking</p>
                    </div>
                  ) : (
                    todaySchedule.map((item, index) => {
                      const isTaken = item.status === 'taken';
                      return (
                        <motion.div
                          key={`${item.medication_id}-${item.scheduled_time}-${index}`}
                          layout
                          className={`p-5 flex items-center gap-4 transition-colors ${isTaken ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'}`}
                        >
                          {/* Time Icon */}
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${isTaken ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                            {isTaken ? <CheckCircle2 size={20} className="text-emerald-600" /> : <TimeIcon time={item.scheduled_time} />}
                          </div>

                          {/* Medication Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isTaken ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isTaken ? 'Taken' : 'Pending'}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">{formatTime(item.scheduled_time)}</span>
                              {isTaken && item.taken_at && (
                                <span className="text-xs text-emerald-500 font-bold">
                                  ✓ {new Date(item.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="font-black text-slate-900 truncate">{item.medication_name}</p>
                            <p className="text-xs text-slate-400 font-medium">{item.dosage}</p>
                          </div>

                          {/* Action */}
                          {!isTaken && item.log_id && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkTaken(item.log_id!)}
                              className="bg-[#004c56] hover:bg-[#003a42] text-white rounded-xl h-9 px-5 shrink-0 font-bold text-xs shadow-sm"
                            >
                              Mark as Taken
                            </Button>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Panel (1/3 width) */}
          <motion.div variants={item} className="space-y-4">

            {/* Adherence Card */}
            <Card className="border-none shadow-sm rounded-3xl bg-[#004c56] text-white overflow-hidden">
              <CardContent className="p-6">
                <p className="text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">Adherence Rate</p>
                <div className="flex items-end gap-2 mb-2">
                  <p className="text-5xl font-black">{adherencePercent}</p>
                  <p className="text-2xl font-bold text-teal-200 mb-1">%</p>
                </div>
                <p className="text-teal-100/70 text-xs mb-4">
                  {takenToday}/{todaySchedule.length} doses taken today
                </p>
                <div className="w-full h-2 bg-teal-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-1000"
                    style={{ width: `${adherencePercent}%` }}
                  />
                </div>
                {adherencePercent >= 90 && (
                  <p className="text-xs text-emerald-300 font-bold mt-2">🎯 You're on track — keep going!</p>
                )}
              </CardContent>
            </Card>

            {/* Refill Alerts */}
            {refillAlerts.length > 0 && (
              <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-500" /> Refill Alerts
                  </p>
                  <div className="space-y-3">
                    {refillAlerts.map(med => (
                      <div key={med.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{med.name}</p>
                          <p className="text-xs text-slate-400">{med.inventory_count} pills remaining</p>
                        </div>
                        <button className="text-[10px] font-black text-teal-600 uppercase tracking-wider hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg px-3 py-1.5 transition-colors shrink-0">
                          Order Refill
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </motion.div>
        </div>

        {/* === Medication Inventory === */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-slate-900">Medication Inventory</h3>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                <Filter size={16} />
              </button>
              <button className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {medications.filter(m => m.is_active).map(med => {
              const isLowStock = med.inventory_count !== null &&
                med.inventory_count !== undefined &&
                med.refill_threshold !== null &&
                med.refill_threshold !== undefined &&
                med.inventory_count <= med.refill_threshold;

              return (
                <motion.div key={med.id} layout>
                  <Card className={`border-none shadow-sm rounded-3xl bg-white overflow-hidden hover:shadow-md transition-all ${isLowStock ? 'ring-1 ring-amber-200' : ''}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                          <Pill size={20} />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="rounded-2xl border-slate-100 shadow-xl" align="end">
                            <DropdownMenuItem
                              onClick={() => setInventoryModalMed(med)}
                              className="font-bold gap-2 rounded-xl"
                            >
                              <PackageOpen size={14} /> Manage Inventory
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmMed(med)}
                              className="text-red-500 font-bold gap-2 rounded-xl"
                            >
                              <Trash2 size={14} /> Remove Medication
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="font-black text-slate-900 text-lg mb-1">{med.name}</p>
                      {med.doctor && (
                        <div className="flex items-center gap-1 mb-3">
                          <User size={11} className="text-slate-400" />
                          <p className="text-xs text-slate-400 font-medium">{med.doctor}</p>
                        </div>
                      )}

                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosage</p>
                        <p className="text-sm font-bold text-slate-700">{med.dosage}</p>
                      </div>

                      {/* Inventory Bar */}
                      {med.inventory_count !== null && med.inventory_count !== undefined && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inventory</span>
                            <span className={`text-xs font-bold ${isLowStock ? 'text-amber-600' : 'text-slate-600'}`}>
                              {med.inventory_count} pills
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full">
                            <div
                              className={`h-full rounded-full ${isLowStock ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(100, (med.inventory_count / Math.max(med.refill_threshold! * 3, 30)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                          Active
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1">
                            <RefreshCcw size={10} /> Refill Soon
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Register New Button */}
            <motion.div variants={item}>
              <button
                onClick={() => setShowRegisterRxModal(true)}
                className="w-full h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-teal-100 flex items-center justify-center transition-colors">
                  <Plus size={24} className="group-hover:text-teal-600" />
                </div>
                <div className="text-center">
                  <p className="font-black text-sm">Register New Rx</p>
                  <p className="text-xs mt-0.5">Add prescription to inventory</p>
                </div>
              </button>
            </motion.div>
          </div>
        </motion.div>

      </motion.main>

      {/* Register Rx Modal */}
      <AnimatePresence>
        {showRegisterRxModal && (
          <RegisterRxModal
            onClose={() => setShowRegisterRxModal(false)}
            onAdd={handleAddMedication}
          />
        )}
      </AnimatePresence>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddMedicationModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddMedication}
          />
        )}
      </AnimatePresence>

      {/* Inventory Management Modal */}
      <AnimatePresence>
        {inventoryModalMed && onUpdateMedication && (
          <InventoryModal
            medication={inventoryModalMed}
            onClose={() => setInventoryModalMed(null)}
            onUpdate={onUpdateMedication}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmMed && onDeleteMedication && (
          <DeleteConfirmationModal
            medicationName={deleteConfirmMed.name}
            onClose={() => setDeleteConfirmMed(null)}
            onConfirm={async () => {
              await onDeleteMedication(deleteConfirmMed.id);
              setDeleteConfirmMed(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Medication Added Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-teal-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Medication Added!</h3>
              <p className="text-slate-500 text-sm mb-6">
                {showSuccessModal} has been successfully added to your schedule.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => setShowSuccessModal(null)}
                  className="w-full bg-[#004c56] hover:bg-[#003a42] text-white rounded-2xl h-12 font-bold shadow-lg"
                >
                  Got it
                </Button>
                <button
                  onClick={() => setShowSuccessModal(null)}
                  className="w-full text-teal-600 font-bold text-sm hover:underline"
                >
                  View Schedule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
