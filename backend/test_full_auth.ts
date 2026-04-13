import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    const email = 'agent_test_full_flow@gmail.com';
    const password = 'Password54321!';
    
    console.log('1. Ensuring account exists (admin create/update)...');
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) { console.error('List Users Error:', usersError.message); return; }

    const existing = usersData.users.find((u) => u.email === email);
    if (existing) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Agent Test' }
        });
        if (updateError) { console.error('Update User Error:', updateError.message); return; }
        console.log('Existing user updated:', existing.id);
    } else {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Agent Test' }
        });
        if (createError) { console.error('Create User Error:', createError.message); return; }
        console.log('User created:', created.user?.id);
    }

    console.log('2. Logging in...');
    const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
        email, password
    });
    if (signErr) { console.error('Login Error:', signErr.message); return; }
    console.log('Logged in successfully. Session acquired:', !!signData.session);
}

run();
