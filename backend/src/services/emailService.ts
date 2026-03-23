import SibApiV3Sdk from 'sib-api-v3-sdk';

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

  async sendVerificationEmail(to: string, code: string, fullName: string) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = "Verify your account - CareforAb";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1a4d4a;">Welcome to CareforAb, ${fullName}!</h2>
        <p>Thank you for joining our community. To complete your registration, please enter the following 6-digit verification code in the app:</p>
        <div style="background: #f4f7f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="letter-spacing: 5px; color: #1a4d4a; font-size: 32px; margin: 0;">${code}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: center; color: #999; font-size: 12px;">&copy; 2026 CareforAb. All rights reserved.</p>
      </div>
    `;
    sendSmtpEmail.sender = { "name": "CareforAb Support", "email": this.senderEmail };
    sendSmtpEmail.to = [{ "email": to, "name": fullName }];

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      return { success: true };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error };
    }
  }

  async sendMedicationReminder(to: string, fullName: string, medicationName: string, dosage: string, time: string) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = `Medication Reminder: ${medicationName}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1a4d4a;">Time for your medication</h2>
        <p>Hi ${fullName}, this is a friendly reminder to take your medication.</p>
        <div style="background: #f4f7f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Medication:</strong> ${medicationName}</p>
          <p><strong>Dosage:</strong> ${dosage}</p>
          <p><strong>Scheduled Time:</strong> ${time}</p>
        </div>
        <p>Please log this in the app once you've taken it.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: center; color: #999; font-size: 12px;">&copy; 2026 CareforAb. Your health companion.</p>
      </div>
    `;
    sendSmtpEmail.sender = { "name": "CareforAb Health", "email": this.senderEmail };
    sendSmtpEmail.to = [{ "email": to, "name": fullName }];

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      return { success: true };
    } catch (error) {
      console.error('Error sending medication reminder:', error);
      return { success: false, error };
    }
  }
}

export const emailService = new EmailService();
