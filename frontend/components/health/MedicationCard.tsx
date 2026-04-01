"use client";

import { memo } from 'react';
import { Check, Clock, Pill, Edit, Trash2, MoreVertical, Syringe, Droplets, Bandage, Wind, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Medication, MedicationLog } from '@/types/health';
import { cn } from '@/lib/utils';

interface MedicationCardProps {
  medication: Medication;
  log?: MedicationLog;
  status?: 'pending' | 'taken' | 'missed' | 'skipped';
  scheduledTime?: string;
  onMarkTaken: (logId?: string, medicationId?: string, scheduledTime?: string) => void;
  onEdit?: (medication: Medication) => void;
  onDelete?: (medicationId: string) => void;
  showActions?: boolean;
}

// Memoize the MedicationCard to prevent unnecessary re-renders in large lists
export const MedicationCard = memo(({ 
  medication, 
  log, 
  status, 
  scheduledTime, 
  onMarkTaken, 
  onEdit, 
  onDelete, 
  showActions = false 
}: MedicationCardProps) => {
  const cardStatus = status || log?.status || 'pending';
  const cardTime = scheduledTime || log?.scheduled_time || '--:--';
  const cardLogId = log?.id;

  const isTaken = cardStatus === 'taken';
  const isPending = cardStatus === 'pending';

  return (
    <Card className={cn(
      "transition-all duration-300",
      isTaken && "bg-success/5 border-success/20 shadow-sm", // Reduced opacity for background and subtle border
      isPending && "bg-white border-slate-200/50 shadow-md hover:shadow-lg"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
             "flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl transition-transform",
             isTaken ? "bg-success/10" : "bg-primary/10"
           )}>
             {medication.form_type === 'injection' ? (
                <Syringe className={cn("h-6 w-6 md:h-7 md:w-7", isTaken ? "text-success" : "text-primary")} />
              ) : medication.form_type === 'liquid' ? (
                <Droplets className={cn("h-6 w-6 md:h-7 md:w-7", isTaken ? "text-success" : "text-primary")} />
              ) : medication.form_type === 'patch' ? (
                <Bandage className={cn("h-6 w-6 md:h-7 md:w-7", isTaken ? "text-success" : "text-primary")} />
              ) : medication.form_type === 'inhaler' ? (
                <Wind className={cn("h-6 w-6 md:h-7 md:w-7", isTaken ? "text-success" : "text-primary")} />
              ) : medication.form_type === 'other' ? (
                <Microscope className={cn("h-6 w-6 md:h-7 md:w-7", isTaken ? "text-success" : "text-primary")} />
              ) : (
                <Pill className={cn("h-6 w-6 md:h-7 md:w-7", isTaken ? "text-success" : "text-primary")} />
              )}
           </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-black truncate text-slate-900 leading-tight">{medication.name}</h3>
            <p className="text-xs font-bold text-slate-400 mt-0.5">{medication.dosage}</p>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Clock className="h-3 w-3" />
              <span>Scheduled {cardTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showActions && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-50 transition-colors">
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 italic">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(medication)} className="rounded-lg">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(medication.id)}
                      className="text-destructive rounded-lg"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isPending ? (
              <Button
                onClick={() => onMarkTaken(cardLogId, medication.id, cardTime)}
                className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Check className="h-4 w-4 mr-2" />
                Take Dose
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Taken</span>
              </div>
            )}
          </div>
        </div>
        
        {medication.notes && (
          <div className="mt-4 pt-3 border-t border-slate-50">
            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
              {medication.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MedicationCard.displayName = "MedicationCard";
