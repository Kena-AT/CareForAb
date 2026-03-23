"use client";

import { useState } from 'react';
import { Droplets, Heart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { BloodSugarChart, BloodPressureChart } from '@/components/health/HealthChart';
import { BloodSugarCard, BloodPressureCard } from '@/components/health/ReadingCard';
import { QuickAddModal } from '@/components/health/QuickAddModal';
import { EditReadingModal } from '@/components/health/EditReadingModal';
import { BloodSugarReading, BloodPressureReading } from '@/types/health';

interface ReadingsScreenProps {
  bloodSugarReadings: BloodSugarReading[];
  bloodPressureReadings: BloodPressureReading[];
  onAddBloodSugar: (reading: Omit<BloodSugarReading, 'id' | 'recorded_at'>) => void;
  onAddBloodPressure: (reading: Omit<BloodPressureReading, 'id' | 'recorded_at'>) => void;
  onUpdateBloodSugar?: (readingId: string, updates: Partial<BloodSugarReading>) => Promise<any>;
  onDeleteBloodSugar?: (readingId: string) => Promise<void>;
  onUpdateBloodPressure?: (readingId: string, updates: Partial<BloodPressureReading>) => Promise<any>;
  onDeleteBloodPressure?: (readingId: string) => Promise<void>;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
}

export const ReadingsScreen = ({
  bloodSugarReadings,
  bloodPressureReadings,
  onAddBloodSugar,
  onAddBloodPressure,
  onUpdateBloodSugar,
  onDeleteBloodSugar,
  onUpdateBloodPressure,
  onDeleteBloodPressure,
  onNotificationsClick,
  onSettingsClick,
}: ReadingsScreenProps) => {
  const [addModal, setAddModal] = useState<'blood_sugar' | 'blood_pressure' | null>(null);
  const [editReading, setEditReading] = useState<{ type: 'blood_sugar' | 'blood_pressure'; reading: BloodSugarReading | BloodPressureReading } | null>(null);

  const recentBloodSugar = bloodSugarReadings.slice(0, 5);
  const recentBloodPressure = bloodPressureReadings.slice(0, 5);

  return (
    <div className="min-h-screen pb-24">
      <Header 
        title="Health Readings" 
        subtitle="Track your vitals over time"
        onNotificationsClick={onNotificationsClick}
        onSettingsClick={onSettingsClick}
      />
      
      <main className="px-4 py-6">
        <Tabs defaultValue="blood_sugar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 mb-6">
            <TabsTrigger value="blood_sugar" className="text-body h-12 gap-2">
              <Droplets className="h-5 w-5" />
              Blood Sugar
            </TabsTrigger>
            <TabsTrigger value="blood_pressure" className="text-body h-12 gap-2">
              <Heart className="h-5 w-5" />
              Blood Pressure
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blood_sugar" className="space-y-6">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setAddModal('blood_sugar')}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Blood Sugar Reading
            </Button>

            <BloodSugarChart readings={bloodSugarReadings} />

            <section>
              <h2 className="text-title mb-4">Recent Readings</h2>
              <div className="space-y-3">
                {recentBloodSugar.map((reading) => (
                  <BloodSugarCard 
                    key={reading.id} 
                    reading={reading}
                    showActions={true}
                    onEdit={(reading) => setEditReading({ type: 'blood_sugar', reading })}
                    onDelete={onDeleteBloodSugar}
                  />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="blood_pressure" className="space-y-6">
            <Button 
              className="w-full" 
              size="lg"
              variant="accent"
              onClick={() => setAddModal('blood_pressure')}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Blood Pressure Reading
            </Button>

            <BloodPressureChart readings={bloodPressureReadings} />

            <section>
              <h2 className="text-title mb-4">Recent Readings</h2>
              <div className="space-y-3">
                {recentBloodPressure.map((reading) => (
                  <BloodPressureCard 
                    key={reading.id} 
                    reading={reading}
                    showActions={true}
                    onEdit={(reading) => setEditReading({ type: 'blood_pressure', reading })}
                    onDelete={onDeleteBloodPressure}
                  />
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>

      {addModal && (
        <QuickAddModal
          type={addModal}
          onClose={() => setAddModal(null)}
          onAddBloodSugar={onAddBloodSugar}
          onAddBloodPressure={onAddBloodPressure}
        />
      )}

      {editReading && onUpdateBloodSugar && onUpdateBloodPressure && onDeleteBloodSugar && onDeleteBloodPressure && (
        <EditReadingModal
          type={editReading.type}
          reading={editReading.reading}
          onClose={() => setEditReading(null)}
          onUpdate={editReading.type === 'blood_sugar' ? onUpdateBloodSugar : onUpdateBloodPressure}
          onDelete={editReading.type === 'blood_sugar' ? onDeleteBloodSugar : onDeleteBloodPressure}
        />
      )}
    </div>
  );
};
