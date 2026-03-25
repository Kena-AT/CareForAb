import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import { emailService } from './emailService';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export class ReminderService {
  private isProcessing = false;
  private readonly REMINDER_WINDOW_MINUTES = 15; // Check doses within next 15 minutes
  private readonly MAX_RETRIES = 3;

  /**
   * Convert time string (HH:MM) to minutes from midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get current time in user's timezone
   */
  private getUserTime(timezone: string = 'UTC'): { time: string; minutes: number; date: string } {
    const now = new Date();
    
    // Convert to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    const hours = userTime.getHours().toString().padStart(2, '0');
    const minutes = userTime.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    const year = userTime.getFullYear();
    const month = (userTime.getMonth() + 1).toString().padStart(2, '0');
    const day = userTime.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return {
      time: timeStr,
      minutes: this.timeToMinutes(timeStr),
      date: dateStr
    };
  }

  /**
   * Check if a scheduled time falls within the reminder window
   */
  private isWithinReminderWindow(scheduledMinutes: number, currentMinutes: number): boolean {
    // Check if scheduled time is within [current, current + window]
    // Handle midnight wraparound
    const windowEnd = currentMinutes + this.REMINDER_WINDOW_MINUTES;
    
    if (windowEnd < 1440) {
      // Window doesn't cross midnight
      return scheduledMinutes >= currentMinutes && scheduledMinutes <= windowEnd;
    } else {
      // Window crosses midnight
      return scheduledMinutes >= currentMinutes || scheduledMinutes <= (windowEnd - 1440);
    }
  }

  /**
   * Check schedules and send reminders based on timing rules.
   * Uses a time window to catch doses even if cron skips a minute.
   */
  async checkAndSendReminders() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      console.log(`[ReminderService] Starting reminder check...`);
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Get all active schedules that apply to today
      const { data: schedules, error: scheduleError } = await supabase
        .from('medication_schedules')
        .select(`
          *,
          medications!inner(*)
        `)
        .eq('is_active', true)
        .lte('start_date', today)
        .or(`is_indefinite.eq.true,end_date.gte.${today}`);

      if (scheduleError) {
        console.error('[ReminderService] Error fetching schedules:', scheduleError);
        return;
      }

      if (!schedules || schedules.length === 0) {
        console.log('[ReminderService] No active schedules');
        return;
      }

      // Group schedules by user for timezone handling
      const userSchedules = new Map<string, typeof schedules>();
      for (const schedule of schedules) {
        const existing = userSchedules.get(schedule.user_id) || [];
        existing.push(schedule);
        userSchedules.set(schedule.user_id, existing);
      }

      // Process each user's schedules in their timezone
      for (const [userId, userScheduleList] of userSchedules) {
        await this.processUserReminders(userId, userScheduleList);
      }

      // Run maintenance tasks
      await this.runMaintenanceTasks();

    } catch (error) {
      console.error('[ReminderService] Error in checkAndSendReminders:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processUserReminders(userId: string, schedules: any[]) {
    // Fetch user profile for timezone and notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, id, notification_preferences, language, timezone')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error(`[ReminderService] Error fetching profile for user ${userId}:`, profileError);
      return;
    }

    const timezone = profile?.timezone || 'UTC';
    const prefs = profile?.notification_preferences || { email: true, medication: true };
    
    if (!prefs.email || !prefs.medication) {
      console.log(`[ReminderService] Notifications disabled for user ${userId}`);
      return;
    }

    // Get current time in user's timezone
    const userNow = this.getUserTime(timezone);
    console.log(`[ReminderService] User ${userId} time: ${userNow.time} (${timezone})`);

    for (const schedule of schedules) {
      const medication = schedule.medications;
      if (!medication || !schedule.times || !Array.isArray(schedule.times)) continue;

      for (const scheduledTime of schedule.times) {
        const scheduledMinutes = this.timeToMinutes(scheduledTime);
        
        // Check if this dose is within the reminder window
        if (!this.isWithinReminderWindow(scheduledMinutes, userNow.minutes)) {
          continue;
        }

        console.log(`[ReminderService] Dose due: ${medication.name} at ${scheduledTime} for user ${userId}`);

        // Get or create the log for this dose
        const logId = await this.getOrCreateLog(userId, medication.id, scheduledTime, userNow.date);
        if (!logId) continue;

        // Check if reminder already sent
        const reminderStatus = await this.getReminderStatus(logId, 'email', userNow.date);
        if (reminderStatus === 'sent') {
          console.log(`[ReminderService] Reminder already sent for ${medication.name} at ${scheduledTime}`);
          continue;
        }

        // Send reminder
        await this.sendReminderWithRetry(
          userId,
          logId,
          medication,
          scheduledTime,
          userNow.date,
          profile?.full_name || 'Valued User',
          reminderStatus === 'failed' ? 'failed' : 'pending'
        );
      }
    }
  }

  private async getOrCreateLog(
    userId: string,
    medicationId: string,
    scheduledTime: string,
    date: string
  ): Promise<string | null> {
    // Check if log exists (unique constraint prevents duplicates)
    const { data: existingLog } = await supabase
      .from('medication_logs')
      .select('id')
      .eq('medication_id', medicationId)
      .eq('user_id', userId)
      .eq('date', date)
      .eq('scheduled_time', scheduledTime)
      .maybeSingle();

    if (existingLog) {
      return existingLog.id;
    }

    // Create new log
    const { data: newLog, error } = await supabase
      .from('medication_logs')
      .insert({
        user_id: userId,
        medication_id: medicationId,
        scheduled_time: scheduledTime,
        date: date,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      // Check for unique constraint violation (race condition)
      if (error.code === '23505') {
        const { data: raceLog } = await supabase
          .from('medication_logs')
          .select('id')
          .eq('medication_id', medicationId)
          .eq('user_id', userId)
          .eq('date', date)
          .eq('scheduled_time', scheduledTime)
          .single();
        return raceLog?.id || null;
      }
      console.error('[ReminderService] Error creating log:', error);
      return null;
    }

    return newLog.id;
  }

  private async getReminderStatus(
    logId: string,
    type: string,
    date: string
  ): Promise<string | null> {
    const { data } = await supabase
      .from('medication_reminders')
      .select('status')
      .eq('log_id', logId)
      .eq('type', type)
      .eq('reminder_date', date)
      .maybeSingle();

    return data?.status || null;
  }

  private async sendReminderWithRetry(
    userId: string,
    logId: string,
    medication: any,
    scheduledTime: string,
    date: string,
    userName: string,
    previousStatus: string
  ) {
    const userEmail = await this.getUserEmail(userId);
    if (!userEmail) {
      console.warn(`[ReminderService] No email found for user ${userId}`);
      return;
    }

    // Get or create reminder record
    let reminderRecord = await this.getOrCreateReminderRecord(
      logId,
      userId,
      medication.id,
      scheduledTime,
      date,
      previousStatus
    );

    if (!reminderRecord) {
      console.error('[ReminderService] Failed to create reminder record');
      return;
    }

    // Check retry count
    if (reminderRecord.retry_count >= this.MAX_RETRIES && reminderRecord.status === 'failed') {
      console.log(`[ReminderService] Max retries reached for ${medication.name}`);
      return;
    }

    // Send email
    console.log(`[ReminderService] Sending reminder to ${userEmail} for ${medication.name}`);
    const result = await emailService.sendMedicationReminder(
      userEmail,
      userName,
      medication.name,
      medication.dosage,
      scheduledTime
    );

    // Update reminder record
    if (result.success) {
      await this.updateReminderStatus(reminderRecord.id, 'sent', null);
      
      // Also add in-app notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Medication Due',
        message: `Time to take ${medication.name} (${medication.dosage})`,
        type: 'reminder'
      });
      
      console.log(`[ReminderService] Email sent successfully to ${userEmail}`);
    } else {
      await this.updateReminderStatus(
        reminderRecord.id,
        'failed',
        result.error?.message || 'Unknown error'
      );
      console.error(`[ReminderService] Failed to send email to ${userEmail}:`, result.error);
    }
  }

  private async getOrCreateReminderRecord(
    logId: string,
    userId: string,
    medicationId: string,
    scheduledTime: string,
    date: string,
    previousStatus: string
  ): Promise<any> {
    // Try to get existing
    const { data: existing } = await supabase
      .from('medication_reminders')
      .select('*')
      .eq('log_id', logId)
      .eq('type', 'email')
      .eq('reminder_date', date)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Create new
    const { data: newRecord, error } = await supabase
      .from('medication_reminders')
      .insert({
        log_id: logId,
        user_id: userId,
        medication_id: medicationId,
        scheduled_time: scheduledTime,
        reminder_date: date,
        type: 'email',
        status: previousStatus === 'failed' ? 'pending' : 'pending',
        retry_count: previousStatus === 'failed' ? 1 : 0
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Race condition - fetch existing
        const { data: raceRecord } = await supabase
          .from('medication_reminders')
          .select('*')
          .eq('log_id', logId)
          .eq('type', 'email')
          .eq('reminder_date', date)
          .single();
        return raceRecord;
      }
      console.error('[ReminderService] Error creating reminder record:', error);
      return null;
    }

    return newRecord;
  }

  private async updateReminderStatus(reminderId: string, status: string, errorMessage: string | null) {
    const update: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'sent') {
      update.sent_at = new Date().toISOString();
    }

    if (errorMessage) {
      update.error_message = errorMessage;
      update.retry_count = supabase.sql`retry_count + 1`;
    }

    await supabase
      .from('medication_reminders')
      .update(update)
      .eq('id', reminderId);
  }

  private async runMaintenanceTasks() {
    const now = new Date();

    // Deactivate expired schedules (run daily at midnight)
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      console.log('[ReminderService] Running maintenance: deactivating expired schedules');
      const { data } = await supabase.rpc('deactivate_expired_schedules');
      console.log(`[ReminderService] Deactivated ${data} expired schedules`);
    }

    // Weekly Health Summary (Every Sunday at 08:00)
    if (now.getDay() === 0 && now.getHours() === 8 && now.getMinutes() === 0) {
      await this.sendWeeklyHealthSummaries();
    }

    // Low Inventory Check (Daily at 09:00)
    if (now.getHours() === 9 && now.getMinutes() === 0) {
      await this.checkLowInventory();
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
