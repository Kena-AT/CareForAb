import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
import { emailService } from './src/services/emailService';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const email = 'kenaararso4@gmail.com';
    const redirectTo = 'http://localhost:3000/auth?mode=reset-password';

    console.log('1. Fetching users...');
    const { data: userList, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    if (fetchError) { console.error('Fetch Error:', fetchError); return; }
    
    const user = userList.users.find((u: any) => u.email === email);
    if (!user) { console.log('User not found in user list'); return; }
    
    console.log('2. Generating link...');
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: { redirectTo }
    });
    
    if (linkError) { console.error('Link Error:', linkError); return; }
    console.log('Link generated:', linkData.properties.action_link);
    
    console.log('3. Sending email via Brevo...');
    const fullName = user.user_metadata?.full_name || 'Valued User';
    const result = await emailService.sendPasswordResetEmail(email, linkData.properties.action_link, fullName);
    console.log('Email send result:', result);
}

run();
