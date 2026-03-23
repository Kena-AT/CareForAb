"use client";

import { useState } from 'react';
import { Droplets, Heart, Plus, Activity, TrendingUp, History, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
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

  const recentReadings = activeTab === 'blood_sugar' ? bloodSugarReadings.slice(0, 10) : bloodPressureReadings.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32">
      <Header 
        title="Health Analytics" 
        subtitle="Insights and trends over time"
        onNotificationsClick={onNotificationsClick}
        onSettingsClick={onSettingsClick}
      />
      
      <main className="px-6 py-8 max-w-7xl mx-auto">
        <Tabs defaultValue="blood_sugar" className="w-full space-y-10" onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <TabsList className="bg-white/50 backdrop-blur-sm p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm w-full md:w-auto h-auto">
              <TabsTrigger 
                value="blood_sugar" 
                className="rounded-[1.2rem] py-3 px-6 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 transition-all font-bold text-xs uppercase tracking-wider gap-2 h-11"
              >
                <Droplets size={16} />
                Blood Sugar
              </TabsTrigger>
              <TabsTrigger 
                value="blood_pressure" 
                className="rounded-[1.2rem] py-3 px-6 data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-accent/20 transition-all font-bold text-xs uppercase tracking-wider gap-2 h-11"
              >
                <Heart size={16} />
                Blood Pressure
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
               <Button 
                variant="outline" 
                size="sm"
                className="rounded-xl border-slate-100 bg-white text-slate-500 font-bold text-xs h-11 px-4"
              >
                <Filter size={14} className="mr-2" /> Last 30 Days
              </Button>
              <Button 
                onClick={() => setAddModal(activeTab as 'blood_sugar' | 'blood_pressure')}
                size="sm"
                className={`rounded-xl h-11 px-6 font-bold shadow-lg ${activeTab === 'blood_sugar' ? 'bg-primary shadow-primary/20' : 'bg-accent shadow-accent/20'}`}
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
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Analytics Dashboard</h3>
                  </div>
                  <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white p-6 md:p-10 rounded-[2.5rem]">
                    <div className="space-y-8">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                               <Droplets size={24} />
                            </div>
                            <div>
                               <h4 className="text-xl font-bold text-slate-900">Glucose Trends</h4>
                               <p className="text-xs text-slate-400">Stable and within range</p>
                            </div>
                         </div>
                         <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-full text-[10px] font-bold uppercase">
                           <TrendingUp size={12} /> Optimal Performance
                         </div>
                       </div>
                       <div className="h-[300px] w-full pt-4">
                         <BloodSugarChart readings={bloodSugarReadings} />
                       </div>
                    </div>
                  </Card>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Recent Logs</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentReadings.map((reading) => (
                      <motion.div key={reading.id} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <BloodSugarCard 
                          reading={reading as any}
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
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Pressure Analytics</h3>
                  </div>
                  <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white p-6 md:p-10 rounded-[2.5rem]">
                    <div className="space-y-8">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent/10 text-accent rounded-2xl">
                               <Heart size={24} />
                            </div>
                            <div>
                               <h4 className="text-xl font-bold text-slate-900">BP Monitoring</h4>
                               <p className="text-xs text-slate-400">Regular tracking active</p>
                            </div>
                         </div>
                       </div>
                       <div className="h-[300px] w-full pt-4">
                         <BloodPressureChart readings={bloodPressureReadings} />
                       </div>
                    </div>
                  </Card>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-6 w-1 bg-accent rounded-full" />
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Recent Logs</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentReadings.map((reading) => (
                      <motion.div key={reading.id} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <BloodPressureCard 
                          reading={reading as any}
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
