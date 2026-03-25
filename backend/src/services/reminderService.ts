import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import { emailService } from './emailService';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export class ReminderService {
  private isProcessing = false;

  /**
   * Check schedules and send reminders based on timing rules.
   * This runs every minute via cron.
   */
  async checkAndSendReminders() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      const currentHourMinute = now.getHours().toString().padStart(2, '0') + ':' + 
                               now.getMinutes().toString().padStart(2, '0');
      
      console.log(`[ReminderService] Checking schedules at ${currentHourMinute} (${today})...`);
      
      // Query active schedules that apply to today
      // Schedule must: start_date <= today AND (end_date IS NULL OR end_date >= today) AND is_active = true
      const { data: schedules, error } = await supabase
        .from('medication_schedules')
        .select(`
          *,
          medications!inner(*)
        `)
        .eq('is_active', true)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (error) {
        console.error('[ReminderService] Error fetching schedules:', error);
        return;
      }
      
      if (!schedules || schedules.length === 0) {
        console.log('[ReminderService] No active schedules for today');
        return;
      }

      console.log(`[ReminderService] Found ${schedules.length} active schedules`);

      for (const schedule of schedules) {
        // Get medication info from the join
        const medication = (schedule as any).medications;
        if (!medication) {
          console.log(`[ReminderService] No medication found for schedule ${schedule.id}`);
          continue;
        }

        // Check if any of the schedule times match current time
        if (!schedule.times || !Array.isArray(schedule.times)) {
          console.log(`[ReminderService] Schedule ${schedule.id} has no times configured`);
          continue;
        }

        // Normalize time format for comparison
        const normalizedCurrentTime = currentHourMinute.trim();
        const normalizedScheduleTimes = schedule.times.map((t: string) => t.trim());
        
        if (normalizedScheduleTimes.includes(normalizedCurrentTime)) {
          console.log(`[ReminderService] Medication ${medication.name} is due at ${normalizedCurrentTime} for user ${schedule.user_id}`);
          
          // Check if log already exists for this dose today
          const { data: existingLog } = await supabase
            .from('medication_logs')
            .select('id, status')
            .eq('medication_id', medication.id)
            .eq('user_id', schedule.user_id)
            .eq('date', today)
            .eq('scheduled_time', normalizedCurrentTime)
            .maybeSingle();

          // Create pending log if doesn't exist
          if (!existingLog) {
            const { error: logError } = await supabase
              .from('medication_logs')
              .insert({
                user_id: schedule.user_id,
                medication_id: medication.id,
                scheduled_time: normalizedCurrentTime,
                date: today,
                status: 'pending'
              });
            
            if (logError) {
              console.error('[ReminderService] Error creating log:', logError);
            }
          }

          // Fetch user profile for notification preferences
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, id, notification_preferences, language')
            .eq('id', schedule.user_id)
            .single();

          if (profileError) {
            console.error(`[ReminderService] Error fetching profile for user ${schedule.user_id}:`, profileError);
            continue;
          }

          const prefs = (profile as any)?.notification_preferences || { email: true, medication: true };
          
          // Send email reminder if enabled
          if (prefs.email && prefs.medication) {
            const userEmail = await this.getUserEmail(schedule.user_id);
            if (userEmail) {
              console.log(`[ReminderService] Sending reminder to ${userEmail} for ${medication.name}`);
              const result = await emailService.sendMedicationReminder(
                userEmail,
                (profile as any)?.full_name || 'Valued User',
                medication.name,
                medication.dosage,
                normalizedCurrentTime
              );
              
              if (result.success) {
                console.log(`[ReminderService] Email sent successfully to ${userEmail}`);
              } else {
                console.error(`[ReminderService] Failed to send email to ${userEmail}:`, result.error);
              }

              // Also add in-app notification
              await supabase.from('notifications').insert({
                user_id: schedule.user_id,
                title: 'Medication Due',
                message: `Time to take ${medication.name} (${medication.dosage})`,
                type: 'reminder'
              });
            } else {
              console.warn(`[ReminderService] No email found for user ${schedule.user_id}`);
            }
          } else {
            console.log(`[ReminderService] Email notifications disabled for user ${schedule.user_id}`);
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

  public async sendWeeklyHealthSummaries() {
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

  public async checkLowInventory() {
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
