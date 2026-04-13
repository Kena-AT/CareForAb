import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const email = 'kenaararso4@gmail.com';
    const newPassword = 'Password123!';
    
    console.log('1. Finding user...');
    const { data: userList, error: fetchErr } = await supabaseAdmin.auth.admin.listUsers();
    if (fetchErr) { console.error('Fetch Error:', fetchErr.message); return; }
    
    const user = userList.users.find(u => u.email === email);
    if (!user) { console.log('User not found.'); return; }
    
    console.log('2. Resetting password for:', email);
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        email_confirm: true
    });
    
    if (updateErr) { console.error('Update Error:', updateErr.message); return; }
    console.log('Password successfully reset to:', newPassword);
}

run();
