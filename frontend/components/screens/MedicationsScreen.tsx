"use client";

import { useState } from 'react';
import { Plus, Pill, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { MedicationCard } from '@/components/health/MedicationCard';
import { AddMedicationModal } from '@/components/health/AddMedicationModal';
import { EditMedicationModal } from '@/components/health/EditMedicationModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Medication, MedicationLog } from '@/types/health';
import { Card, CardContent } from '@/components/ui/card';

interface MedicationsScreenProps {
  medications: Medication[];
  medicationLogs: MedicationLog[];
  onMarkMedicationTaken: (logId: string) => void;
  onAddMedication: (medication: Omit<Medication, 'id' | 'created_at' | 'is_active'>) => Promise<any>;
  onUpdateMedication?: (medicationId: string, updates: Partial<Medication>) => Promise<any>;
  onDeleteMedication?: (medicationId: string) => Promise<void>;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
}

export const MedicationsScreen = ({
  medications,
  medicationLogs,
  onMarkMedicationTaken,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onNotificationsClick,
  onSettingsClick,
}: MedicationsScreenProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = medicationLogs.filter(log => log.date === today);

  return (
    <div className="min-h-screen pb-24">
      <Header 
        title="Medications" 
        subtitle="Manage your daily medications"
        onNotificationsClick={onNotificationsClick}
        onSettingsClick={onSettingsClick}
      />
      
      <main className="px-4 py-6 space-y-6">
        <Button className="w-full" size="lg" onClick={() => setShowAddModal(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Add New Medication
        </Button>

        <section>
          <h2 className="text-title mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            {todayLogs.length > 0 ? (
              todayLogs.map((log) => {
                const medication = medications.find(m => m.id === log.medication_id);
                if (!medication) return null;
                return (
                  <MedicationCard
                    key={log.id}
                    medication={medication}
                    log={log}
                    onMarkTaken={onMarkMedicationTaken}
                    showActions={true}
                    onEdit={onUpdateMedication ? (med) => setEditingMedication(med) : undefined}
                    onDelete={onDeleteMedication}
                  />
                );
              })
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-6 text-center">
                  <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-body text-muted-foreground">No medications scheduled for today</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-title mb-4">All Medications</h2>
          <div className="space-y-3">
            {medications.length > 0 ? (
              medications.map((medication) => {
                const todayLog = todayLogs.find(log => log.medication_id === medication.id);
                if (todayLog) {
                  return (
                    <MedicationCard
                      key={medication.id}
                      medication={medication}
                      log={todayLog}
                      onMarkTaken={onMarkMedicationTaken}
                      showActions={true}
                      onEdit={onUpdateMedication ? (med) => setEditingMedication(med) : undefined}
                      onDelete={onDeleteMedication}
                    />
                  );
                }
                return (
                  <Card key={medication.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-title">{medication.name}</h3>
                        <p className="text-body text-muted-foreground">{medication.dosage}</p>
                        <p className="text-label text-muted-foreground mt-1">
                          {medication.frequency} at {medication.times.join(', ')}
                        </p>
                      </div>
                      {onUpdateMedication && onDeleteMedication && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingMedication(medication)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDeleteMedication(medication.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-6 text-center">
                  <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-body text-muted-foreground">No medications added yet</p>
                  <p className="text-label text-muted-foreground">Tap the button above to add your first medication</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>

      {showAddModal && (
        <AddMedicationModal
          onClose={() => setShowAddModal(false)}
          onAdd={onAddMedication}
        />
      )}

      {editingMedication && onUpdateMedication && (
        <EditMedicationModal
          medication={editingMedication}
          onClose={() => setEditingMedication(null)}
          onUpdate={onUpdateMedication}
        />
      )}
    </div>
  );
};
