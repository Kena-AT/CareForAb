"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, HelpCircle, LogOut, ChevronRight, FileText, Download, Bell, Activity, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useHealth } from '@/contexts/HealthContext';
import { supabase } from '@/integrations/supabase/client';
import { exportToPDF, exportToCSV } from '@/services/exportService';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  created_at: string;
  avatar_url?: string | null;
  blood_type?: string | null;
}

interface ProfileScreenProps {
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
}

export const ProfileScreen = ({ onSettingsClick }: ProfileScreenProps = {}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    medications, 
    medicationLogs,
    bloodSugarReadings,
    bloodPressureReadings,
    isLoading: isHealthLoading 
  } = useHealth();
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

  const [timeframe, setTimeframe] = useState('30days');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingBloodType, setIsEditingBloodType] = useState(false);
  const [newBloodType, setNewBloodType] = useState('');

  // Set initial blood type when profile loads
  useEffect(() => {
    if (profile?.blood_type) {
      setNewBloodType(profile.blood_type);
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !user) {
        return;
      }
      
      const file = event.target.files[0];
      if (!window.confirm(`Are you sure you want to set this image as your profile picture?`)) {
        event.target.value = '';
        return;
      }
      
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
      toast.success('Profile image updated successfully!');
    } catch (error) {
      toast.error('Error uploading image');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBloodType = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ blood_type: newBloodType })
        .eq('id', user.id);
      
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, blood_type: newBloodType } : prev);
      setIsEditingBloodType(false);
      toast.success('Blood type updated');
    } catch (error) {
      toast.error('Failed to update blood type');
    }
  };

  // Timeframe calculation
  const getFilteredData = () => {
    const now = new Date();
    let startDate = new Date();
    switch (timeframe) {
      case '1day': startDate.setDate(now.getDate() - 1); break;
      case '7days': startDate.setDate(now.getDate() - 7); break;
      case '30days': startDate.setDate(now.getDate() - 30); break;
      case '90days': startDate.setDate(now.getDate() - 90); break;
      case '180days': startDate.setDate(now.getDate() - 180); break;
      case '1year': startDate.setFullYear(now.getFullYear() - 1); break;
      default: startDate.setDate(now.getDate() - 30);
    }

    const filterFunc = (item: { recorded_at: string }) => new Date(item.recorded_at) >= startDate;
    
    return {
      filteredBg: bloodSugarReadings.filter(filterFunc),
      filteredBp: bloodPressureReadings.filter(filterFunc),
    };
  };

  const { filteredBg, filteredBp } = getFilteredData();

  const daysTracked = new Set([
    ...filteredBg.map(r => new Date(r.recorded_at).toDateString()),
    ...filteredBp.map(r => new Date(r.recorded_at).toDateString()),
  ]).size;

  const totalReadings = filteredBg.length + filteredBp.length;

  const takenMeds = medicationLogs.filter(l => l.status === 'taken').length;
  const totalMeds = medicationLogs.length;
  const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 0;

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

      <main className="px-10 py-10 max-w-6xl mx-auto space-y-10">
        
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="md:col-span-2">
            <Card className="border-none shadow-sm bg-white rounded-3xl h-full flex flex-col justify-center overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-full -z-10 opacity-50" />
              <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-8">
                
                <div className="relative cursor-pointer group">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-xl bg-slate-50/50">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="object-cover w-full h-full" />
                    ) : (
                      <AvatarFallback className="text-4xl font-black text-slate-300">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-xs font-bold">
                    {isUploading ? 'Uploading...' : 'Change'}
                    <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleAvatarUpload} />
                  </label>
                  <div className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                </div>

                <div className="space-y-4 text-center sm:text-left">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {profile?.full_name || user?.user_metadata?.full_name || 'Anonymous User'}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <div 
                      onClick={() => setIsEditingBloodType(true)}
                      className="px-4 py-2 bg-slate-50 rounded-full text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2"
                    >
                      Blood Type: {profile?.blood_type || 'Unknown'}
                      <ChevronRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Clinical Exports */}
          <Card className="border-none bg-[#0a5c66] text-white rounded-3xl shadow-xl shadow-teal-900/10 overflow-hidden">
            <CardContent className="p-8 flex flex-col h-full justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold mb-2">Clinical Exports</h3>
                <p className="text-teal-100/80 text-sm leading-relaxed">
                  Share your recent health trends with your physician instantly.
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={handleExportPDF} 
                  className="w-full bg-white text-teal-900 hover:bg-slate-50 rounded-xl h-12 font-bold flex justify-between px-6"
                >
                  Download PDF Report
                  <FileText size={18} className="text-teal-700" />
                </Button>
                <Button 
                  onClick={handleExportCSV} 
                  className="w-full bg-teal-800/50 hover:bg-teal-800 text-white border border-teal-700/50 rounded-xl h-12 font-bold flex justify-between px-6"
                >
                  Download CSV
                  <Download size={18} className="text-teal-100" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Summary Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Health Summary</h3>
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-slate-100 border-none rounded-full px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer appearance-none text-center outline-none"
            >
              <option value="1day">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 3 Months</option>
              <option value="180days">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm rounded-3xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Calendar size={20} />
                  </div>
                  <span className="text-xs font-bold text-emerald-600">+12% vs last period</span>
                </div>
                <p className="text-sm font-bold text-slate-500 mb-1">Days Tracked</p>
                <p className="text-4xl font-black text-slate-900">{daysTracked}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Activity size={20} />
                  </div>
                  <span className="text-xs font-bold text-blue-600">{adherenceRate >= 90 ? 'Excellent' : 'Needs Focus'}</span>
                </div>
                <p className="text-sm font-bold text-slate-500 mb-1">Adherence Rate</p>
                <p className="text-4xl font-black text-slate-900">{adherenceRate}<span className="text-2xl">%</span></p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                    <FileText size={20} />
                  </div>
                  <span className="text-xs font-bold text-red-600">Active</span>
                </div>
                <p className="text-sm font-bold text-slate-500 mb-1">Total Readings</p>
                <p className="text-4xl font-black text-slate-900">{totalReadings}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 text-slate-500 p-4 rounded-xl text-xs flex items-start gap-4">
            <p>
              Clinical Note: Data export is available every 24 hours. For urgent clinical requests or to update your account security settings, please visit the Settings page or contact your care provider through the emergency button.
            </p>
          </div>

          <div className="flex justify-center pt-8">
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="rounded-xl h-12 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold px-8 flex items-center gap-3"
            >
              <LogOut size={18} /> Sign Out Securely
            </Button>
          </div>
        </div>
      </main>

      {/* Blood Type Edit Modal */}
      <Dialog open={isEditingBloodType} onOpenChange={setIsEditingBloodType}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Update Clinical Protocol</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs mt-2">
              Update your blood type information for clinical context and emergency readiness.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Blood Type (ABO & Rh)</Label>
              <select 
                value={newBloodType}
                onChange={(e) => setNewBloodType(e.target.value)}
                className="flex h-12 w-full rounded-xl border-none bg-slate-50 px-4 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Unknown / Select Type</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditingBloodType(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveBloodType} className="bg-teal-900 hover:bg-teal-950 text-white rounded-xl px-8 font-bold">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
