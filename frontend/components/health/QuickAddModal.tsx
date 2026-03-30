"use client";

import { useState } from 'react';
import { Droplets, Heart, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { BloodSugarReading, BloodPressureReading } from '@/types/health';
import { motion } from 'framer-motion';

interface QuickAddModalProps {
  type: 'blood_sugar' | 'blood_pressure';
  onClose: () => void;
  onAddBloodSugar: (reading: Omit<BloodSugarReading, 'id' | 'recorded_at'>) => void;
  onAddBloodPressure: (reading: Omit<BloodPressureReading, 'id' | 'recorded_at'>) => void;
}

export const QuickAddModal = ({ 
  type, 
  onClose, 
  onAddBloodSugar, 
  onAddBloodPressure 
}: QuickAddModalProps) => {
  // Blood sugar state
  const [glucoseValue, setGlucoseValue] = useState('');
  const [mealType, setMealType] = useState<BloodSugarReading['meal_type']>('fasting');
  
  // Blood pressure state
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');

  const handleSubmit = () => {
    if (type === 'blood_sugar') {
      const value = parseInt(glucoseValue);
      if (isNaN(value) || value < 20 || value > 600) {
        toast.error('Please enter a blood sugar value between 20 and 600 mg/dL');
        return;
      }
      onAddBloodSugar({ value, unit: 'mg/dL', meal_type: mealType });
      toast.success(`Blood sugar ${value} mg/dL recorded.`);
    } else {
      const sys = parseInt(systolic);
      const dia = parseInt(diastolic);
      const pul = pulse ? parseInt(pulse) : undefined;
      
      if (isNaN(sys) || sys < 70 || sys > 250 || isNaN(dia) || dia < 40 || dia > 150) {
        toast.error('Please enter valid blood pressure values.');
        return;
      }
      onAddBloodPressure({ systolic: sys, diastolic: dia, pulse: pul });
      toast.success(`Blood pressure ${sys}/${dia} recorded.`);
    }
    onClose();
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
        className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden relative"
      >
        <div className="p-8 space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    type === 'blood_sugar' ? 'bg-[#f0fdfaff] text-[#004c56ff]' : 'bg-red-50 text-red-500'
                 }`}>
                    {type === 'blood_sugar' ? <Droplets size={24} /> : <Heart size={24} />}
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Record Vitals</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                       {type === 'blood_sugar' ? 'Glucose Reading' : 'Blood Pressure'}
                    </p>
                 </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-slate-50 text-slate-400">
                 <X size={20} />
              </Button>
           </div>

           <div className="space-y-6">
              {type === 'blood_sugar' ? (
                <>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Glucose Level (mg/dL)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="000"
                        value={glucoseValue}
                        onChange={(e) => setGlucoseValue(e.target.value)}
                        className="h-20 text-center text-4xl font-black bg-slate-50 border-none rounded-2xl focus-visible:ring-primary/20 transition-all placeholder:text-slate-200"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Meal Type</Label>
                    <Select value={mealType} onValueChange={(v) => setMealType(v as BloodSugarReading['meal_type'])}>
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-700">
                        <SelectValue placeholder="Select meal type..." />
                      </SelectTrigger>
                      <SelectContent position="popper" className="rounded-2xl border-slate-100 shadow-xl z-[200]">
                        <SelectItem value="fasting" className="font-bold py-3">🌅 Fasting (Morning)</SelectItem>
                        <SelectItem value="breakfast" className="font-bold py-3">🍳 Breakfast</SelectItem>
                        <SelectItem value="lunch" className="font-bold py-3">🥗 Lunch</SelectItem>
                        <SelectItem value="dinner" className="font-bold py-3">🍲 Dinner</SelectItem>
                        <SelectItem value="snack" className="font-bold py-3">🥨 Snack</SelectItem>
                        <SelectItem value="other" className="font-bold py-3">📍 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Systolic</Label>
                      <Input
                        type="number"
                        placeholder="120"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        className="h-16 text-center text-2xl font-black bg-slate-50 border-none rounded-2xl"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Diastolic</Label>
                      <Input
                        type="number"
                        placeholder="80"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        className="h-16 text-center text-2xl font-black bg-slate-50 border-none rounded-2xl"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Pulse (Optional BPM)</Label>
                    <Input
                      type="number"
                      placeholder="72"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="h-14 rounded-2xl bg-slate-50 border-none text-center font-bold"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-4 pt-4">
                <Button variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:bg-slate-50">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1 h-14 rounded-2xl font-black bg-[#004c56ff] hover:bg-[#003a42] text-white shadow-xl shadow-[#004c5633] gap-2"
                >
                  <Save size={18} /> Save Protocol
                </Button>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
