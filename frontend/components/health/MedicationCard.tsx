import { Check, Clock, Pill, Edit, Trash2, MoreVertical } from 'lucide-react';
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
  log: MedicationLog;
  onMarkTaken: (logId: string) => void;
  onEdit?: (medication: Medication) => void;
  onDelete?: (medicationId: string) => void;
  showActions?: boolean;
}

export const MedicationCard = ({ medication, log, onMarkTaken, onEdit, onDelete, showActions = false }: MedicationCardProps) => {
  const isTaken = log.status === 'taken';
  const isPending = log.status === 'pending';

  return (
    <Card className={cn(
      "transition-all duration-300 animate-fade-in",
      isTaken && "bg-success/10 border-success/30",
      isPending && "bg-card border-primary/20"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            isTaken ? "bg-success/20" : "bg-primary/10"
          )}>
            <Pill className={cn(
              "h-7 w-7",
              isTaken ? "text-success" : "text-primary"
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-title truncate">{medication.name}</h3>
            <p className="text-body text-muted-foreground">{medication.dosage}</p>
            <div className="flex items-center gap-1 mt-1 text-label text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{log.scheduled_time}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showActions && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(medication)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(medication.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isPending ? (
              <Button
                variant="success"
                size="lg"
                onClick={() => onMarkTaken(log.id)}
                className="shrink-0"
              >
                <Check className="h-5 w-5" />
                <span className="sr-only md:not-sr-only md:ml-2">Take</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-success font-semibold">
                <Check className="h-6 w-6" />
                <span className="text-label">Taken</span>
              </div>
            )}
          </div>
        </div>
        
        {medication.notes && (
          <p className="mt-3 text-label text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            {medication.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
