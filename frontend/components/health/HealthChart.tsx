import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BloodSugarReading, BloodPressureReading } from '@/types/health';

interface BloodSugarChartProps {
  readings: BloodSugarReading[];
}

export const BloodSugarChart = ({ readings }: BloodSugarChartProps) => {
  const chartData = useMemo(() => {
    return readings
      .slice(-14)
      .map(reading => ({
        date: new Date(reading.recorded_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        value: reading.value,
      }));
  }, [readings]);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-title">Blood Sugar Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[60, 200]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                name="Blood Sugar (mg/dL)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-label">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-glucose-low" />
            <span>Low (&lt;70)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-glucose-normal" />
            <span>Normal (70-140)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-glucose-high" />
            <span>High (&gt;140)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface BloodPressureChartProps {
  readings: BloodPressureReading[];
}

export const BloodPressureChart = ({ readings }: BloodPressureChartProps) => {
  const chartData = useMemo(() => {
    return readings
      .slice(-14)
      .map(reading => ({
        date: new Date(reading.recorded_at).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        systolic: reading.systolic,
        diastolic: reading.diastolic,
      }));
  }, [readings]);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-title">Blood Pressure Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[50, 180]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="systolic" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
                name="Systolic"
              />
              <Line 
                type="monotone" 
                dataKey="diastolic" 
                stroke="hsl(var(--info))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--info))', strokeWidth: 2, r: 4 }}
                name="Diastolic"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
