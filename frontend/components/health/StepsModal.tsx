"use client";

import { useState } from 'react';
import { Activity, X, Plus, Minus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface StepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSteps: number;
  onSave: (steps: number) => Promise<void>;
}

export const StepsModal = ({ isOpen, onClose, currentSteps, onSave }: StepsModalProps) => {
  const [stepsValue, setStepsValue] = useState<string>(currentSteps.toString());
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if prop changes (e.g. after a background refresh)
  useState(() => {
    setStepsValue(currentSteps.toString());
  });

  const handleSave = async () => {
    const numericSteps = parseInt(stepsValue);
    if (isNaN(numericSteps) || numericSteps < 0) return;
    
    setIsSaving(true);
    try {
      await onSave(numericSteps);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const adjustSteps = (amount: number) => {
    const current = parseInt(stepsValue) || 0;
    setStepsValue(Math.max(0, current + amount).toString());
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden relative"
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Steps</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Update Daily Goal</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-slate-50 text-slate-400">
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-center gap-6">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-12 w-12 rounded-2xl border-slate-100 hover:bg-slate-50"
                    onClick={() => adjustSteps(-500)}
                  >
                    <Minus size={20} />
                  </Button>
                  
                  <Input
                    type="number"
                    value={stepsValue}
                    onChange={(e) => setStepsValue(e.target.value)}
                    className="h-20 text-center text-4xl font-black bg-slate-50 border-none rounded-2xl focus-visible:ring-primary/20 transition-all"
                  />

                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-12 w-12 rounded-2xl border-slate-100 hover:bg-slate-50"
                    onClick={() => adjustSteps(500)}
                  >
                    <Plus size={20} />
                  </Button>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:bg-slate-50">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex-1 h-14 rounded-2xl font-black bg-[#004c56ff] hover:bg-[#003a42] text-white shadow-xl shadow-[#004c5633] gap-2"
                  >
                    <Save size={18} /> {isSaving ? 'Saving...' : 'Save Steps'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
