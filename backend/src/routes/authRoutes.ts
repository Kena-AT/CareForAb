import express from 'express';
import { emailService } from '../services/emailService';
import { supabase } from '../services/reminderService'; // Reusing the client

import { cacheService } from '../services/cacheService';

const router = express.Router();

// OTP expiration set to 10 minutes
const OTP_TTL = 10 * 60;

type VerificationPurpose = 'signup' | 'generic';

interface CachedVerificationPayload {
  code: string;
  fullName: string;
  dateOfBirth?: string;
  password?: string;
  purpose: VerificationPurpose;
}

router.post('/send-code', async (req, res) => {
  const { email, fullName, dateOfBirth, password, purpose } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store in cache
  const verificationPurpose: VerificationPurpose = purpose === 'signup' ? 'signup' : 'generic';

  cacheService.set(email, {
    code, 
    fullName: fullName || 'Valued User',
    dateOfBirth,
    password,
    purpose: verificationPurpose,
  }, OTP_TTL);

  const result = await emailService.sendVerificationEmail(email, code, fullName || 'Valued User');

  if (result.success) {
    res.json({ message: 'Verification code sent via Brevo' });
  } else {
    res.status(500).json({ error: 'Failed to send email via Brevo' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  const cachedValue = cacheService.get<CachedVerificationPayload>(email);

  if (!cachedValue) {
    return res.status(400).json({ error: 'No code found for this email or code expired. Please request a new one.' });
  }

  if (cachedValue.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }

  // Code is valid! 
  cacheService.delete(email);

  // Signup flow: create or finalize account in Supabase without Supabase email verification.
  if (cachedValue.purpose === 'signup') {
    if (!cachedValue.password) {
      return res.status(400).json({ error: 'Signup session is incomplete. Please request a new code.' });
    }

    try {
      const { data: userList, error: fetchError } = await supabase.auth.admin.listUsers();
      if (fetchError) throw fetchError;

      const existingUser = userList.users.find((u) => u.email === email);
      const userMetadata = {
        full_name: cachedValue.fullName || null,
        date_of_birth: cachedValue.dateOfBirth || null,
      };

      if (existingUser) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
          password: cachedValue.password,
          user_metadata: userMetadata,
        });

        if (updateError) throw updateError;

        return res.json({ message: 'Email verified and account is ready. You can now sign in.' });
      }

      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password: cachedValue.password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (createError) throw createError;

      return res.json({ message: 'Email verified and account created successfully.' });
    } catch (err) {
      console.error('Error creating or updating user in Supabase:', err);
      return res.status(500).json({ error: 'Verification passed, but account setup failed. Please try again.' });
    }
  }

  // Generic verification flow.
  return res.json({ message: 'Code verified successfully.' });
});

router.post('/reset-password', async (req, res) => {
  const { email, redirectTo } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { data: userList, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) throw fetchError;
    
    // Find user to get full name (for email template)
    const user = userList.users.find((u: any) => u.email === email);
    
    if (!user) {
      // Don't leak that user doesn't exist for security reasons
      return res.json({ message: 'If an account exists, a password reset link has been sent.' });
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo
      }
    });
    
    if (linkError) throw linkError;
    
    const fullName = user.user_metadata?.full_name || 'Valued User';
    const result = await emailService.sendPasswordResetEmail(email, linkData.properties.action_link, fullName);
    
    if (result.success) {
      return res.json({ message: 'If an account exists, a password reset link has been sent.' });
    } else {
      return res.status(500).json({ error: 'Failed to send reset email via Brevo' });
    }
  } catch (err) {
    console.error('Error generating reset link in Supabase:', err);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

export default router;
