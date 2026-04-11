/**
 * Brevo Email Service (Backend)
 * Handles sending transactional emails via Brevo API.
 */
// Using native fetch available in Node 18+
import dotenv from 'dotenv';

dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = process.env.APP_NAME || 'CareforAb';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export const sendEmail = async (
  to: EmailRecipient[],
  subject: string,
  htmlContent: string
) => {
  if (!BREVO_API_KEY) {
    console.error('[Brevo Service] API Key is missing.');
    return { success: false, error: 'API Key missing' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: to,
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Could not parse error response' }));
      console.error('[Brevo Service] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return { success: false, error: (errorData as any).message || response.statusText };
    }

    const data = await response.json();
    return { success: true, messageId: (data as any).messageId };
  } catch (error) {
    console.error('[Brevo Service] Network or unexpected error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
  }
};

export const sendVerificationEmail = async (email: string, verificationCode: string) => {
  const subject = 'Verify your email for CareforAb';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4f46e5; text-align: center;">Welcome to CareforAb!</h2>
      <p>Thank you for signing up. Please use the following code to verify your email address:</p>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${verificationCode}
      </div>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        &copy; ${new Date().getFullYear()} CareforAb. All rights reserved.
      </p>
    </div>
  `;

  return sendEmail([{ email }], subject, htmlContent);
};
