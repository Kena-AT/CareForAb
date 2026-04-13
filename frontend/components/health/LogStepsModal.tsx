"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LogStepsModalProps {
  onClose: () => void;
  onLog: (steps: number) => Promise<void>;
  currentSteps?: number;
}

export const LogStepsModal = ({ onClose, onLog, currentSteps = 0 }: LogStepsModalProps) => {
  const [steps, setSteps] = useState<string>(currentSteps.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numSteps = parseInt(steps, 10);
    if (isNaN(numSteps) || numSteps < 0) return;

    setIsSubmitting(true);
    try {
      await onLog(numSteps);
      setShowSuccess(true);
      setTimeout(onClose, 1500);
    } catch (error: any) {
      console.error('Error logging steps:', error?.message || error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-[#004c56] p-8 text-white relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-white/10 rounded-2xl">
                <Activity size={28} />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Active Steps</h2>
            </div>
            <p className="text-emerald-100/70 text-sm font-medium tracking-wide">Enter your current progress for today.</p>
          </div>

          {/* Form */}
          <div className="p-10">
            <AnimatePresence mode="wait">
              {!showSuccess ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit} 
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                      Total Steps Today
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={steps}
                        onChange={(e) => setSteps(e.target.value)}
                        placeholder="e.g. 5,000"
                        className="h-20 text-4xl font-black border-slate-100 rounded-[28px] focus:ring-primary/20 bg-slate-50/50 pr-24"
                        autoFocus
                        required
                        min="0"
                      />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2">
                        <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Steps</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-16 bg-[#004c56] hover:bg-[#003a42] text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#004c5633]"
                  >
                    {isSubmitting ? 'Syncing Activity...' : 'Save Activity Record'}
                  </Button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="py-12 text-center"
                >
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Sync Successful!</h3>
                  <p className="text-slate-500 font-medium">Your health journey continues.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
  );
};
