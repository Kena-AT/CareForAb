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

          <main className="px-10 py-10 max-w-7xl mx-auto">
        <header className="mb-12">
           <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Settings</h2>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">System Management Protocol</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
          {/* Account Profile Card - Large */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-8 lg:row-span-2 bg-white rounded-[32px] p-10 shadow-xl shadow-slate-200/50 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#f0fdfaff] rounded-full -mr-20 -mt-20 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
            
            <div className="relative">
              <div className="flex items-center gap-6 mb-8">
                 <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 relative group-hover:scale-105 transition-transform duration-500">
                    <User size={48} />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white border-4 border-white">
                       <Activity size={14} />
                    </div>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{user?.email?.split('@')[0]}</h3>
                    <p className="text-sm font-bold text-slate-400">{user?.email}</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Status</p>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                       {user?.email_confirmed_at ? '✓ Verified Account' : '! Pending Verification'}
                    </p>
                 </div>
                 <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Last Login</p>
                    <p className="text-sm font-black text-slate-900">{new Date(user?.last_sign_in_at || '').toLocaleDateString()}</p>
                 </div>
              </div>
            </div>

            {!user?.email_confirmed_at && (
              <Button 
                onClick={handleResendVerification} 
                disabled={resendingVerification}
                className="w-full h-14 rounded-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 mt-8"
              >
                {resendingVerification ? 'Sending...' : 'Complete Account Verification'}
              </Button>
            )}
          </motion.div>

          {/* Appearance Card - Small Square */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4 lg:row-span-2 bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 flex flex-col"
          >
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-[#f0fdfaff] text-primary flex items-center justify-center">
                   <Moon size={20} />
                </div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Interface</h3>
             </div>
             
             <div className="flex-1 flex flex-col gap-3">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: Monitor, label: 'System' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setTheme(mode.id as any)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all group ${
                      theme === mode.id 
                      ? 'border-primary bg-[#f0fdfaff] text-primary' 
                      : 'border-slate-50 hover:border-slate-100 text-slate-400'
                    }`}
                  >
                    <mode.icon size={18} className={theme === mode.id ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'} />
                    <span className="text-xs font-black uppercase tracking-widest">{mode.label}</span>
                    {theme === mode.id && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                  </button>
                ))}
             </div>
          </motion.div>

          {/* Notifications Card - Medium */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-6 lg:row-span-2 bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50"
          >
             <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                   <Bell size={20} />
                </div>
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Alert Protocol</h3>
             </div>

             <div className="space-y-6">
                {[
                  { 
                    id: 'medicationReminders', 
                    label: 'Medication Reminders', 
                    desc: 'Primary therapy alerts',
                    action: async (checked: boolean) => {
                      setNotifications(prev => ({ ...prev, medicationReminders: checked }));
                      if (checked) {
                        await scheduleAllMedicationReminders(medications);
                        toast.success('Protocol Alerts Active');
                      } else {
                        await cancelAllReminders();
                        toast.success('Protocol Alerts Silenced');
                      }
                    }
                  },
                  { 
                    id: 'abnormalReadings', 
                    label: 'Critical Thresholds', 
                    desc: 'Real-time vital warnings',
                    action: (checked: boolean) => setNotifications(prev => ({ ...prev, abnormalReadings: checked }))
                  }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <Label className="text-sm font-black text-slate-900">{item.label}</Label>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.desc}</p>
                    </div>
                    <Switch
                      checked={(notifications as any)[item.id]}
                      onCheckedChange={item.action}
                    />
                  </div>
                ))}

                <Button
                  variant="ghost"
                  onClick={sendTestNotification}
                  className="w-full rounded-2xl h-14 text-slate-400 font-bold text-xs hover:text-primary transition-colors border border-dashed border-slate-200 mt-4"
                >
                  Run Signal Diagnostics
                </Button>
             </div>
          </motion.div>

          {/* Security Card - Small Horizontal */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-6 lg:row-span-1 bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 flex items-center justify-between"
          >
             <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                   <Shield size={22} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-900">Security Vault</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Two-Factor & Encryption</p>
                </div>
             </div>
             <Button variant="outline" className="rounded-xl border-slate-100 font-bold group">
                Review <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
             </Button>
          </motion.div>

          {/* Privacy & Data Card - Small Horizontal */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-6 lg:row-span-1 bg-slate-900 rounded-[32px] p-8 shadow-xl shadow-slate-900/20 flex items-center justify-between text-white"
          >
             <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center">
                   <Lock size={20} />
                </div>
                <div>
                   <h3 className="text-sm font-black">Data Autonomy</h3>
                   <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">GDPR & Export Controls</p>
                </div>
             </div>
             <Button variant="ghost" className="rounded-xl text-white/60 hover:text-white hover:bg-white/10 font-bold group">
                Manage <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
             </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
