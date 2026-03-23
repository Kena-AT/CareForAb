"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, FileText, Download, Calendar, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useHealth } from '@/contexts/HealthContext';
import { supabase } from '@/integrations/supabase/client';
import { exportToPDF, exportToCSV } from '@/services/exportService';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { toast } from 'sonner';
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

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      // Fallback: open privacy settings
      setSettingsDialog({ open: true, type: 'privacy' });
    }
  };

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

  const openSettingsDialog = (type: 'notifications' | 'privacy' | 'help') => {
    setSettingsDialog({ open: true, type });
  };

  // Calculate statistics
  const daysTracked = new Set([
    ...bloodSugarReadings.map(r => new Date(r.recorded_at).toDateString()),
    ...bloodPressureReadings.map(r => new Date(r.recorded_at).toDateString()),
  ]).size;

  const takenMeds = medicationLogs.filter(l => l.status === 'taken').length;
  const totalMeds = medicationLogs.length;
  const adherenceRate = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 0;

  const menuItems = [
    { icon: Bell, label: 'Notifications', description: 'Manage your reminders', type: 'notifications' as const },
    { icon: Shield, label: 'Privacy & Security', description: 'Settings and appearance', type: 'privacy' as const },
    { icon: HelpCircle, label: 'Help & Support', description: 'Get assistance', type: 'help' as const },
  ];

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMemberSince = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24">
        <Header
          title="Profile"
          onNotificationsClick={onNotificationsClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className="px-4 py-6 space-y-6">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Header
        title="Profile"
        onNotificationsClick={onNotificationsClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 bg-primary/20 ring-4 ring-primary/10">
                <AvatarFallback className="text-headline text-primary bg-primary/20">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-title">
                  {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-body text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1 text-label text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {profile?.created_at ? formatMemberSince(profile.created_at) : 'Recently'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Theme Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {resolvedTheme === 'dark' ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="text-body font-medium">Dark Mode</p>
                  <p className="text-label text-muted-foreground">
                    {resolvedTheme === 'dark' ? 'Currently on' : 'Currently off'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Health Summary */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-title mb-4">Health Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-display text-primary">{daysTracked}</p>
                <p className="text-label text-muted-foreground">Days Tracked</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-display text-success">{adherenceRate}%</p>
                <p className="text-label text-muted-foreground">Adherence</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-display text-info">{bloodSugarReadings.length + bloodPressureReadings.length}</p>
                <p className="text-label text-muted-foreground">Readings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Data Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-title flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Health Report
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-body text-muted-foreground mb-4">
              Download your health data to share with your doctor or keep for your records.
            </p>
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Export Data
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Export Health Report</DialogTitle>
                  <DialogDescription className="text-base pt-2">
                    Download your complete health data in your preferred format. All your records will be included in the export.
                  </DialogDescription>
                </DialogHeader>

                {/* Data Summary */}
                <div className="grid grid-cols-3 gap-3 py-4 border-y">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-primary">{bloodSugarReadings.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Blood Sugar</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-primary">{bloodPressureReadings.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Blood Pressure</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-primary">{medications.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Medications</p>
                  </div>
                </div>

                {/* Export Options */}
                <div className="grid gap-3 py-4">
                  <Button
                    onClick={handleExportPDF}
                    className="h-auto py-4 px-6 flex items-center gap-4 hover:bg-primary/90 transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/20">
                      <FileText className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-base">Download as PDF</p>
                      <p className="text-sm text-primary-foreground/80">Formatted report ready for printing and sharing with healthcare providers</p>
                    </div>
                  </Button>

                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    className="h-auto py-4 px-6 flex items-center gap-4 border-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Download className="h-6 w-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-base">Download as CSV</p>
                      <p className="text-sm text-muted-foreground">Raw data format perfect for spreadsheet analysis and data processing</p>
                    </div>
                  </Button>
                </div>

                {/* Info Note */}
                <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Your exported report includes all blood sugar readings, blood pressure readings, and medication information.
                    Data is exported as of {new Date().toLocaleDateString()}.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={() => openSettingsDialog(item.type)}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-body font-medium">{item.label}</p>
                    <p className="text-label text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Button>
            );
          })}
        </div>

        {/* Sign Out */}
        <Button
          variant="destructive"
          className="w-full"
          size="lg"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>

        <p className="text-center text-label text-muted-foreground pt-4">
          {process.env.NEXT_PUBLIC_APP_NAME || 'CareforAb'} v1.0.0
        </p>
      </main>

      {/* Settings Dialogs */}
      <SettingsDialog
        open={settingsDialog.open}
        onOpenChange={(open) => setSettingsDialog(prev => ({ ...prev, open }))}
        type={settingsDialog.type}
      />
    </div>
  );
};
