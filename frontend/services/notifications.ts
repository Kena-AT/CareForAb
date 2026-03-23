import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface MedicationReminder {
  id: number;
  medicationName: string;
  dosage: string;
  time: string; // HH:mm format
}

const playNotificationSound = () => {
  if (typeof window === 'undefined') return;
  try {
    // Using a remote beep sound as fallback if local file is missing
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.warn('[Notification Service] Browser blocked audio autoplay:', e));
  } catch (error) {
    console.warn('[Notification Service] Could not play browser notification sound:', error);
  }
};

export const initializeNotifications = async () => {
  if (typeof window === 'undefined') return false;
  
  const platform = Capacitor.getPlatform();
  console.log(`[Notification Service] Initializing on platform: ${platform}`);

  if (!Capacitor.isNativePlatform()) {
    console.log('[Notification Service] Native platform not detected. Attempting browser notification permission...');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await window.Notification.requestPermission();
      console.log(`[Notification Service] Browser notification permission: ${permission}`);
    }
    return false;
  }

  try {
    // Request permission for local notifications
    const localPermission = await LocalNotifications.requestPermissions();

    if (localPermission.display !== 'granted') {
      console.log('Local notification permission denied');
      return false;
    }

    // Create notification channel for Android
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: 'medication-reminders',
        name: 'Medication Reminders',
        description: 'Reminders for taking medication',
        sound: 'beep.wav',
        importance: 5,
        visibility: 1,
      });
      console.log('Notification channel created for Android');
    }

    // Request permission for push notifications
    const pushPermission = await PushNotifications.requestPermissions();

    if (pushPermission.receive !== 'granted') {
      console.log('Push notification permission denied');
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for push notification events
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error: ', error.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed: ', notification);
    });

    console.log('Notification permissions and registration complete');
    return true;
  } catch (error) {
    console.error('CRITICAL: Error initializing notifications:', error);
    return false;
  }
};

export const sendTestNotification = async () => {
  try {
    console.log(`[Notification Service] Attempting to send test notification in 5 seconds (Platform: ${Capacitor.getPlatform()})...`);
    const now = new Date();
    const scheduledDate = new Date(now.getTime() + 5000); // 5 seconds from now

    if (!Capacitor.isNativePlatform() && 'Notification' in window) {
      console.log('[Notification Service] Using browser fallback for test notification');
      setTimeout(() => {
        new Notification('Test Notification', {
          body: 'If you see this, browser notifications are working!',
          icon: '/placeholder.svg'
        });
        playNotificationSound();
      }, 5000);
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 999,
          title: 'Test Notification',
          body: 'If you see this, notifications are working!',
          schedule: { at: scheduledDate },
          sound: 'beep.wav',
          channelId: 'medication-reminders',
        }
      ]
    });
    console.log('Test notification scheduled for:', scheduledDate.toLocaleTimeString());
  } catch (error) {
    console.error('Error scheduling test notification:', error);
  }
};

export const scheduleMedicationReminder = async (reminder: MedicationReminder) => {
  if (!Capacitor.isNativePlatform()) {
    console.log(`[Notification Service] Platform is web. Attempting session-based browser fallback for ${reminder.medicationName}.`);

    // Simple browser-session fallback: calculate delay and use setTimeout
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const delay = scheduledDate.getTime() - now.getTime();
    console.log(`[Notification Service] Browser fallback: scheduled ${reminder.medicationName} in ${Math.round(delay / 1000 / 60)} minutes.`);

    if ('Notification' in window && Notification.permission === 'granted') {
      setTimeout(() => {
        new Notification('Medication Reminder', {
          body: `Time to take ${reminder.medicationName} (${reminder.dosage})`,
          icon: '/placeholder.svg'
        });
        playNotificationSound();
        // Re-schedule for next day
        scheduleMedicationReminder(reminder);
      }, delay);
    }
    return;
  }

  try {
    const [hours, minutes] = reminder.time.split(':').map(Number);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: reminder.id,
          title: 'Medication Reminder',
          body: `Time to take ${reminder.medicationName} (${reminder.dosage})`,
          schedule: {
            on: {
              hour: hours,
              minute: minutes
            },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: 'beep.wav',
          channelId: 'medication-reminders',
          actionTypeId: 'MEDICATION_REMINDER',
          extra: {
            medicationName: reminder.medicationName,
            dosage: reminder.dosage
          }
        }
      ]
    });

    console.log(`[Notification Service] Scheduled reminder: ${reminder.medicationName} (${reminder.dosage}) at ${reminder.time} (ID: ${reminder.id})`);
  } catch (error) {
    console.error(`[Notification Service] FAILED to schedule ${reminder.medicationName}:`, error);
  }
};

export const cancelMedicationReminder = async (reminderId: number) => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: reminderId }]
    });
    console.log(`Cancelled reminder ${reminderId}`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};

export const cancelAllReminders = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id }))
      });
    }
    console.log('Cancelled all reminders');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};

export const scheduleAllMedicationReminders = async (
  medications: Array<{ id: string; name: string; dosage: string; times: string[] }>
) => {
  // Cancel existing reminders first
  await cancelAllReminders();

  // Schedule new reminders
  let reminderIdCounter = 1;
  console.log(`[Notification Service] Starting to schedule ${medications.length} medications...`);
  for (const medication of medications) {
    for (const time of medication.times) {
      await scheduleMedicationReminder({
        id: reminderIdCounter++,
        medicationName: medication.name,
        dosage: medication.dosage,
        time
      });
    }
  }
  console.log('[Notification Service] Finished scheduling all reminders');
};
