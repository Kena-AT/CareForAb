import { useState } from 'react';
import { X, Pill, Save, User, FileText, Clipboard, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Medication, MedicationSchedule, MedicationFormType, FORM_TYPE_META } from '@/types/health';
import { motion } from 'framer-motion';

interface EditMedicationModalProps {
  medication: Medication;
  initialSchedule: MedicationSchedule | null;
  onClose: () => void;
  onUpdate: (medicationId: string, updates: Partial<Medication>) => Promise<void>;
  onUpdateSchedule: (scheduleId: string, updates: Partial<MedicationSchedule>) => Promise<void>;
}

export const EditMedicationModal = ({ medication, initialSchedule, onClose, onUpdate, onUpdateSchedule }: EditMedicationModalProps) => {
  const [formType, setFormType] = useState<MedicationFormType>(medication.form_type || 'tablet');
  const meta = FORM_TYPE_META[formType];

  const [name, setName] = useState(medication.name);
  const [dosage, setDosage] = useState(medication.dosage);
  const [notes, setNotes] = useState(medication.notes || '');
  const [doctor, setDoctor] = useState(medication.doctor || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schedule fields
  const [treatmentType, setTreatmentType] = useState<'chronic' | 'acute' | 'supplement'>(initialSchedule?.treatment_type || 'chronic');
  const [frequency, setFrequency] = useState<'daily' | 'twice_daily' | 'weekly' | 'as_needed'>(initialSchedule?.frequency || 'daily');
  const [times, setTimes] = useState<string[]>(initialSchedule?.times || ['08:00']);
  const [startDate, setStartDate] = useState(initialSchedule?.start_date || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialSchedule?.end_date || '');
  const [isIndefinite, setIsIndefinite] = useState(initialSchedule?.is_indefinite ?? true);

  const addTime = () => setTimes([...times, '12:00']);
  const removeTime = (index: number) => setTimes(times.filter((_, i) => i !== index));
  const updateTime = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleTreatmentTypeChange = (val: 'chronic' | 'acute' | 'supplement') => {
    setTreatmentType(val);
    if (val === 'chronic') {
      setIsIndefinite(true);
      setEndDate('');
    } else {
      setIsIndefinite(false);
    }
  };

  const handleFrequencyChange = (val: 'daily' | 'twice_daily' | 'weekly' | 'as_needed') => {
    setFrequency(val);
    if (val === 'twice_daily') setTimes(['08:00', '20:00']);
    else if (val === 'daily') setTimes(['08:00']);
    else if (val === 'weekly') setTimes(['08:00']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || times.length === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Update Medication
      await onUpdate(medication.id, {
        name: name.trim(),
        dosage: dosage.trim(),
        form_type: formType,
        notes: notes.trim() || null,
        doctor: doctor.trim() || null,
      });

      // 2. Update Schedule if it exists
      if (initialSchedule) {
        await onUpdateSchedule(initialSchedule.id, {
          frequency,
          treatment_type: treatmentType,
          times,
          start_date: startDate,
          end_date: isIndefinite ? null : (endDate || null),
          is_indefinite: isIndefinite,
        });
      }

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
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-3xl bg-[#f0fdfaff] text-[#004c56ff] flex items-center justify-center shadow-inner">
                <Pill size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">Edit Medication</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Clinical Profile</p>
              </div>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl hover:bg-slate-50 text-slate-400 w-10 h-10">
             <X size={20} />
           </Button>
        </div>

        <form id="edit-medication-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
           <div className="space-y-6">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Pill size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Medication Details</span>
              </div>

              {/* Form Type Selector */}
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Medication Form</Label>
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
                       <span className="text-[10px] items-center">{FORM_TYPE_META[type].label}</span>
                     </button>
                   ))}
                 </div>
              </div>

              {/* Name & Dosage */}
              <div className="grid grid-cols-1 gap-4">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Medication Name</Label>
                    <div className="relative">
                      <Clipboard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Input 
                        placeholder="Medication Name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="h-14 rounded-2xl bg-slate-50 border-none pl-12 font-bold focus:ring-2 focus:ring-[#004c5622]" 
                        required 
                      />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Dosage</Label>
                    <div className="relative">
                      <Pill size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Input 
                        placeholder={meta.dosagePlaceholder}
                        value={dosage} 
                        onChange={(e) => setDosage(e.target.value)} 
                        className="h-14 rounded-2xl bg-slate-50 border-none pl-12 font-bold focus:ring-2 focus:ring-[#004c5622]" 
                        required 
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 ml-1">Inventory unit: <strong>{meta.unit}</strong></p>
                 </div>
              </div>

              {/* Prescribing Info */}
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Doctor</Label>
                 <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <Input 
                      placeholder="Doctor Name" 
                      value={doctor} 
                      onChange={(e) => setDoctor(e.target.value)} 
                      className="h-14 rounded-2xl bg-slate-50 border-none pl-12 font-bold focus:ring-2 focus:ring-[#004c5622]" 
                    />
                 </div>
              </div>
           </div>

           {/* Schedule Section */}
           <div className="space-y-6 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Clock size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Schedule & Reminder</span>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Treatment Type</Label>
                 <Select value={treatmentType} onValueChange={handleTreatmentTypeChange}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold focus:ring-2 focus:ring-[#004c5622]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl z-[200]">
                       <SelectItem value="chronic" className="font-bold py-3 text-sm">🔄 Ongoing (Chronic)</SelectItem>
                       <SelectItem value="acute" className="font-bold py-3 text-sm">⏱️ Fixed Duration (Acute)</SelectItem>
                       <SelectItem value="supplement" className="font-bold py-3 text-sm">🌿 Supplement</SelectItem>
                    </SelectContent>
                 </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                   <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Start Date</Label>
                   <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold" required />
                </div>
                {!isIndefinite && (
                  <div className="space-y-3">
                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">End Date</Label>
                     <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold" required={!isIndefinite} />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 px-1">
                <input 
                  type="checkbox" 
                  id="indefinite-edit" 
                  checked={isIndefinite} 
                  onChange={(e) => setIsIndefinite(e.target.checked)} 
                  className="w-4 h-4 rounded border-slate-300 text-[#004c56] focus:ring-[#004c56]" 
                />
                <Label htmlFor="indefinite-edit" className="text-xs font-bold text-slate-600">Take indefinitely</Label>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Frequency</Label>
                 <Select value={frequency} onValueChange={handleFrequencyChange}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold focus:ring-2 focus:ring-[#004c5622]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100 shadow-xl z-[200]">
                       <SelectItem value="daily" className="font-bold py-3 text-sm">🌅 Once Daily</SelectItem>
                       <SelectItem value="twice_daily" className="font-bold py-3 text-sm">⚖️ Twice Daily</SelectItem>
                       <SelectItem value="weekly" className="font-bold py-3 text-sm">📅 Once Weekly</SelectItem>
                       <SelectItem value="as_needed" className="font-bold py-3 text-sm">🆘 As Needed (PRN)</SelectItem>
                    </SelectContent>
                 </Select>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Reminder Times</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addTime} className="text-[#004c56] font-black text-[10px] uppercase tracking-widest rounded-lg">
                      <Plus size={14} className="mr-1" /> Add Time
                    </Button>
                 </div>
                 <div className="space-y-3">
                    {times.map((time, index) => (
                       <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={index} className="flex items-center gap-3">
                          <div className="flex-1 relative">
                             <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                             <Input 
                               type="time" 
                               value={time} 
                               onChange={(e) => updateTime(index, e.target.value)} 
                               className="h-14 rounded-2xl bg-slate-50 border-none pl-12 font-bold focus:ring-2 focus:ring-[#004c5622]" 
                             />
                          </div>
                          {times.length > 1 && (
                             <Button type="button" variant="ghost" size="icon" onClick={() => removeTime(index)} className="w-12 h-12 rounded-xl text-red-300 hover:text-red-500 hover:bg-red-50">
                               <Trash2 size={18} />
                             </Button>
                          )}
                       </motion.div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Notes */}
           <div className="space-y-6 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <FileText size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Clinical Notes</span>
              </div>
              <div className="relative">
                 <FileText size={16} className="absolute left-4 top-4 text-slate-300" />
                 <Textarea 
                   placeholder="Enter any special instructions or notes..." 
                   value={notes} 
                   onChange={(e) => setNotes(e.target.value)} 
                   rows={3} 
                   className="rounded-2xl bg-slate-50 border-none pl-12 pr-4 py-4 font-medium text-slate-600 resize-none focus:ring-2 focus:ring-[#004c5622]" 
                 />
              </div>
           </div>
        </form>

        {/* Footer - Fixed */}
        <div className="px-8 py-6 border-t border-slate-50 flex gap-4 bg-white shrink-0 mt-auto">
           <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:bg-slate-50 uppercase tracking-widest text-[10px]">Cancel</Button>
           <Button 
             form="edit-medication-form"
             type="submit" 
             disabled={isSubmitting || !name.trim() || !dosage.trim() || times.length === 0} 
             className="flex-1 h-14 rounded-2xl font-black bg-[#004c56] hover:bg-[#003a42] text-white shadow-2xl shadow-[#004c5633] gap-2 uppercase tracking-widest text-[10px]"
           >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
              <Save size={16} />
           </Button>
        </div>
      </motion.div>
    </div>
  );
};
