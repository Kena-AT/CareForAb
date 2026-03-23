import { createClient } from '@supabase/supabase-js';
import { emailService } from './emailService';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Use service role key if available for admin operations
export const supabase = createClient(supabaseUrl!, supabaseKey!);

export class ReminderService {
  async checkAndSendReminders() {
    console.log('[ReminderService] Checking for due medications...');
    
    try {
      // 1. Get current time in HH:mm format
      const now = new Date();
      const currentHourMinute = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      // 2. Fetch active medications
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
        // Simple logic: if current time matches one of the scheduled times
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
            console.log(`[ReminderService] Sent reminder to ${userEmail} for ${med.name}`);
          }
        }
      }
    } catch (error) {
      console.error('[ReminderService] Error checking reminders:', error);
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // Note: Email is in auth.users, which is not directly accessible via public schema 
    // unless we use the Admin API or have a profile column.
    // Assuming we might have it stored in profiles or we use Admin API.
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.error('[ReminderService] Error fetching user email:', error);
      return null;
    }
    return data.user?.email || null;
  }

  startCron() {
    // Basic interval every minute for demonstration
    // In production, use a proper cron library like 'node-cron'
    setInterval(() => this.checkAndSendReminders(), 60000);
    console.log('[ReminderService] Cron job started (every 1 minute)');
  }
}

export const reminderService = new ReminderService();
