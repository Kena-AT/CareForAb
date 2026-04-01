"use client";

import { memo } from 'react';
import { Droplets, Heart, TrendingDown, TrendingUp, Minus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  BloodSugarReading, 
  BloodPressureReading, 
  getGlucoseStatus, 
  getBPStatus 
} from '@/types/health';

interface BaseReadingCardProps<T = BloodSugarReading | BloodPressureReading> {
  showActions?: boolean;
  compact?: boolean;
  onEdit?: (reading: T) => void;
  onDelete?: (readingId: string) => void;
}

interface BloodSugarCardProps extends BaseReadingCardProps<BloodSugarReading> {
  reading: BloodSugarReading;
}

export const BloodSugarCard = memo(({ 
  reading, 
  onEdit, 
  onDelete, 
  showActions = false, 
  compact = false 
}: BloodSugarCardProps) => {
  const status = getGlucoseStatus(reading.value, reading.unit);
  
  const statusConfig = {
    low: { bg: 'bg-amber-50', text: 'text-amber-600', icon: TrendingDown, label: 'Low' },
    normal: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: Minus, label: 'Normal' },
    high: { bg: 'bg-rose-50', text: 'text-rose-600', icon: TrendingUp, label: 'High' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={cn(
      "transition-all duration-300 border-none", 
      config.bg, 
      compact ? "p-0" : "shadow-md hover:shadow-lg"
    )}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className={cn("flex items-center gap-4", compact && "gap-3")}>
          <div className={cn(
            "flex items-center justify-center rounded-2xl bg-white shadow-sm",
            compact ? "h-10 w-10" : "h-14 w-14"
          )}>
            <Droplets className={cn(
              compact ? "h-5 w-5" : "h-7 w-7", 
              config.text
            )} />
          </div>
          
          <div className={cn("flex-1 min-w-0")}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Glucose</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={cn(
                "font-black text-slate-900",
                compact ? "text-lg" : "text-2xl"
              )}>
                {reading.value}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {reading.unit}
              </span>
            </div>
            {!compact && (
              <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400 mt-1">
                Measured {reading.meal_type.replace('_', ' ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5",
              "bg-white shadow-sm border border-slate-100"
            )}>
              <Icon className={cn("h-3 w-3", config.text)} />
              <span className={cn("text-[10px] font-black uppercase tracking-widest", config.text)}>
                {config.label}
              </span>
            </div>
            
            {showActions && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 italic">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(reading)} className="rounded-lg text-xs font-bold">
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Edit Entry
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(reading.id)}
                      className="text-destructive rounded-lg text-xs font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

BloodSugarCard.displayName = "BloodSugarCard";

interface BloodPressureCardProps extends BaseReadingCardProps<BloodPressureReading> {
  reading: BloodPressureReading;
}

export const BloodPressureCard = memo(({ 
  reading, 
  onEdit, 
  onDelete, 
  showActions = false, 
  compact = false 
}: BloodPressureCardProps) => {
  const status = getBPStatus(reading.systolic, reading.diastolic);
  
  const statusConfig = {
    low: { bg: 'bg-sky-50', text: 'text-sky-600', label: 'Low' },
    normal: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Normal' },
    elevated: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Elevated' },
    high: { bg: 'bg-rose-50', text: 'text-rose-600', label: 'High' },
  };

  const config = statusConfig[status];

  return (
    <Card className={cn(
      "transition-all duration-300 border-none", 
      config.bg, 
      compact ? "p-0" : "shadow-md hover:shadow-lg"
    )}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className={cn("flex items-center gap-4", compact && "gap-3")}>
          <div className={cn(
            "flex items-center justify-center rounded-2xl bg-white shadow-sm",
            compact ? "h-10 w-10" : "h-14 w-14"
          )}>
            <Heart className={cn(
              compact ? "h-5 w-5" : "h-7 w-7", 
              config.text
            )} />
          </div>
          
          <div className={cn("flex-1 min-w-0")}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Pressure</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={cn(
                "font-black text-slate-900",
                compact ? "text-lg" : "text-2xl"
              )}>
                {reading.systolic}/{reading.diastolic}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                mmHg
              </span>
            </div>
            {reading.pulse && (
              <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400 mt-1">
                PULSE {reading.pulse} BPM
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
             <div className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5",
              "bg-white shadow-sm border border-slate-100"
            )}>
              <span className={cn("text-[10px] font-black uppercase tracking-widest", config.text)}>
                {config.label}
              </span>
            </div>
            
            {showActions && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 italic">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(reading)} className="rounded-lg text-xs font-bold">
                      <Edit className="h-3.5 w-3.5 mr-2" />
                      Edit Entry
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(reading.id)}
                      className="text-destructive rounded-lg text-xs font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

BloodPressureCard.displayName = "BloodPressureCard";
