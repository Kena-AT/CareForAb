import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function testMedicationInsert() {
  console.log('Testing medication insert...');
  const { data, error } = await supabase
    .from('medications')
    .insert({
      user_id: 'any-user-id', // This might fail RLS but we want to see the error
      name: 'Test Med',
      dosage: '10mg',
      frequency: 'daily',
      times: ['08:00'],
      is_active: true
    })
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

testMedicationInsert();
