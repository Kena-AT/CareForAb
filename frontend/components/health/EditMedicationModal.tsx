"use client";

import { useState } from 'react';
import { X, Pill, Save, User, FileText, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Medication, MedicationFormType, FORM_TYPE_META } from '@/types/health';
import { motion } from 'framer-motion';

interface EditMedicationModalProps {
  medication: Medication;
  onClose: () => void;
  onUpdate: (medicationId: string, updates: Partial<Medication>) => Promise<void>;
}

export const EditMedicationModal = ({ medication, onClose, onUpdate }: EditMedicationModalProps) => {
  const [formType, setFormType] = useState<MedicationFormType>(medication.form_type || 'tablet');
  const meta = FORM_TYPE_META[formType];

  const [name, setName] = useState(medication.name);
  const [dosage, setDosage] = useState(medication.dosage);
  const [notes, setNotes] = useState(medication.notes || '');
  const [doctor, setDoctor] = useState(medication.doctor || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdate(medication.id, {
        name: name.trim(),
        dosage: dosage.trim(),
        form_type: formType,
        notes: notes.trim() || null,
        doctor: doctor.trim() || null,
      });
      onClose();
    } catch (err) {
      console.error('Update error:', err);
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
        className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
           <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-3xl bg-[#f0fdfaff] text-[#004c56ff] flex items-center justify-center shadow-inner">
                <Pill size={28} />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight">Edit Medication</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Update Clinical Profile</p>
              </div>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl hover:bg-slate-50 text-slate-400 w-12 h-12">
             <X size={24} />
           </Button>
        </div>

        <form id="edit-medication-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10">
           <div className="space-y-8">
              {/* Form Type Selector */}
              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Medication Form</Label>
                 <div className="grid grid-cols-4 gap-2">
                   {(Object.keys(FORM_TYPE_META) as MedicationFormType[]).map((type) => (
                     <button
                       key={type}
                       type="button"
                       onClick={() => setFormType(type)}
                       className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all font-bold text-xs ${
                         formType === type
                           ? 'border-[#004c56] bg-[#004c5610] text-[#004c56]'
                           : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                       }`}
                     >
                       <span className="text-xl">{FORM_TYPE_META[type].emoji}</span>
                       <span>{FORM_TYPE_META[type].label}</span>
                     </button>
                   ))}
                 </div>
              </div>

              {/* Name & Dosage */}
              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Medication Identity</Label>
                 <div className="space-y-4">
                    <div className="relative">
                      <Clipboard size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Input 
                        placeholder="Medication Name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="h-16 rounded-[24px] bg-slate-50 border-none pl-14 pr-6 font-bold text-lg focus:ring-2 focus:ring-[#004c5622]" 
                        required 
                      />
                    </div>
                    <div className="relative">
                      <Pill size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Input 
                        placeholder={meta.dosagePlaceholder}
                        value={dosage} 
                        onChange={(e) => setDosage(e.target.value)} 
                        className="h-16 rounded-[24px] bg-slate-50 border-none pl-14 pr-6 font-bold text-lg focus:ring-2 focus:ring-[#004c5622]" 
                        required 
                      />
                    </div>
                    <p className="text-xs text-slate-400 ml-1">Inventory tracked in <strong>{meta.unit}</strong></p>
                 </div>
              </div>

              {/* Prescribing Info */}
              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Prescribing Authority</Label>
                 <div className="relative">
                    <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <Input 
                      placeholder="Doctor Name" 
                      value={doctor} 
                      onChange={(e) => setDoctor(e.target.value)} 
                      className="h-16 rounded-[24px] bg-slate-50 border-none pl-14 pr-6 font-bold text-lg focus:ring-2 focus:ring-[#004c5622]" 
                    />
                 </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Clinical Notes</Label>
                 <div className="relative">
                    <FileText size={18} className="absolute left-5 top-6 text-slate-300" />
                    <Textarea 
                      placeholder="Enter any special instructions or notes..." 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      rows={4} 
                      className="rounded-[24px] bg-slate-50 border-none pl-14 pr-6 py-5 font-medium text-slate-600 resize-none focus:ring-2 focus:ring-[#004c5622]" 
                    />
                 </div>
              </div>
           </div>

        </form>

        {/* Footer - Fixed */}
        <div className="px-10 py-8 border-t border-slate-50 flex gap-4 bg-white shrink-0 mt-auto">
           <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-16 rounded-[24px] font-black text-slate-400 hover:bg-slate-50 uppercase tracking-widest text-xs">Cancel</Button>
           <Button 
             form="edit-medication-form"
             type="submit" 
             disabled={isSubmitting || !name.trim() || !dosage.trim()} 
             className="flex-1 h-16 rounded-[24px] font-black bg-[#004c56] hover:bg-[#003a42] text-white shadow-2xl shadow-[#004c5633] gap-3 uppercase tracking-widest text-xs"
           >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
              <Save size={18} />
           </Button>
        </div>
      </motion.div>
    </div>
  );
};
