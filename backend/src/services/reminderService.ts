import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import { emailService } from './emailService';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

const CRON_LOCK_KEY = 12345;
const ABANDON_AFTER_RETRIES = 3;

interface ReminderExecution {
  id: string;
  medication_log_id: string;
  user_id: string;
  attempted_at: string;
  status: 'pending' | 'sent' | 'failed' | 'abandoned';
  retry_count: number;
  error_message?: string;
  email_provider_response?: string;
  reminder_type: string;
}

export class ReminderService {
  private isProcessing = false;
  private readonly REMINDER_WINDOW_MINUTES = 15;
  private readonly MAX_RETRIES = ABANDON_AFTER_RETRIES;
  private serviceLogger = logger.child({ component: 'ReminderService' });

  private async acquireLock(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('pg_try_advisory_lock', { key: CRON_LOCK_KEY });
      if (error) {
        this.serviceLogger.warn({ error }, 'Failed to check advisory lock');
        return false;
      }
      return data === true;
    } catch (err) {
      this.serviceLogger.error({ err }, 'Exception acquiring advisory lock');
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    try {
      await supabase.rpc('pg_advisory_unlock', { key: CRON_LOCK_KEY });
    } catch (err) {
      this.serviceLogger.error({ err }, 'Exception releasing advisory lock');
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getUserTime(timezone: string = 'UTC'): { time: string; minutes: number; date: string } {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const hours = userTime.getHours().toString().padStart(2, '0');
    const minutes = userTime.getMinutes().toString().padStart(2, '0');
    const year = userTime.getFullYear();
    const month = (userTime.getMonth() + 1).toString().padStart(2, '0');
    const day = userTime.getDate().toString().padStart(2, '0');
    return { time: `${hours}:${minutes}`, minutes: this.timeToMinutes(`${hours}:${minutes}`), date: `${year}-${month}-${day}` };
  }

  private isWithinReminderWindow(scheduledMinutes: number, currentMinutes: number): boolean {
    const windowEnd = currentMinutes + this.REMINDER_WINDOW_MINUTES;
    if (windowEnd < 1440) return scheduledMinutes >= currentMinutes && scheduledMinutes <= windowEnd;
    return scheduledMinutes >= currentMinutes || scheduledMinutes <= (windowEnd - 1440);
  }

  async checkAndSendReminders() {
    const hasLock = await this.acquireLock();
    if (!hasLock) { this.serviceLogger.debug('Another instance processing, skipping'); return; }
    if (this.isProcessing) { await this.releaseLock(); return; }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.serviceLogger.info('Starting reminder check');
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const { data: schedules, error: scheduleError } = await supabase
        .from('medication_schedules')
        .select(`*,medications!inner(*)`)
        .eq('is_active', true)
        .lte('start_date', today)
        .or(`is_indefinite.eq.true,end_date.gte.${today}`);

      if (scheduleError) { this.serviceLogger.error({ error: scheduleError }, 'Error fetching schedules'); return; }
      if (!schedules?.length) { this.serviceLogger.debug('No active schedules'); return; }

      const userSchedules = new Map<string, typeof schedules>();
      for (const schedule of schedules) {
        const existing = userSchedules.get(schedule.user_id) || [];
        existing.push(schedule);
        userSchedules.set(schedule.user_id, existing);
      }

      for (const [userId, userScheduleList] of userSchedules) {
        await this.processUserReminders(userId, userScheduleList);
      }

      await this.runMaintenanceTasks();
      this.serviceLogger.info({ duration: Date.now() - startTime, usersProcessed: userSchedules.size }, 'Reminder check completed');
    } catch (error) {
      this.serviceLogger.error({ error }, 'Error in checkAndSendReminders');
    } finally {
      this.isProcessing = false;
      await this.releaseLock();
    }
  }

  private async processUserReminders(userId: string, schedules: any[]) {
    const userLogger = this.serviceLogger.child({ userId });
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name,id,notification_preferences,language,timezone,email')
      .eq('id', userId)
      .single();

    if (profileError) { userLogger.error({ error: profileError }, 'Error fetching profile'); return; }

    const timezone = profile?.timezone || 'UTC';
    const prefs = profile?.notification_preferences || { email: true, medication: true };
    const userEmail = profile?.email;
    if (!prefs.email || !prefs.medication) { userLogger.debug('Notifications disabled'); return; }

    const userNow = this.getUserTime(timezone);
    userLogger.debug({ time: userNow.time, timezone }, 'Processing reminders');

    for (const schedule of schedules) {
      const medication = schedule.medications;
      if (!medication || !schedule.specific_times || !Array.isArray(schedule.specific_times)) continue;

      for (const scheduledTime of schedule.specific_times) {
        const scheduledMinutes = this.timeToMinutes(scheduledTime);
        if (!this.isWithinReminderWindow(scheduledMinutes, userNow.minutes)) continue;

        const logId = await this.getOrCreateLog(userId, medication.id, scheduledTime, userNow.date);
        if (!logId) continue;

        const executionStatus = await this.getExecutionStatus(logId);
        if (executionStatus?.status === 'sent') { userLogger.debug({ medication: medication.name }, 'Already sent'); continue; }
        if (executionStatus?.status === 'abandoned') { userLogger.debug({ medication: medication.name }, 'Abandoned'); continue; }

        await this.sendReminderWithDeadLetter(userId, logId, medication, scheduledTime, userNow.date, profile?.full_name || 'User', userEmail, executionStatus);
      }
    }
  }

  private async getOrCreateLog(userId: string, medicationId: string, scheduledTime: string, date: string): Promise<string | null> {
    const { data: existingLog } = await supabase.from('medication_logs').select('id').eq('medication_id', medicationId).eq('user_id', userId).eq('date', date).eq('scheduled_time', scheduledTime).maybeSingle();
    if (existingLog) return existingLog.id;

    const { data: newLog, error } = await supabase.from('medication_logs').insert({ user_id: userId, medication_id: medicationId, scheduled_time: scheduledTime, date: date, status: 'pending' }).select('id').single();
    if (error) {
      if (error.code === '23505') {
        const { data: raceLog } = await supabase.from('medication_logs').select('id').eq('medication_id', medicationId).eq('user_id', userId).eq('date', date).eq('scheduled_time', scheduledTime).single();
        return raceLog?.id || null;
      }
      this.serviceLogger.error({ error }, 'Error creating log');
      return null;
    }
    return newLog.id;
  }

  private async getExecutionStatus(logId: string): Promise<ReminderExecution | null> {
    const { data } = await supabase.from('reminder_executions').select('*').eq('medication_log_id', logId).eq('reminder_type', 'medication').maybeSingle();
    return data as ReminderExecution | null;
  }

  private async sendReminderWithDeadLetter(
    userId: string, logId: string, medication: { id: string; name: string; dosage: string },
    scheduledTime: string, date: string, userName: string, userEmail: string | null,
    existingExecution: ReminderExecution | null
  ) {
    const executionLogger = this.serviceLogger.child({ logId, medication: medication.name, userId });
    if (!userEmail) { executionLogger.warn('No email, marking abandoned'); await this.createOrUpdateExecution(logId, userId, 'abandoned', 0, 'No email'); return; }

    const retryCount = existingExecution?.retry_count || 0;
    if (retryCount >= this.MAX_RETRIES && existingExecution?.status === 'failed') {
      executionLogger.warn({ retryCount }, 'Max retries, marking abandoned');
      await this.createOrUpdateExecution(logId, userId, 'abandoned', retryCount, 'Max retries exceeded');
      return;
    }
    if (!existingExecution) await this.createOrUpdateExecution(logId, userId, 'pending', 0);

    executionLogger.info('Sending reminder');
    const result = await emailService.sendMedicationReminder(userEmail, userName, medication.name, medication.dosage, scheduledTime);

    if (result.success) {
      await this.createOrUpdateExecution(logId, userId, 'sent', retryCount, undefined, 'Email sent');
      await supabase.from('notifications').insert({ user_id: userId, title: 'Medication Due', message: `Time to take ${medication.name} (${medication.dosage})`, type: 'reminder' });
      executionLogger.info('Reminder sent');
    } else {
      const newRetryCount = retryCount + 1;
      const errorMessage = result.error instanceof Error ? result.error.message : 'Unknown error';
      const newStatus = newRetryCount >= this.MAX_RETRIES ? 'abandoned' : 'failed';
      await this.createOrUpdateExecution(logId, userId, newStatus, newRetryCount, errorMessage, JSON.stringify(result.error));
      executionLogger.error({ error: errorMessage, retryCount: newRetryCount, status: newStatus }, 'Failed to send');
    }
  }

  private async createOrUpdateExecution(
    logId: string, userId: string, status: 'pending' | 'sent' | 'failed' | 'abandoned',
    retryCount: number, errorMessage?: string, providerResponse?: string
  ) {
    const { error } = await supabase.from('reminder_executions').upsert({
      medication_log_id: logId, user_id: userId, status, retry_count: retryCount,
      error_message: errorMessage || null, email_provider_response: providerResponse || null,
      attempted_at: new Date().toISOString(), reminder_type: 'medication'
    }, { onConflict: 'medication_log_id,reminder_type' });
    if (error) this.serviceLogger.error({ error, logId }, 'Failed to update execution');
  }

  private async runMaintenanceTasks() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      this.serviceLogger.info('Running maintenance');
      const { data, error } = await supabase.rpc('deactivate_expired_schedules');
      if (error) this.serviceLogger.error({ error }, 'Maintenance failed');
      else this.serviceLogger.info({ deactivated: data }, 'Maintenance complete');
    }
    if (now.getDay() === 0 && now.getHours() === 8 && now.getMinutes() === 0) await this.sendWeeklyHealthSummaries();
    if (now.getHours() === 9 && now.getMinutes() === 0) await this.checkLowInventory();
  }

  public async sendWeeklyHealthSummaries() {
    this.serviceLogger.info('Starting weekly summaries');
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      if (!profiles) return;
      for (const profile of profiles) {
        const prefs = profile.notification_preferences || { email: false };
        if (prefs.email) {
          const userEmail = await this.getUserEmail(profile.id);
          if (userEmail) {
            await emailService.sendWeeklyHealthSummary(userEmail, profile.full_name || 'Patient', 'Your vitals remained stable this week.');
            await supabase.from('notifications').insert({ user_id: profile.id, title: 'Weekly Summary Sent', message: 'Your health analysis has been sent.', type: 'success' });
          }
        }
      }
      this.serviceLogger.info({ count: profiles.length }, 'Weekly summaries sent');
    } catch (error) { this.serviceLogger.error({ error }, 'Error sending summaries'); }
  }

  public async checkLowInventory() {
    this.serviceLogger.info('Starting low inventory check');
    try {
      const { data: medications, error } = await supabase.from('medications').select('*').eq('is_active', true);
      if (error) throw error;
      if (!medications) return;
      let alertCount = 0;
      for (const med of medications) {
        if (med.inventory_count !== null && med.refill_threshold !== null && med.inventory_count <= med.refill_threshold) {
          const userEmail = await this.getUserEmail(med.user_id);
          if (userEmail) {
            await emailService.sendLowInventoryAlert(userEmail, 'User', med.name, med.inventory_count);
            await supabase.from('notifications').insert({ user_id: med.user_id, title: 'Refill Needed', message: `Only ${med.inventory_count} units of ${med.name} left.`, type: 'warning' });
            alertCount++;
          }
        }
      }
      this.serviceLogger.info({ alertCount }, 'Low inventory check complete');
    } catch (error) { this.serviceLogger.error({ error }, 'Error checking inventory'); }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) throw error;
      return data.user?.email || null;
    } catch (error) { this.serviceLogger.error({ error, userId }, 'Error fetching email'); return null; }
  }

  startCron() {
    cron.schedule('* * * * *', () => this.checkAndSendReminders());
    this.serviceLogger.info('Cron job started');
  }
}

export const reminderService = new ReminderService();
