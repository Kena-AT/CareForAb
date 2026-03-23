"use client";

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Bell, Shield, Mail, Activity, ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { User } from 'lucide-react';
import { scheduleAllMedicationReminders, cancelAllReminders, sendTestNotification } from '@/services/notifications';

export const SettingsScreen = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const { medications } = useHealth();
  const [resendingVerification, setResendingVerification] = useState(false);

  const [notifications, setNotifications] = useState({
    medicationReminders: true,
    dailySummary: false,
    abnormalReadings: true,
    emailNotifications: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('notification-settings');
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('notification-settings', JSON.stringify(notifications));
  }, [notifications]);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success('Verification email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      <header className="sticky top-0 z-40 h-16 bg-[#f6fafacc] backdrop-blur-xl border-b border-slate-100 px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="h-6 w-1 bg-primary rounded-full" />
           <p className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">System Configuration</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-slate-50 group">
             <Bell size={18} className="text-slate-500 group-hover:text-primary transition-colors" />
           </Button>
           <Link href="/profile">
             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
               <User size={18} />
             </div>
           </Link>
        </div>
      </header>

      <main className="px-10 py-10 max-w-4xl mx-auto space-y-10">
        <div className="grid md:grid-cols-3 gap-10">
          <aside className="space-y-1">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Settings</h2>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Internal Controls</p>
             <nav className="space-y-1">
                <button className="w-full text-left px-4 py-3 rounded-xl bg-[#f0fdfaff] text-primary font-bold text-sm">General</button>
                <button className="w-full text-left px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-50 font-bold text-sm">Privacy</button>
                <button className="w-full text-left px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-50 font-bold text-sm">Security</button>
             </nav>
          </aside>

          <div className="md:col-span-2 space-y-10">
            {/* Visual Mode */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[20px] overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 p-6">
                <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                   <Moon size={16} /> Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', icon: Sun, label: 'Light' },
                    { id: 'dark', icon: Moon, label: 'Dark' },
                    { id: 'system', icon: Monitor, label: 'System' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setTheme(mode.id as any)}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        theme === mode.id 
                        ? 'border-primary bg-[#f0fdfaff] text-primary shadow-sm' 
                        : 'border-slate-50 hover:border-slate-100 text-slate-400'
                      }`}
                    >
                      <mode.icon size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[20px] overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 p-6">
                <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                   <Bell size={16} /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-black text-slate-900">Medication Reminders</Label>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Push alerts for therapy</p>
                    </div>
                    <Switch
                      checked={notifications.medicationReminders}
                      onCheckedChange={async (checked) => {
                        setNotifications(prev => ({ ...prev, medicationReminders: checked }));
                        if (checked) {
                          await scheduleAllMedicationReminders(medications);
                          toast.success('Reminders Active');
                        } else {
                          await cancelAllReminders();
                          toast.success('Reminders Off');
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-black text-slate-900">Abnormal Readings</Label>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Critical threshold alerts</p>
                    </div>
                    <Switch
                      checked={notifications.abnormalReadings}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, abnormalReadings: checked }))}
                    />
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={sendTestNotification}
                    className="w-full rounded-xl h-12 text-slate-400 font-bold text-xs hover:text-primary transition-colors border border-dashed border-slate-200"
                  >
                    Test Notification Pipeline
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[20px] overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 p-6">
                <CardTitle className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                   <Shield size={16} /> Security
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="p-6 rounded-2xl bg-slate-50/50 flex items-center justify-between border border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{user?.email}</p>
                      {user?.email_confirmed_at ? (
                        <p className="text-[10px] font-black uppercase text-success tracking-widest">Verified Account</p>
                      ) : (
                        <p className="text-[10px] font-black uppercase text-warning tracking-widest">Verification Required</p>
                      )}
                    </div>
                  </div>
                  {!user?.email_confirmed_at && (
                    <Button onClick={handleResendVerification} disabled={resendingVerification} variant="outline" size="sm" className="rounded-xl font-bold">
                       {resendingVerification ? '...' : 'Resend'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
