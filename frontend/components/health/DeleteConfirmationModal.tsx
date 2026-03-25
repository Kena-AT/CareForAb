"use client";

import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface DeleteConfirmationModalProps {
  medicationName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmationModal = ({ medicationName, onClose, onConfirm }: DeleteConfirmationModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting medication:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Remove Medication</h3>
              <p className="text-xs font-bold text-red-100 uppercase tracking-wider">Confirm Action</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-white/20 text-white">
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
            <p className="text-sm text-red-800 font-medium">
              You are about to remove <strong className="font-bold">{medicationName}</strong> from your medication list.
            </p>
          </div>

          <div className="space-y-3 text-slate-600">
            <p className="text-sm">
              This action will:
            </p>
            <ul className="text-sm space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Deactivate the medication from your schedule</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Remove it from today's medication schedule</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Keep historical records for your health tracking</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 text-center">
            This action cannot be undone immediately, but you can re-add the medication later if needed.
          </p>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 h-14 rounded-2xl font-black bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-200 gap-2"
            >
              {isDeleting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Trash2 size={18} />
                </motion.div>
              ) : (
                <Trash2 size={18} />
              )}
              {isDeleting ? 'Removing...' : 'Remove Medication'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
