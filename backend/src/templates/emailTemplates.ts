export const emailTemplates = {
  verification: (fullName: string, code: string) => ({
    subject: "Verify your account - CareforAb",
    html: `
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
    `,
  }),
  medicationReminder: (fullName: string, medicationName: string, dosage: string, time: string) => ({
    subject: `Medication Reminder: ${medicationName}`,
    html: `
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
    `,
  }),
  weeklyHealthSummary: (fullName: string, summary: string) => ({
    subject: "Your Weekly Health Analysis Summary",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1a4d4a;">Weekly Health Insight for ${fullName}</h2>
        <p>Our AI has analyzed your health patterns over the last 7 days. Here is your summary:</p>
        <div style="background: #f4f7f6; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #1a4d4a;">
          <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">${summary}</div>
        </div>
        <p style="font-size: 14px; color: #666;">Log into the app to view detailed charts and personalized recommendations.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: center; color: #999; font-size: 12px;">This analysis is AI-generated for informational purposes and does not replace medical advice.</p>
        <p style="text-align: center; color: #999; font-size: 12px;">&copy; 2026 CareforAb. Monitoring your well-being.</p>
      </div>
    `,
  }),
};
