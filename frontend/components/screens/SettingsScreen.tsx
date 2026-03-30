"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Moon, Sun, Bell, Shield, Mail, Activity, 
  ChevronRight, Lock, User, Globe, Smartphone,
  Save, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { playNotificationSound, sendTestNotification } from '@/services/notifications';
import { useNotifications } from '@/contexts/NotificationContext';
import { Header } from '@/components/layout/Header';

export const SettingsScreen = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // Settings State
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('English (United States)');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    medication: true,
    clinical_sync: true,
    data_permissions: 'standard'
  });


  // Load profile from Supabase
  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        const profileData = data as any;
        setDisplayName(profileData.full_name || '');
        setLanguage(profileData.language || 'English (United States)');
        if (profileData.notification_preferences) {
          setNotifications(profileData.notification_preferences);
        }
      }
    } catch (error) {
      console.error('[Settings] Error loading profile:', error);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleToggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Not authenticated');
      return;
    }
    
    console.log('[Settings] Starting save...', { userId: user.id });
    setIsSaving(true);
    
    try {
      // Add timeout to prevent infinite hanging
      const savePromise = supabase
        .from('profiles')
        .update({
          language: language,
          notification_preferences: notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timed out - Supabase not responding')), 5000)
      );
      
      const { error } = await Promise.race([savePromise, timeoutPromise]) as any;

      if (error) {
        console.error('[Settings] Supabase error:', error);
        throw error;
      }
      
      console.log('[Settings] Save successful');
      setIsDirty(false);
      toast.success('Settings saved to cloud');
      
      addNotification({
        title: 'Settings Updated',
        message: 'Your profile and system preferences have been successfully synced.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('[Settings] Save error:', error);
      toast.error(error.message || 'Failed to save settings - check console');
    } finally {
      console.log('[Settings] Save complete, resetting isSaving');
      setIsSaving(false);
    }
  };

  const [isTestingDb, setIsTestingDb] = useState(false);

  const handleTestDbConnection = async () => {
    setIsTestingDb(true);
    const results: string[] = [];
    
    // Test 0: Basic network connectivity
    console.log('[DB Test 0] Testing network...');
    try {
      const pingStart = Date.now();
      const pingRes = await fetch('https://www.google.com/favicon.ico', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      results.push(`Network: OK (${Date.now() - pingStart}ms)`);
    } catch (e) {
      results.push('Network: FAILED - Check internet connection');
      console.error('[DB Test 0] Network failed:', e);
      toast.error(results.join(' | '), { duration: 10000 });
      setIsTestingDb(false);
      return;
    }
    
    // Test 1: Check auth
    console.log('[DB Test 1] Getting auth user...');
    const authPromise = supabase.auth.getUser();
    const authTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    
    try {
      const { data: userData, error: authError } = await Promise.race([authPromise, authTimeout]) as any;
      if (authError) {
        console.error('[DB Test 1] Auth error:', authError);
        results.push(`Auth: ${authError.message}`);
      } else if (!userData.user) {
        results.push('Auth: No user logged in');
      } else {
        console.log('[DB Test 1] Auth OK, user:', userData.user.id);
        results.push(`Auth: OK`);
        
        // Test 2: Try simple SELECT (reads are usually allowed)
        console.log('[DB Test 2] Testing SELECT...');
        const selectPromise = supabase
          .from('blood_sugar_readings')
          .select('id')
          .limit(1);
        
        const selectTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 5000)
        );
        
        try {
          const { error: selectError } = await Promise.race([selectPromise, selectTimeout]) as any;
          if (selectError) {
            console.error('[DB Test 2] SELECT error:', selectError);
            results.push(`SELECT: ${selectError.code}`);
          } else {
            console.log('[DB Test 2] SELECT OK');
            results.push('SELECT: OK');
          }
        } catch (e: any) {
          results.push('SELECT: TIMEOUT');
        }
        
        // Test 3: Try INSERT with 5s timeout
        console.log('[DB Test 3] Testing INSERT...');
        const testId = crypto.randomUUID();
        const insertPromise = supabase
          .from('blood_sugar_readings')
          .insert({
            id: testId,
            user_id: userData.user.id,
            value: 100,
            unit: 'mg/dL',
            meal_type: 'fasting',
            recorded_at: new Date().toISOString()
          })
          .select()
          .single();
        
        const insertTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('INSERT timeout')), 5000)
        );
        
        try {
          const { error: insertError } = await Promise.race([insertPromise, insertTimeout]) as any;
          if (insertError) {
            console.error('[DB Test 3] INSERT error:', insertError);
            results.push(`INSERT: ${insertError.code}`);
          } else {
            console.log('[DB Test 3] INSERT OK');
            results.push('INSERT: OK');
            await supabase.from('blood_sugar_readings').delete().eq('id', testId);
          }
        } catch (e: any) {
          console.error('[DB Test 3] INSERT timeout');
          results.push('INSERT: TIMEOUT (RLS?)');
        }
      }
    } catch (e: any) {
      console.error('[DB Test 1] Auth timeout');
      results.push('Auth: TIMEOUT');
    }
    
    console.log('[DB Test Results]:', results.join(' | '));
    toast.info(results.join(' | '), { duration: 15000 });
    setIsTestingDb(false);
  };

  const handleRunDiagnostic = async () => {
    playNotificationSound();
    toast.success('Signal Diagnostic: Sound Playback Successful');
    await sendTestNotification();
    addNotification({
      title: 'Diagnostic Complete',
      message: 'System signals and audio playback are functional.',
      type: 'info'
    });
  };

  const handleDiscard = () => {
    loadProfile();
    setIsDirty(false);
    toast.info('Changes discarded');
  };

  const Section = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-b border-slate-100 last:border-none">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed max-w-[240px]">{description}</p>
      </div>
      <div className="md:col-span-2">
        <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
          <CardContent className="p-8 space-y-6">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32">
      <Header title="System Configuration" />

      <main className="max-w-5xl mx-auto px-10 py-4">
        {/* Account Section */}
        <Section 
          title="Account Preferences" 
          description="Manage how your profile appears and how you're addressed as a patient."
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Language</Label>
              <div className="relative group">
                <Input 
                  value={language} 
                  readOnly
                  className="bg-slate-50 border-none h-12 rounded-xl"
                />
                <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-teal-500 transition-colors" size={18} />
              </div>
            </div>
          </div>
        </Section>

        {/* Notifications Section */}
        <Section 
          title="Notifications" 
          description="Control how and when you receive health alerts and medication reminders."
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Push Notifications</p>
                  <p className="text-xs text-slate-400">All vital alerts and system updates</p>
                </div>
              </div>
              <Switch checked={notifications.push} onCheckedChange={() => handleToggleNotification('push')} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Abnormal Readings</p>
                  <p className="text-xs text-slate-400">Alerts for critical heart rate or glucose</p>
                </div>
              </div>
              <Switch 
                checked={(notifications as any).abnormal_readings ?? true} 
                onCheckedChange={() => handleToggleNotification('abnormal_readings' as any)} 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Email Reminders</p>
                  <p className="text-xs text-slate-400">Daily medication reminders directly to your inbox</p>
                </div>
              </div>
              <Switch checked={notifications.email} onCheckedChange={() => handleToggleNotification('email')} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Medication Reminders</p>
                  <p className="text-xs text-slate-400">Schedule based alerts for medications</p>
                </div>
              </div>
              <Switch checked={notifications.medication} onCheckedChange={() => handleToggleNotification('medication')} />
            </div>

            <Button
              variant="outline"
              onClick={handleRunDiagnostic}
              className="w-full rounded-2xl h-14 text-slate-400 font-bold text-xs hover:text-teal-600 transition-colors border-dashed border-2 border-slate-100 flex gap-2 items-center justify-center"
            >
              <Volume2 size={16} />
              Run System Signal & Audio Diagnostic
            </Button>

            <Button
              variant="outline"
              onClick={handleTestDbConnection}
              disabled={isTestingDb}
              className="w-full rounded-2xl h-14 text-slate-400 font-bold text-xs hover:text-red-600 transition-colors border-dashed border-2 border-red-100 flex gap-2 items-center justify-center"
            >
              {isTestingDb ? 'Testing DB...' : 'Test DB Connection (Debug)'}
            </Button>
          </div>
        </Section>

        {/* Appearance Section */}
        <Section 
          title="Appearance" 
          description="Personalize the visual interface for your comfort."
        >
          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => { setTheme('light'); setIsDirty(true); }}
              className={`p-1 rounded-3xl border-2 transition-all ${theme === 'light' ? 'border-teal-500 ring-4 ring-teal-500/10 shadow-lg' : 'border-slate-100 hover:border-slate-200'}`}
            >
              <div className="aspect-[4/3] bg-white rounded-2xl flex items-center justify-center mb-3">
                <div className="w-2/3 h-2/3 bg-slate-50 rounded-lg shadow-inner overflow-hidden flex flex-col p-2 gap-1">
                   <div className="w-full h-2 bg-slate-200 rounded" />
                   <div className="w-2/3 h-2 bg-slate-100 rounded" />
                </div>
              </div>
              <p className="text-sm font-black text-slate-900 mb-1">Light Mode</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-3">Standard Spectrum</p>
            </button>

            <button 
              onClick={() => { setTheme('dark'); setIsDirty(true); }}
              className={`p-1 rounded-3xl border-2 bg-slate-900 transition-all ${theme === 'dark' ? 'border-teal-500 ring-4 ring-teal-500/10 shadow-lg' : 'border-slate-800 hover:border-slate-700'}`}
            >
              <div className="aspect-[4/3] bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
                <div className="w-2/3 h-2/3 bg-slate-900 rounded-lg shadow-inner overflow-hidden flex flex-col p-2 gap-1">
                   <div className="w-full h-2 bg-slate-700 rounded" />
                   <div className="w-2/3 h-2 bg-slate-800 rounded" />
                </div>
              </div>
              <p className="text-sm font-black text-white mb-1">Dark Mode</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-3">Nocturnal Comfort</p>
            </button>
          </div>
        </Section>

        {/* Security Section */}
        <Section 
          title="Security" 
          description="Secure your account with multi-factor authentication."
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <Lock size={18} className="text-slate-400" />
                <p className="text-sm font-bold text-slate-900">Health Vault Access</p>
              </div>
              <Button variant="secondary" className="bg-white hover:bg-white/90 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm h-9 px-4">
                Rotate Credentials
              </Button>
            </div>
            <div className="flex items-center justify-between px-4">
               <div>
                 <p className="text-sm font-bold text-slate-900">Two-Factor Authorization</p>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Device Enforcement</p>
               </div>
               <Switch />
            </div>
          </div>
        </Section>

        {/* Privacy Section */}
        <Section 
          title="Privacy & Data" 
          description="Control how your medical data is synchronized and shared."
        >
          <div className="space-y-6">
            <div className="p-6 border border-teal-100 bg-teal-50/20 rounded-3xl space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <p className="font-bold text-slate-900">Clinical Sync Protocol</p>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => handleToggleNotification('clinical_sync' as any)}
                  className="text-slate-400 hover:text-red-500 text-[9px] font-black uppercase tracking-widest h-8 rounded-lg"
                >
                  {notifications.clinical_sync ? 'Deactivate' : 'Enable Sync'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between px-4">
               <div className="flex items-center gap-4">
                 <Shield size={18} className="text-slate-400" />
                 <p className="text-sm font-bold text-slate-900">Data Access Level</p>
               </div>
               <select 
                 value={notifications.data_permissions}
                 onChange={(e) => {
                   setNotifications(prev => ({ ...prev, data_permissions: e.target.value }));
                   setIsDirty(true);
                 }}
                 className="bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest text-teal-600 focus:ring-0 cursor-pointer"
               >
                 <option value="minimal">Minimal</option>
                 <option value="standard">Standard</option>
                 <option value="extended">Extended</option>
               </select>
            </div>
          </div>
        </Section>
      </main>

      {/* Sticky Action Footer */}
      {isDirty && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 p-6 z-50 flex justify-end gap-4 shadow-[0_-20px_40px_rgba(0,0,0,0.08)]"
        >
          <div className="max-w-5xl mx-auto w-full flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={handleDiscard}
              className="rounded-2xl h-14 px-8 font-black uppercase text-[11px] tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Discard Protocol Changes
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-2xl h-14 px-10 font-black uppercase text-[11px] tracking-widest bg-teal-900 hover:bg-teal-950 text-white shadow-xl shadow-teal-900/20 flex gap-2 items-center"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
