"use client";

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
  onEdit?: (reading: BloodSugarReading) => void;
  onDelete?: (readingId: string) => void;
}

export const BloodSugarCard = ({ 
  reading, 
  onEdit, 
  onDelete, 
  showActions = false, 
  compact = false 
}: BloodSugarCardProps) => {
  const status = getGlucoseStatus(reading.value, reading.unit);
  
  const statusConfig = {
    low: { bg: 'bg-warning/10', text: 'text-warning', icon: TrendingDown, label: 'Low' },
    normal: { bg: 'bg-success/10', text: 'text-success', icon: Minus, label: 'Normal' },
    high: { bg: 'bg-destructive/10', text: 'text-destructive', icon: TrendingUp, label: 'High' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={cn("animate-fade-in", config.bg, compact && "!p-0")}>
      <CardContent className={cn("p-4", compact && "!p-3")}>
        <div className={cn("flex items-center gap-4", compact && "gap-3")}>
          <div className={cn(
            "flex items-center justify-center rounded-full bg-card",
            compact ? "h-10 w-10" : "h-14 w-14"
          )}>
            <Droplets className={cn(
              compact ? "h-5 w-5" : "h-7 w-7", 
              config.text
            )} />
          </div>
          
          <div className={cn("flex-1 min-w-0", compact && "space-y-0.5")}>
            <p className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-label"
            )}>Blood Sugar</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "font-semibold",
                compact ? "text-lg" : "text-headline"
              )}>
                {reading.value}
              </span>
              <span className={cn(
                "text-muted-foreground",
                compact ? "text-xs" : "text-body"
              )}>
                {reading.unit}
              </span>
            </div>
            {!compact && (
              <p className={cn(
                "text-muted-foreground mt-0.5",
                compact ? "text-xs" : "text-label"
              )}>
                {reading.meal_type.replace('_', ' ')}
              </p>
            )}
          </div>

          <div className={cn("flex items-center gap-2", compact && "flex-col-reverse items-end")}>
            <div className={cn(
              "flex items-center gap-1 rounded-full",
              config.bg,
              compact ? "px-2 py-1 text-xs" : "px-3 py-1.5"
            )}>
              <Icon className={cn(
                compact ? "h-3 w-3" : "h-4 w-4", 
                config.text
              )} />
              <span className={cn("font-semibold", config.text)}>
                {config.label}
              </span>
            </div>
            
            {showActions && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size={compact ? "icon" : "default"} 
                    className={cn(
                      compact ? "h-7 w-7" : "h-8 w-8",
                      "text-muted-foreground"
                    )}
                  >
                    <MoreVertical className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(reading)}>
                      <Edit className="h-4 w-4 mr-2" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(reading.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span>Delete</span>
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
};

interface BloodPressureCardProps extends BaseReadingCardProps<BloodPressureReading> {
  reading: BloodPressureReading;
  onEdit?: (reading: BloodPressureReading) => void;
  onDelete?: (readingId: string) => void;
}

export const BloodPressureCard = ({ 
  reading, 
  onEdit, 
  onDelete, 
  showActions = false, 
  compact = false 
}: BloodPressureCardProps) => {
  const status = getBPStatus(reading.systolic, reading.diastolic);
  
  const statusConfig = {
    low: { bg: 'bg-info/10', text: 'text-info', label: 'Low' },
    normal: { bg: 'bg-success/10', text: 'text-success', label: 'Normal' },
    elevated: { bg: 'bg-warning/10', text: 'text-warning', label: 'Elevated' },
    high: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'High' },
  };

  const config = statusConfig[status];

  return (
    <Card className={cn("animate-fade-in", config.bg, compact && "!p-0")}>
      <CardContent className={cn("p-4", compact && "!p-3")}>
        <div className={cn("flex items-center gap-4", compact && "gap-3")}>
          <div className={cn(
            "flex items-center justify-center rounded-full bg-card",
            compact ? "h-10 w-10" : "h-14 w-14"
          )}>
            <Heart className={cn(
              compact ? "h-5 w-5" : "h-7 w-7", 
              config.text
            )} />
          </div>
          
          <div className={cn("flex-1 min-w-0", compact && "space-y-0.5")}>
            <p className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-label"
            )}>Blood Pressure</p>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "font-semibold",
                compact ? "text-lg" : "text-headline"
              )}>
                {reading.systolic}/{reading.diastolic}
              </span>
              <span className={cn(
                "text-muted-foreground",
                compact ? "text-xs" : "text-body"
              )}>
                mmHg
              </span>
            </div>
            {reading.pulse && (
              <p className={cn(
                "text-muted-foreground mt-0.5",
                compact ? "text-xs" : "text-label"
              )}>
                Pulse: {reading.pulse} bpm
              </p>
            )}
          </div>

          <div className={cn("flex items-center gap-2", compact && "flex-col-reverse items-end")}>
            <div className={cn(
              "flex items-center gap-1 rounded-full",
              config.bg,
              compact ? "px-2 py-1 text-xs" : "px-3 py-1.5"
            )}>
              <span className={cn("font-semibold", config.text)}>
                {config.label}
              </span>
            </div>
            
            {showActions && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size={compact ? "icon" : "default"} 
                    className={cn(
                      compact ? "h-7 w-7" : "h-8 w-8",
                      "text-muted-foreground"
                    )}
                  >
                    <MoreVertical className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(reading)}>
                      <Edit className="h-4 w-4 mr-2" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(reading.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span>Delete</span>
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
};
