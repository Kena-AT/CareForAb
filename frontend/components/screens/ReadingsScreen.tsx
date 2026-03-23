"use client";

import { useState } from 'react';
import { Droplets, Heart, Plus, Activity, TrendingUp, History, Filter, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BloodSugarChart, BloodPressureChart } from '@/components/health/HealthChart';
import { BloodSugarCard, BloodPressureCard } from '@/components/health/ReadingCard';
import { QuickAddModal } from '@/components/health/QuickAddModal';
import { EditReadingModal } from '@/components/health/EditReadingModal';
import { BloodSugarReading, BloodPressureReading } from '@/types/health';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

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
  const [activeTab, setActiveTab] = useState('blood_sugar');

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      {/* Header - Design xhcoB */}
      <header className="sticky top-0 z-40 h-16 bg-[#f6fafacc] backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="h-6 w-1 bg-accent rounded-full" />
           <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Health Diagnostics</p>
        </div>
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={onNotificationsClick} className="w-10 h-10 rounded-xl hover:bg-slate-50 group">
             <Bell size={18} className="text-slate-500 group-hover:text-primary transition-colors" />
           </Button>
           <Button variant="ghost" size="icon" onClick={onSettingsClick} className="w-10 h-10 rounded-xl hover:bg-slate-50 group">
             <Settings size={18} className="text-slate-500 group-hover:text-primary transition-colors" />
           </Button>
        </div>
      </header>

      <main className="px-10 py-10 max-w-7xl mx-auto space-y-10">
        <Tabs defaultValue="blood_sugar" className="w-full space-y-10" onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <TabsList className="bg-white p-1 rounded-[20px] border border-slate-100 shadow-sm w-full md:w-auto h-auto">
              <TabsTrigger 
                value="blood_sugar" 
                className="rounded-[16px] py-3 px-8 data-[state=active]:bg-[#f0fdfaff] data-[state=active]:text-primary transition-all font-black text-xs uppercase tracking-wider gap-2 h-11"
              >
                <Droplets size={16} />
                Glucose
              </TabsTrigger>
              <TabsTrigger 
                value="blood_pressure" 
                className="rounded-[16px] py-3 px-8 data-[state=active]:bg-[#f0fdfaff] data-[state=active]:text-primary transition-all font-black text-xs uppercase tracking-wider gap-2 h-11"
              >
                <Heart size={16} />
                Pressure
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setAddModal(activeTab as 'blood_sugar' | 'blood_pressure')}
                className="bg-[#004c56ff] hover:bg-[#003a42] text-white rounded-[20px] h-12 px-8 font-black shadow-lg shadow-[#004c5633]"
              >
                <Plus size={18} className="mr-2" /> Add Log
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="blood_sugar" className="m-0 space-y-10">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Glucose Analytics</h3>
                  </div>
                  <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white p-10 rounded-[20px]">
                    <div className="space-y-8">
                       <div className="h-[300px] w-full">
                         <BloodSugarChart readings={bloodSugarReadings} />
                       </div>
                    </div>
                  </Card>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Analytical Logs</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {bloodSugarReadings.slice(0, 8).map((reading) => (
                      <motion.div key={reading.id} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <BloodSugarCard 
                          reading={reading}
                          showActions={true}
                          onEdit={(reading) => setEditReading({ type: 'blood_sugar', reading })}
                          onDelete={onDeleteBloodSugar}
                        />
                      </motion.div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="blood_pressure" className="m-0 space-y-10">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1 bg-accent rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Pressure Analytics</h3>
                  </div>
                  <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white p-10 rounded-[20px]">
                    <div className="space-y-8">
                       <div className="h-[300px] w-full">
                         <BloodPressureChart readings={bloodPressureReadings} />
                       </div>
                    </div>
                  </Card>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1 bg-accent rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Recent Diagnostics</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {bloodPressureReadings.slice(0, 8).map((reading) => (
                      <motion.div key={reading.id} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <BloodPressureCard 
                          reading={reading}
                          showActions={true}
                          onEdit={(reading) => setEditReading({ type: 'blood_pressure', reading })}
                          onDelete={onDeleteBloodPressure}
                        />
                      </motion.div>
                    ))}
                  </div>
                </section>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
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
