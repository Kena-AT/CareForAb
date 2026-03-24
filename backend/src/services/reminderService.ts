import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import { emailService } from './emailService';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export class ReminderService {
  private isProcessing = false;

  async checkAndSendReminders() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      // Get current hour and minute in HH:mm format, ensuring 24h format
      const currentHourMinute = now.getHours().toString().padStart(2, '0') + ':' + 
                               now.getMinutes().toString().padStart(2, '0');
      
      console.log(`[ReminderService] Checking for medications due at ${currentHourMinute}...`);
      
      const { data: medications, error } = await supabase
        .from('medications')
        .select(`
          *,
          profiles:user_id (full_name, id)
        `)
        .eq('is_active', true);

      if (error) throw error;
      if (!medications) return;

      for (const med of medications) {
        if (med.times && med.times.includes(currentHourMinute)) {
          const userEmail = await this.getUserEmail(med.user_id);
          if (userEmail) {
            await emailService.sendMedicationReminder(
              userEmail,
              med.profiles?.full_name || 'Valued User',
              med.name,
              med.dosage,
              currentHourMinute
            );
          }
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error in checkAndSendReminders:', error);
    } finally {
      this.isProcessing = false;
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
