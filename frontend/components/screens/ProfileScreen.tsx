"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, HelpCircle, LogOut, ChevronRight, FileText, Download, Calendar, Moon, Sun, Activity, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHealth } from '@/contexts/HealthContext';
import { supabase } from '@/integrations/supabase/client';
import { exportToPDF, exportToCSV } from '@/services/exportService';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Profile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  created_at: string;
}

interface ProfileScreenProps {
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
}

export const ProfileScreen = ({ onNotificationsClick, onSettingsClick }: ProfileScreenProps = {}) => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { medications, bloodSugarReadings, bloodPressureReadings, medicationLogs } = useHealth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState<{ open: boolean; type: 'notifications' | 'privacy' | 'help' }>({
    open: false,
    type: 'notifications',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = () => {
    router.push('/auth?mode=logout-confirm');
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF({
        bloodSugarReadings,
        bloodPressureReadings,
        medications,
        userName: profile?.full_name || user?.email || 'User',
      });
      toast.success('PDF report downloaded!');
      setExportDialogOpen(false);
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV({
        bloodSugarReadings,
        bloodPressureReadings,
        medications,
        userName: profile?.full_name || user?.email || 'User',
      });
      toast.success('CSV report downloaded!');
      setExportDialogOpen(false);
    } catch (error) {
      toast.error('Failed to generate CSV');
    }
  };

  const daysTracked = new Set([
    ...bloodSugarReadings.map(r => new Date(r.recorded_at).toDateString()),
    ...bloodPressureReadings.map(r => new Date(r.recorded_at).toDateString()),
  ]).size;

  const takenMeds = medicationLogs.filter(l => l.status === 'taken').length;
  const totalMeds = medicationLogs.length;
  const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 0;

  const menuItems = [
    { icon: Bell, label: 'Notifications', description: 'Manage your medicine reminders', type: 'notifications' as const },
    { icon: Shield, label: 'Account & Security', description: 'Protect your health information', type: 'privacy' as const },
    { icon: HelpCircle, label: 'Help & Knowledge', description: 'Guides for healthy living', type: 'help' as const },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
     return (
       <div className="min-h-screen bg-[#f6fafaff] flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-primary">
             <Activity size={32} />
          </motion.div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#f6fafaff] pb-24">
      <Header 
        title="Profile Architecture" 
        onSettingsClick={onSettingsClick}
      />

      <main className="px-10 py-10 max-w-5xl mx-auto space-y-10">
        <section className="flex flex-col md:flex-row gap-10">
           {/* Left Column: User Card */}
           <div className="flex-1 space-y-10">
              <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[20px] overflow-hidden">
                 <div className="h-24 bg-gradient-to-r from-[#004c56ff] to-[#006672ff]" />
                 <CardContent className="p-8 -mt-12 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                       <Avatar className="h-24 w-24 bg-white border-4 border-white shadow-xl">
                          <AvatarFallback className="text-2xl font-black bg-[#f0fdfaff] text-primary">
                             {getInitials(profile?.full_name)}
                          </AvatarFallback>
                       </Avatar>
                       <div className="pb-2">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                             {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                          </h2>
                          <p className="text-sm font-bold text-slate-400">{user?.email}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-50">
                       <div className="text-center">
                          <p className="text-xl font-black text-slate-900">{daysTracked}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Days</p>
                       </div>
                       <div className="text-center">
                          <p className="text-xl font-black text-primary">{adherenceRate}%</p>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Rate</p>
                       </div>
                       <div className="text-center">
                          <p className="text-xl font-black text-slate-900">{medications.length}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Meds</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Data Export Card */}
              <Card className="border-none bg-white shadow-xl shadow-slate-200/50 rounded-[20px] p-8 space-y-6">
                 <div>
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Vault & Records</h3>
                    <p className="text-xs text-slate-400 font-medium">Download your complete diagnostic history.</p>
                 </div>
                 
                 <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleExportPDF} className="flex-1 bg-[#004c56ff] hover:bg-[#003a42] text-white rounded-xl h-12 font-black text-xs gap-2">
                       <FileText size={16} /> PDF Report
                    </Button>
                    <Button onClick={handleExportCSV} className="flex-1 bg-[#dfe3e3ff] hover:bg-[#d0d6d6] text-slate-700 rounded-xl h-12 font-black text-xs gap-2">
                       <Download size={16} /> CSV Dataset
                    </Button>
                 </div>
              </Card>
           </div>

           {/* Right Column: Menu & Actions */}
           <div className="w-full md:w-80 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                 <div className="h-6 w-1 bg-primary rounded-full" />
                 <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Management</h3>
              </div>
              
              <div className="space-y-3">
                 {menuItems.map((item, idx) => (
                    <motion.button
                       key={idx}
                       whileHover={{ x: 4 }}
                       className="w-full text-left p-4 bg-white border border-slate-50 rounded-2xl flex items-center gap-4 group transition-all hover:shadow-lg hover:shadow-slate-200/50"
                    >
                       <div className="p-3 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-[#f0fdfaff] group-hover:text-primary transition-colors">
                          <item.icon size={20} />
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-black text-slate-900">{item.label}</p>
                          <p className="text-[10px] text-slate-400 group-hover:text-slate-500 font-medium">{item.description}</p>
                       </div>
                       <ChevronRight size={16} className="text-slate-200 group-hover:text-primary transition-all" />
                    </motion.button>
                 ))}
                 
                 <motion.button
                    whileHover={{ x: 4 }}
                    className="w-full text-left p-4 bg-white border border-slate-50 rounded-2xl flex items-center justify-between group transition-all hover:bg-slate-50"
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                 >
                    <div className="flex items-center gap-4">
                       <div className="p-3 rounded-xl bg-slate-50 text-slate-400">
                          {resolvedTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                       </div>
                       <div>
                          <p className="text-sm font-black text-slate-900">Visual Mode</p>
                          <p className="text-[10px] text-slate-400 font-medium">{resolvedTheme === 'dark' ? 'Dark Protocol' : 'Standard View'}</p>
                       </div>
                    </div>
                 </motion.button>
              </div>

              <Button 
                variant="ghost" 
                onClick={handleSignOut}
                className="w-full mt-10 rounded-[20px] h-12 text-red-500 hover:bg-red-50 hover:text-red-600 font-black text-xs gap-3"
              >
                <LogOut size={18} /> End Session
              </Button>
           </div>
        </section>
      </main>
    </div>
  );
};
