import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'kenaararso4@gmail.com',
        password: 'Password123!'
    });
    console.log('Result:', JSON.stringify({ data: !!data.user, error: error?.message }, null, 2));
}

run();
