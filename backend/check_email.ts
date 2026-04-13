import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  else {
    const user = data.users.find((u: any) => u.email === 'kenakaye11@gmail.com');
    if (user) {
      console.log('Found user:', user.email, 'User ID:', user.id);
    } else {
      console.log('User not found!');
    }
  }
}
check();
