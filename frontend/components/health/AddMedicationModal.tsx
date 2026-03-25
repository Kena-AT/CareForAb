"use client";

import { useState } from 'react';
import { X, Plus, Trash2, Pill, Clock, Save, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Medication } from '@/types/health';
import { motion, AnimatePresence } from 'framer-motion';

interface AddMedicationModalProps {
  onClose: () => void;
  onAdd: (medication: Omit<Medication, 'id' | 'created_at' | 'is_active'>) => void;
}

export const AddMedicationModal = ({ onClose, onAdd }: AddMedicationModalProps) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [notes, setNotes] = useState('');
  const [doctor, setDoctor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTime = () => {
    setTimes([...times, '12:00']);
  };

  const removeTime = (index: number) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleFrequencyChange = (val: string) => {
    setFrequency(val);
    if (val === 'twice_daily') setTimes(['08:00', '20:00']);
    else if (val === 'daily') setTimes(['08:00']);
    else if (val === 'weekly') setTimes(['08:00']);
    else setTimes(['08:00']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || times.length === 0) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        times,
        notes: notes.trim() || null,
        doctor: doctor.trim() || null,
        inventory_count: null,
        refill_threshold: null,
      });
      onClose();
    } catch (err: any) {
      console.error('Submission error in AddMedicationModal:', err);
      // The parent hook (useHealthData) should already show a toast, 
      // but we add this as a secondary safety to ensure the user knows it failed.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#004c5633] backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#f0fdfaff] text-[#004c56ff] flex items-center justify-center">
                 <Pill size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">Add Medication</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Therapy Track</p>
              </div>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-slate-50 text-slate-400">
              <X size={20} />
           </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
           <div className="space-y-6">
              <div className="space-y-3">
                 <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Medication Name</Label>
                 <Input
                   placeholder="e.g. Metformin"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold"
                   required
                 />
              </div>
              <div className="space-y-3">
                 <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Dosage Form</Label>
                 <Input
                   placeholder="e.g. 500mg Tablet"
                   value={dosage}
                   onChange={(e) => setDosage(e.target.value)}
                   className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold"
                   required
                 />
              </div>
           </div>

           <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Routine Frequency</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                 <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold">
                    <SelectValue />
                 </SelectTrigger>
                 <SelectContent position="popper" className="rounded-2xl border-slate-100 shadow-xl z-[200]">
                    <SelectItem value="daily" className="font-bold py-3">🌅 Once Daily</SelectItem>
                    <SelectItem value="twice_daily" className="font-bold py-3">⚖️ Twice Daily</SelectItem>
                    <SelectItem value="weekly" className="font-bold py-3">📅 Once Weekly</SelectItem>
                    <SelectItem value="as_needed" className="font-bold py-3">🆘 As Needed (PRN)</SelectItem>
                 </SelectContent>
              </Select>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Reminder Protocol</Label>
                 <Button type="button" variant="ghost" size="sm" onClick={addTime} className="text-primary font-black text-[10px] uppercase tracking-widest hover:bg-[#f0fdfaff] rounded-lg">
                    <Plus size={14} className="mr-1" /> Add Interval
                 </Button>
              </div>
              <div className="space-y-3">
                 {times.map((time, index) => (
                    <motion.div 
                       initial={{ opacity: 0, x: -10 }} 
                       animate={{ opacity: 1, x: 0 }} 
                       key={index} 
                       className="flex items-center gap-3"
                    >
                       <div className="flex-1 relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => updateTime(index, e.target.value)}
                            className="h-14 rounded-2xl bg-slate-50 border-none pl-12 font-bold"
                          />
                       </div>
                       {times.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTime(index)}
                            className="w-12 h-12 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50"
                          >
                             <Trash2 size={18} />
                          </Button>
                       )}
                    </motion.div>
                 ))}
              </div>
           </div>

            <div className="space-y-3">
               <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Prescribing Doctor (Optional)</Label>
               <Input
                 placeholder="e.g. Dr. Thompson"
                 value={doctor}
                 onChange={(e) => setDoctor(e.target.value)}
                 className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold"
               />
            </div>

           <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Clinical Notes (Optional)</Label>
              <Textarea
                placeholder="Special instructions or precautions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-2xl bg-slate-50 border-none p-4 font-medium resize-none"
              />
           </div>

           <div className="flex gap-4 sticky bottom-0 bg-white pt-4 pb-2 z-20">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:bg-slate-50"
              >
                 Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !dosage.trim()}
                className="flex-1 h-14 rounded-2xl font-black bg-[#004c56ff] hover:bg-[#003a42] text-white shadow-xl shadow-[#004c5633] gap-2"
              >
                 {isSubmitting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                       <Calendar size={18} />
                    </motion.div>
                 ) : <Save size={18} />}
                 {isSubmitting ? 'Syncing...' : 'Save Therapy'}
              </Button>
           </div>
        </form>
      </motion.div>
    </div>
  );
};
