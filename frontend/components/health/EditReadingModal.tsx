import { useState, useEffect } from 'react';
import { Droplets, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { BloodSugarReading, BloodPressureReading } from '@/types/health';

interface EditReadingModalProps {
  type: 'blood_sugar' | 'blood_pressure';
  reading: BloodSugarReading | BloodPressureReading;
  onClose: () => void;
  onUpdate: (readingId: string, updates: Partial<BloodSugarReading | BloodPressureReading>) => Promise<any>;
  onDelete: (readingId: string) => Promise<void>;
}

export const EditReadingModal = ({ 
  type, 
  reading, 
  onClose, 
  onUpdate,
  onDelete 
}: EditReadingModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Blood sugar state
  const [glucoseValue, setGlucoseValue] = useState('');
  const [unit, setUnit] = useState<'mg/dL' | 'mmol/L'>('mg/dL');
  const [mealType, setMealType] = useState<BloodSugarReading['meal_type']>('fasting');
  const [notes, setNotes] = useState('');
  
  // Blood pressure state
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [bpNotes, setBpNotes] = useState('');

  useEffect(() => {
    if (type === 'blood_sugar') {
      const bsReading = reading as BloodSugarReading;
      setGlucoseValue(bsReading.value.toString());
      setUnit(bsReading.unit);
      setMealType(bsReading.meal_type);
      setNotes(bsReading.notes || '');
    } else {
      const bpReading = reading as BloodPressureReading;
      setSystolic(bpReading.systolic.toString());
      setDiastolic(bpReading.diastolic.toString());
      setPulse(bpReading.pulse?.toString() || '');
      setBpNotes(bpReading.notes || '');
    }
  }, [reading, type]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (type === 'blood_sugar') {
        const value = parseFloat(glucoseValue);
        if (isNaN(value) || value < 20 || value > 600) {
          return;
        }
        await onUpdate(reading.id, {
          value,
          unit,
          meal_type: mealType,
          notes: notes.trim() || null
        });
      } else {
        const sys = parseInt(systolic);
        const dia = parseInt(diastolic);
        const pul = pulse ? parseInt(pulse) : undefined;
        
        if (isNaN(sys) || sys < 70 || sys > 250 || isNaN(dia) || dia < 40 || dia > 150) {
          return;
        }
        await onUpdate(reading.id, {
          systolic: sys,
          diastolic: dia,
          pulse: pul,
          notes: bpNotes.trim() || null
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reading?')) return;
    
    setIsDeleting(true);
    try {
      await onDelete(reading.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
      <Card className="w-full max-w-md mx-4 mb-4 sm:mb-0 animate-scale-in">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-3 text-title">
            {type === 'blood_sugar' ? (
              <>
                <Droplets className="h-6 w-6 text-primary" />
                Edit Blood Sugar
              </>
            ) : (
              <>
                <Heart className="h-6 w-6 text-accent" />
                Edit Blood Pressure
              </>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {type === 'blood_sugar' ? (
            <>
              <div className="space-y-2">
                <Label className="text-body">Blood Sugar Value</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    placeholder="120"
                    value={glucoseValue}
                    onChange={(e) => setGlucoseValue(e.target.value)}
                    className="text-headline h-16 text-center text-2xl"
                    min={20}
                    max={600}
                  />
                  <Select value={unit} onValueChange={(v) => setUnit(v as 'mg/dL' | 'mmol/L')}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mg/dL">mg/dL</SelectItem>
                      <SelectItem value="mmol/L">mmol/L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-body">When was this taken?</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as BloodSugarReading['meal_type'])}>
                  <SelectTrigger className="h-14">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                    <SelectItem value="fasting">Fasting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-body">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-body">Systolic (top)</Label>
                  <Input
                    type="number"
                    placeholder="120"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="h-16 text-center text-xl"
                    min={70}
                    max={250}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-body">Diastolic (bottom)</Label>
                  <Input
                    type="number"
                    placeholder="80"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="h-16 text-center text-xl"
                    min={40}
                    max={150}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-body">Pulse (optional)</Label>
                <Input
                  type="number"
                  placeholder="72"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="h-14 text-center"
                  min={40}
                  max={200}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-body">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={bpNotes}
                  onChange={(e) => setBpNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


