"use client";

import { useState, useMemo } from 'react';
import { Droplets, Heart, Plus, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { useIsMobile, useIsTablet } from '@/hooks/use-media-query';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { MedicationCard } from '@/components/health/MedicationCard';
import { BloodSugarCard, BloodPressureCard } from '@/components/health/ReadingCard';
import { QuickAddModal } from '@/components/health/QuickAddModal';
import { EditReadingModal } from '@/components/health/EditReadingModal';
import { Medication, MedicationLog, BloodSugarReading, BloodPressureReading } from '@/types/health';

interface DashboardScreenProps {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  bloodSugarReadings: BloodSugarReading[];
  bloodPressureReadings: BloodPressureReading[];
  onMarkMedicationTaken: (logId: string) => void;
  onAddBloodSugar: (reading: Omit<BloodSugarReading, 'id' | 'recorded_at'>) => void;
  onAddBloodPressure: (reading: Omit<BloodPressureReading, 'id' | 'recorded_at'>) => void;
  onUpdateBloodSugar?: (readingId: string, updates: Partial<Omit<BloodSugarReading, 'id' | 'recorded_at'>>) => Promise<void>;
  onDeleteBloodSugar?: (readingId: string) => Promise<void>;
  onUpdateBloodPressure?: (readingId: string, updates: Partial<Omit<BloodPressureReading, 'id' | 'recorded_at'>>) => Promise<void>;
  onDeleteBloodPressure?: (readingId: string) => Promise<void>;
  onNavigate: (tab: 'medications' | 'readings') => void;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  userName?: string | null;
}

export const DashboardScreen = ({
  medications,
  medicationLogs,
  bloodSugarReadings,
  bloodPressureReadings,
  onMarkMedicationTaken,
  onAddBloodSugar,
  onAddBloodPressure,
  onUpdateBloodSugar,
  onDeleteBloodSugar,
  onUpdateBloodPressure,
  onDeleteBloodPressure,
  onNavigate,
  onNotificationsClick,
  onSettingsClick,
  userName,
}: DashboardScreenProps) => {
  const [addModal, setAddModal] = useState<'blood_sugar' | 'blood_pressure' | null>(null);
  const [editReading, setEditReading] = useState<{ type: 'blood_sugar' | 'blood_pressure'; reading: BloodSugarReading | BloodPressureReading } | null>(null);

  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isCompact = isMobile || isTablet;

  const today = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }), []);

  const todayLogs = medicationLogs.filter(log => {
    const logDate = new Date(log.date).toDateString();
    return logDate === new Date().toDateString();
  });

  const pendingMeds = todayLogs.filter(log => log.status === 'pending');
  const takenMeds = todayLogs.filter(log => log.status === 'taken');

  const latestBloodSugar = bloodSugarReadings[0];
  const latestBloodPressure = bloodPressureReadings[0];

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={getTimeBasedGreeting(userName)}
        subtitle={today}
        onNotificationsClick={onNotificationsClick}
        onSettingsClick={onSettingsClick}
      />

      <main className="px-4 py-6 space-y-6">
        {/* Quick Status Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-display text-success">{takenMeds.length}</p>
                <p className="text-label text-muted-foreground">Taken</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-display text-warning">{pendingMeds.length}</p>
                <p className="text-label text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setAddModal('blood_sugar')}
            className="h-20 flex-col gap-2 border-2 border-dashed hover:border-primary hover:bg-primary/5"
          >
            <Droplets className="h-6 w-6 text-primary" />
            <span className="text-label">Add Blood Sugar</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setAddModal('blood_pressure')}
            className="h-20 flex-col gap-2 border-2 border-dashed hover:border-accent hover:bg-accent/5"
          >
            <Heart className="h-6 w-6 text-accent" />
            <span className="text-label">Add Blood Pressure</span>
          </Button>
        </div>

        {/* Today's Medications */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-title">Today's Medications</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('medications')}
              className="text-primary"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {pendingMeds.slice(0, 3).map((log) => {
              const medication = medications.find(m => m.id === log.medication_id);
              if (!medication) return null;
              return (
                <MedicationCard
                  key={log.id}
                  medication={medication}
                  log={log}
                  onMarkTaken={onMarkMedicationTaken}
                />
              );
            })}
            {pendingMeds.length === 0 && (
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                  <p className="text-title text-success">All done for now!</p>
                  <p className="text-body text-muted-foreground">Great job taking your medications</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Latest Readings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-title">Latest Readings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('readings')}
              className="text-primary"
            >
              View Trends
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {latestBloodSugar && (
              <BloodSugarCard
                reading={latestBloodSugar}
                showActions={!isMobile}
                compact={isCompact}
                onEdit={(reading) => setEditReading({ type: 'blood_sugar', reading })}
                onDelete={onDeleteBloodSugar}
              />
            )}
            {latestBloodPressure && (
              <BloodPressureCard
                reading={latestBloodPressure}
                showActions={!isMobile}
                compact={isCompact}
                onEdit={(reading) => setEditReading({ type: 'blood_pressure', reading })}
                onDelete={onDeleteBloodPressure}
              />
            )}
          </div>
        </section>
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
