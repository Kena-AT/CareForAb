import { useState } from 'react';
import { Droplets, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BloodSugarReading, BloodPressureReading } from '@/types/health';

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
  const { toast } = useToast();
  
  // Blood sugar state
  const [glucoseValue, setGlucoseValue] = useState('');
  const [mealContext, setMealContext] = useState<BloodSugarReading['meal_context']>('fasting');
  
  // Blood pressure state
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');

  const handleSubmit = () => {
    if (type === 'blood_sugar') {
      const value = parseInt(glucoseValue);
      if (isNaN(value) || value < 20 || value > 600) {
        toast({
          title: 'Invalid Value',
          description: 'Please enter a blood sugar value between 20 and 600 mg/dL',
          variant: 'destructive',
        });
        return;
      }
      onAddBloodSugar({ value, unit: 'mg/dL', meal_context: mealContext });
      toast({
        title: 'Reading Saved',
        description: `Blood sugar: ${value} mg/dL`,
      });
    } else {
      const sys = parseInt(systolic);
      const dia = parseInt(diastolic);
      const pul = pulse ? parseInt(pulse) : undefined;
      
      if (isNaN(sys) || sys < 70 || sys > 250 || isNaN(dia) || dia < 40 || dia > 150) {
        toast({
          title: 'Invalid Values',
          description: 'Please enter valid blood pressure values',
          variant: 'destructive',
        });
        return;
      }
      onAddBloodPressure({ systolic: sys, diastolic: dia, pulse: pul });
      toast({
        title: 'Reading Saved',
        description: `Blood pressure: ${sys}/${dia} mmHg`,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/20 backdrop-blur-sm sm:items-center">
      <Card className="w-full max-w-md mx-4 mb-4 sm:mb-0 animate-scale-in">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-3 text-title">
            {type === 'blood_sugar' ? (
              <>
                <Droplets className="h-6 w-6 text-primary" />
                Add Blood Sugar
              </>
            ) : (
              <>
                <Heart className="h-6 w-6 text-accent" />
                Add Blood Pressure
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
                  <span className="text-body text-muted-foreground shrink-0">mg/dL</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-body">When was this taken?</Label>
                <Select value={mealContext} onValueChange={(v) => setMealContext(v as BloodSugarReading['meal_context'])}>
                  <SelectTrigger className="h-14">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fasting">Fasting (morning)</SelectItem>
                    <SelectItem value="before_meal">Before meal</SelectItem>
                    <SelectItem value="after_meal">After meal (2 hours)</SelectItem>
                    <SelectItem value="bedtime">Bedtime</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
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
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Save Reading
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
