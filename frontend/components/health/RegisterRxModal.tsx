"use client";

import { useState } from 'react';
import { X, Plus, Trash2, Pill, Clock, FileText, Stethoscope, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Medication } from '@/types/health';
import { motion } from 'framer-motion';

interface RegisterRxModalProps {
  onClose: () => void;
  onAdd: (medication: Omit<Medication, 'id' | 'created_at' | 'is_active'>) => void;
}

export const RegisterRxModal = ({ onClose, onAdd }: RegisterRxModalProps) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [notes, setNotes] = useState('');
  const [doctor, setDoctor] = useState('');
  const [inventoryCount, setInventoryCount] = useState('');
  const [refillThreshold, setRefillThreshold] = useState('10');
  const [prescriptionNumber, setPrescriptionNumber] = useState('');
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
        inventory_count: inventoryCount ? parseInt(inventoryCount) : null,
        refill_threshold: refillThreshold ? parseInt(refillThreshold) : 10,
      });
      onClose();
    } catch (err: any) {
      console.error('Submission error in RegisterRxModal:', err);
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
        className="w-full max-w-xl bg-white rounded-[32px] shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-[#004c56] to-[#006d7a] text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Register Prescription</h3>
              <p className="text-xs font-bold text-teal-100 uppercase tracking-wider">Rx Entry Form</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-white/20 text-white">
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Prescription Number */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
              Prescription Number (Optional)
            </Label>
            <div className="relative">
              <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="e.g., RX123456789"
                value={prescriptionNumber}
                onChange={(e) => setPrescriptionNumber(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-none pl-12 font-bold"
              />
            </div>
          </div>

          {/* Medication Name & Dosage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                Medication Name *
              </Label>
              <div className="relative">
                <Pill size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="e.g. Metformin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-2xl bg-slate-50 border-none pl-12 font-bold"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                Dosage *
              </Label>
              <Input
                placeholder="e.g. 500mg"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold"
                required
              />
            </div>
          </div>

          {/* Prescribing Doctor */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
              Prescribing Doctor
            </Label>
            <div className="relative">
              <Stethoscope size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="e.g. Dr. Sarah Thompson"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-none pl-12 font-bold"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
              Frequency *
            </Label>
            <Select value={frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold">
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

          {/* Reminder Times */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Reminder Times</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addTime} className="text-primary font-black text-[10px] uppercase tracking-widest hover:bg-[#f0fdfaff] rounded-lg">
                <Plus size={14} className="mr-1" /> Add Time
              </Button>
            </div>
            <div className="space-y-2">
              {times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="h-12 rounded-2xl bg-slate-50 border-none pl-12 font-bold"
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
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Section */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Package size={18} />
              <span className="font-bold text-sm">Initial Inventory</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                  Quantity Dispensed
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 90"
                  value={inventoryCount}
                  onChange={(e) => setInventoryCount(e.target.value)}
                  className="h-12 rounded-2xl bg-white border-none px-4 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
                  Refill Alert At
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={refillThreshold}
                  onChange={(e) => setRefillThreshold(e.target.value)}
                  className="h-12 rounded-2xl bg-white border-none px-4 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
              Special Instructions
            </Label>
            <Textarea
              placeholder="Take with food, avoid alcohol, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-2xl bg-slate-50 border-none p-4 font-medium resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl font-black text-slate-400 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !dosage.trim()}
              className="flex-1 h-12 rounded-2xl font-black bg-[#004c56] hover:bg-[#003a42] text-white shadow-xl shadow-[#004c5633]"
            >
              {isSubmitting ? 'Registering...' : 'Register Rx'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
