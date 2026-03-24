import SibApiV3Sdk from 'sib-api-v3-sdk';
import { emailTemplates } from '../templates/emailTemplates';

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];

export class EmailService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private senderEmail: string;

  constructor() {
    apiKey.apiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;
    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.VITE_BREVO_SENDER_EMAIL || 'kenakaye11@gmail.com';
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(`[EmailService] Retrying send... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))); // Exponential backoff-ish
      return this.withRetry(fn, retries - 1);
    }
  }

  async sendVerificationEmail(to: string, code: string, fullName: string) {
    const template = emailTemplates.verification(fullName, code);
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = template.subject;
    sendSmtpEmail.htmlContent = template.html;
    sendSmtpEmail.sender = { "name": "CareforAb Support", "email": this.senderEmail };
    sendSmtpEmail.to = [{ "email": to, "name": fullName }];

    try {
      await this.withRetry(() => this.apiInstance.sendTransacEmail(sendSmtpEmail));
      return { success: true };
    } catch (error) {
      console.error('[EmailService] Failed to send verification email after retries:', error);
      return { success: false, error };
    }
  }

  async sendMedicationReminder(to: string, fullName: string, medicationName: string, dosage: string, time: string) {
    const template = emailTemplates.medicationReminder(fullName, medicationName, dosage, time);
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = template.subject;
    sendSmtpEmail.htmlContent = template.html;
    sendSmtpEmail.sender = { "name": "CareforAb Health", "email": this.senderEmail };
    sendSmtpEmail.to = [{ "email": to, "name": fullName }];

    try {
      await this.withRetry(() => this.apiInstance.sendTransacEmail(sendSmtpEmail));
      return { success: true };
    } catch (error) {
      console.error('[EmailService] Failed to send medication reminder after retries:', error);
      return { success: false, error };
    }
  }
}

export const emailService = new EmailService();
