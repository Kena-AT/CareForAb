"use client";

import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, Plus, Minus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Medication } from '@/types/health';
import { motion } from 'framer-motion';

interface InventoryModalProps {
  medication: Medication;
  onClose: () => void;
  onUpdate: (medicationId: string, updates: Partial<Medication>) => Promise<any>;
}

export const InventoryModal = ({ medication, onClose, onUpdate }: InventoryModalProps) => {
  const [inventoryCount, setInventoryCount] = useState<number | ''>(medication.inventory_count ?? '');
  const [refillThreshold, setRefillThreshold] = useState<number | ''>(medication.refill_threshold ?? 10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset values when medication changes
  useEffect(() => {
    setInventoryCount(medication.inventory_count ?? '');
    setRefillThreshold(medication.refill_threshold ?? 10);
  }, [medication]);

  const isLowStock = inventoryCount !== '' && refillThreshold !== '' && inventoryCount <= refillThreshold;

  const handleIncrement = () => {
    setInventoryCount(prev => (prev === '' ? 1 : prev + 1));
  };

  const handleDecrement = () => {
    setInventoryCount(prev => (prev === '' || prev <= 0 ? 0 : prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Add 5-second timeout to prevent hanging
      const updatePromise = onUpdate(medication.id, {
        inventory_count: inventoryCount === '' ? null : inventoryCount,
        refill_threshold: refillThreshold === '' ? null : refillThreshold,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Update timed out')), 5000)
      );
      
      await Promise.race([updatePromise, timeoutPromise]);
      onClose();
    } catch (error: any) {
      console.error('[InventoryModal] Update error:', error);
      alert(error?.message || 'Failed to update inventory. Please try again.');
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
        className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f0fdfaff] text-[#004c56ff] flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Manage Inventory</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{medication.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-slate-50 text-slate-400">
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Stock */}
          <div className="space-y-3">
            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
              Current Stock (pills/units)
            </Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                className="w-12 h-12 rounded-xl border-slate-200 hover:bg-slate-50"
              >
                <Minus size={18} className="text-slate-600" />
              </Button>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={inventoryCount}
                onChange={(e) => setInventoryCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="flex-1 h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold text-center text-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                className="w-12 h-12 rounded-xl border-slate-200 hover:bg-slate-50"
              >
                <Plus size={18} className="text-slate-600" />
              </Button>
            </div>
          </div>

          {/* Refill Threshold */}
          <div className="space-y-3">
            <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">
              Refill Alert Threshold
            </Label>
            <Input
              type="number"
              min="0"
              placeholder="10"
              value={refillThreshold}
              onChange={(e) => setRefillThreshold(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="h-14 rounded-2xl bg-slate-50 border-none px-4 font-bold"
            />
            <p className="text-xs text-slate-400 ml-1">
              You&apos;ll be notified when stock drops to or below this number
            </p>
          </div>

          {/* Stock Status Indicator */}
          {inventoryCount !== '' && refillThreshold !== '' && (
            <div className={`p-4 rounded-2xl ${isLowStock ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <div className="flex items-center gap-3">
                {isLowStock ? (
                  <>
                    <AlertTriangle size={20} className="text-amber-600" />
                    <div>
                      <p className="font-bold text-amber-800 text-sm">Low Stock Alert</p>
                      <p className="text-xs text-amber-600">
                        {inventoryCount} units remaining (threshold: {refillThreshold})
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Package size={20} className="text-emerald-600" />
                    <div>
                      <p className="font-bold text-emerald-800 text-sm">Stock Level Good</p>
                      <p className="text-xs text-emerald-600">
                        {inventoryCount} units remaining (threshold: {refillThreshold})
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-2">
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
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-2xl font-black bg-[#004c56ff] hover:bg-[#003a42] text-white shadow-xl shadow-[#004c5633] gap-2"
            >
              {isSubmitting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Save size={18} />
                </motion.div>
              ) : <Save size={18} />}
              {isSubmitting ? 'Saving...' : 'Save Inventory'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
