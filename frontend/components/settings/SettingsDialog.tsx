"use client";

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Bell, Shield, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cancelAllReminders, scheduleAllMedicationReminders, sendTestNotification } from '@/services/notifications';
import { useMedications } from '@/hooks/useMedications';
import { useSchedules } from '@/hooks/useSchedules';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'notifications' | 'privacy' | 'help';
}

interface NotificationSettings {
  medicationReminders: boolean;
  dailySummary: boolean;
  abnormalReadings: boolean;
  emailNotifications: boolean;
}

export const SettingsDialog = ({ open, onOpenChange, type = 'privacy' }: SettingsDialogProps) => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { medications } = useMedications();
  const { schedules } = useSchedules();

  const [notifications, setNotifications] = useState<NotificationSettings>(() => {
    if (typeof window === 'undefined') {
      return { medicationReminders: true, dailySummary: false, abnormalReadings: true, emailNotifications: false };
    }
    const saved = localStorage.getItem('notification-settings');
    return saved ? JSON.parse(saved) : {
      medicationReminders: true,
      dailySummary: false,
      abnormalReadings: true,
      emailNotifications: false,
    };
  });
  
  const [isTogglingReminders, setIsTogglingReminders] = useState(false);

  useEffect(() => {
    localStorage.setItem('notification-settings', JSON.stringify(notifications));
  }, [notifications]);

  const [resendingVerification, setResendingVerification] = useState(false);

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      toast.success('Verification email sent! Check your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-label font-medium">Push Notifications</h4>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="med-reminders">Medication Reminders</Label>
            <p className="text-sm text-muted-foreground">Get reminded when it's time to take your medication</p>
          </div>
          <Switch
            id="med-reminders"
            checked={notifications.medicationReminders}
            disabled={isTogglingReminders}
            onCheckedChange={async (checked) => {
              setIsTogglingReminders(true);
              try {
                setNotifications(prev => ({ ...prev, medicationReminders: checked }));
                if (checked) {
                  // Transform medications + schedules into reminder format
                  const medicationReminders = medications.map(med => {
                    const medSchedules = (schedules || []).filter(s => s.medication_id === med.id);
                    const allTimes = medSchedules.flatMap(s => s.times || []);
                    return {
                      id: med.id,
                      name: med.name,
                      dosage: med.dosage,
                      times: allTimes.length > 0 ? allTimes : ['08:00'] // fallback time
                    };
                  }).filter(m => m.times.length > 0);
                  
                  await scheduleAllMedicationReminders(medicationReminders);
                  toast.success('Setting Updated successfully');
                } else {
                  await cancelAllReminders();
                  toast.success('Setting Updated successfully');
                }
              } catch (error: any) {
                console.error('Error toggling medication reminders:', error);
                toast.error(error?.message || 'Failed to update reminders. Please try again.');
                setNotifications(prev => ({ ...prev, medicationReminders: !checked }));
              } finally {
                setIsTogglingReminders(false);
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="abnormal-readings">Abnormal Readings Alert</Label>
            <p className="text-sm text-muted-foreground">Get alerted when readings are outside normal range</p>
          </div>
          <Switch
            id="abnormal-readings"
            checked={notifications.abnormalReadings}
            onCheckedChange={(checked) => {
              setNotifications(prev => ({ ...prev, abnormalReadings: checked }));
              toast.success('Setting Updated successfully');
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-summary">Daily Summary</Label>
            <p className="text-sm text-muted-foreground">Receive a daily health summary notification</p>
          </div>
          <Switch
            id="daily-summary"
            checked={notifications.dailySummary}
            onCheckedChange={(checked) => {
              setNotifications(prev => ({ ...prev, dailySummary: checked }));
              toast.success('Setting Updated successfully');
            }}
          />
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={sendTestNotification}
          >
            <Bell className="h-4 w-4" />
            Send Test Notification (5s)
          </Button>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Use this to verify your device's notification settings and sound.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-label font-medium">Email Notifications</h4>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifs">Weekly Health Report</Label>
            <p className="text-sm text-muted-foreground">Receive weekly health summary via email</p>
          </div>
          <Switch
            id="email-notifs"
            checked={notifications.emailNotifications}
            onCheckedChange={(checked) => {
              setNotifications(prev => ({ ...prev, emailNotifications: checked }));
              toast.success('Setting Updated successfully');
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-label font-medium">Appearance</h4>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => setTheme('light')}
          >
            <Sun className="h-5 w-5" />
            <span className="text-xs">Light</span>
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => setTheme('dark')}
          >
            <Moon className="h-5 w-5" />
            <span className="text-xs">Dark</span>
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => setTheme('system')}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-xs">System</span>
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-label font-medium">Email Verification</h4>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">{user?.email}</span>
          </div>

          {user?.email_confirmed_at ? (
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Email verified</span>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-warning">Email not verified</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleResendVerification}
                disabled={resendingVerification}
              >
                {resendingVerification ? 'Sending...' : 'Resend verification email'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-label font-medium">Data Privacy</h4>
        <p className="text-sm text-muted-foreground">
          Your health data is encrypted and stored securely. We never share your personal information with third parties.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>End-to-end encryption for all health data</li>
          <li>Data stored on secure cloud servers</li>
          <li>You can export or delete your data anytime</li>
        </ul>
      </div>
    </div>
  );

  const renderHelpSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-label font-medium">Frequently Asked Questions</h4>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium mb-2">How do I log a reading?</h5>
            <p className="text-sm text-muted-foreground">
              Go to the Readings tab and tap the + button to add a new blood sugar or blood pressure reading.
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium mb-2">How do I set up medication reminders?</h5>
            <p className="text-sm text-muted-foreground">
              Go to Medications tab, add your medication with the scheduled times, and enable notifications in settings.
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium mb-2">How do I export my data?</h5>
            <p className="text-sm text-muted-foreground">
              Go to Profile and tap "Export Data" to download your health records as PDF or CSV.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-label font-medium">Contact Support</h4>
        <p className="text-sm text-muted-foreground">
          Need help? Contact us at support@careforab.app
        </p>
      </div>
    </div>
  );

  const getTitle = () => {
    switch (type) {
      case 'notifications': return 'Notifications';
      case 'privacy': return 'Privacy & Security';
      case 'help': return 'Help & Support';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'notifications': return 'Manage your notification preferences';
      case 'privacy': return 'Manage your privacy settings and appearance';
      case 'help': return 'Get help and learn how to use the app';
    }
  };

  return (
    <ErrorBoundary>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>

          {type === 'notifications' && renderNotificationsSettings()}
          {type === 'privacy' && renderPrivacySettings()}
          {type === 'help' && renderHelpSettings()}
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
};
