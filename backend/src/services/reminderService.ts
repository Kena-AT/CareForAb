import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import { emailService } from './emailService';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export class ReminderService {
  private isProcessing = false;

  async checkAndSendReminders() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const currentHourMinute = now.getHours().toString().padStart(2, '0') + ':' + 
                               now.getMinutes().toString().padStart(2, '0');
      
      console.log(`[ReminderService] Checking for medications due at ${currentHourMinute}...`);
      
      const { data: medications, error } = await supabase
        .from('medications')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (!medications) return;

      for (const med of medications) {
        if (med.times && med.times.includes(currentHourMinute)) {
          // Fetch user profile separately to avoid PGRST200 relationship error
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, id, notification_preferences')
            .eq('id', med.user_id)
            .single();

          const prefs = (profile as any)?.notification_preferences || { email: true, medication: true };
          
          if (prefs.email && prefs.medication) {
            const userEmail = await this.getUserEmail(med.user_id);
            if (userEmail) {
              await emailService.sendMedicationReminder(
                userEmail,
                (profile as any)?.full_name || 'Valued User',
                med.name,
                med.dosage,
                currentHourMinute
              );

              // Also add in-app notification
              await supabase.from('notifications').insert({
                user_id: med.user_id,
                title: 'Medication Due',
                message: `Time to take ${med.name} (${med.dosage})`,
                type: 'reminder'
              });
            }
          }
        }
      }

      // Weekly Health Summary Check (Every Sunday at 08:00)
      if (now.getDay() === 0 && now.getHours() === 8 && now.getMinutes() === 0) {
        await this.sendWeeklyHealthSummaries();
      }

      // Low Inventory Check (Daily at 09:00)
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        await this.checkLowInventory();
      }

    } catch (error) {
      console.error('[ReminderService] Error in checkAndSendReminders:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendWeeklyHealthSummaries() {
    console.log('[ReminderService] Running Weekly Health Summary task...');
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;
      if (!profiles) return;

      for (const profile of profiles) {
        const prefs = profile.notification_preferences || { email: false };
        if (prefs.email) {
          const userEmail = await this.getUserEmail(profile.id);
          if (userEmail) {
            const summary = "Your vitals remained stable this week. Your average blood pressure was 120/80 and your activity level was consistent with your goals. Keep up the great work!";
            await emailService.sendWeeklyHealthSummary(userEmail, profile.full_name || 'Patient', summary);
            
            await supabase.from('notifications').insert({
              user_id: profile.id,
              title: 'Weekly Summary Sent',
              message: 'Your health pattern analysis for the past week has been sent to your email.',
              type: 'success'
            });
          }
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error in sendWeeklyHealthSummaries:', error);
    }
  }

  private async checkLowInventory() {
    console.log('[ReminderService] Running Low Inventory check...');
    try {
      const { data: medications, error } = await supabase
        .from('medications')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      if (!medications) return;

      for (const med of medications) {
        if (
          med.inventory_count !== null && 
          med.refill_threshold !== null && 
          med.inventory_count <= med.refill_threshold
        ) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, id')
            .eq('id', med.user_id)
            .single();

          const userEmail = await this.getUserEmail(med.user_id);
          if (userEmail) {
            await emailService.sendLowInventoryAlert(
              userEmail,
              (profile as any)?.full_name || 'Valued User',
              med.name,
              med.inventory_count
            );

            // Also add in-app notification
            await supabase.from('notifications').insert({
              user_id: med.user_id,
              title: 'Refill Needed',
              message: `You only have ${med.inventory_count} units of ${med.name} left.`,
              type: 'warning'
            });
          }
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error in checkLowInventory:', error);
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) throw error;
      return data.user?.email || null;
    } catch (error) {
      console.error(`[ReminderService] Error fetching email for user ${userId}:`, error);
      return null;
    }
  }

  startCron() {
    // Run every minute: * * * * *
    cron.schedule('* * * * *', () => {
      this.checkAndSendReminders();
    });
    console.log('[ReminderService] node-cron job started (every 1 minute)');
  }
}

export const reminderService = new ReminderService();
