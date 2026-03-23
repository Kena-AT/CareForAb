import express from 'express';
import { emailService } from '../services/emailService';
import { supabase } from '../services/reminderService'; // Reusing the client

const router = express.Router();

// Simple in-memory storage for OTP codes (for demo)
// In production, use Redis or a database table
const otpCache = new Map<string, { code: string, expires: number, fullName: string }>();

router.post('/send-code', async (req, res) => {
  const { email, fullName } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in cache (expires in 10 minutes)
  otpCache.set(email, { 
    code, 
    expires: Date.now() + 10 * 60 * 1000,
    fullName: fullName || 'Valued User'
  });

  const result = await emailService.sendVerificationEmail(email, code, fullName || 'Valued User');

  if (result.success) {
    res.json({ message: 'Verification code sent via Brevo' });
  } else {
    res.status(500).json({ error: 'Failed to send email via Brevo' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  const cachedValue = otpCache.get(email);

  if (!cachedValue) {
    return res.status(400).json({ error: 'No code found for this email. Please request a new one.' });
  }

  if (Date.now() > cachedValue.expires) {
    otpCache.delete(email);
    return res.status(400).json({ error: 'Code expired. Please request a new one.' });
  }

  if (cachedValue.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }

  // Code is valid! 
  otpCache.delete(email);

  // If we have SERVICE_ROLE_KEY, we can confirm the user in Supabase
  try {
    const { data: userList, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) throw fetchError;

    const user = userList.users.find(u => u.email === email);
    if (user) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });
      if (updateError) throw updateError;
      return res.json({ message: 'Email verified and user confirmed!', confirmed: true });
    } else {
      return res.json({ message: 'Code verified, but user not found in database.', confirmed: false });
    }
  } catch (err) {
    console.error('Error confirming user in Supabase:', err);
    return res.json({ 
      message: 'Code verified successfully! (Manual confirmation might be needed if Service Role Key is missing)', 
      confirmed: false 
    });
  }
});

export default router;
