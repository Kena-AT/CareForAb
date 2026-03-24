import { cleanEnv, str, port, url } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 3001 }),
  VITE_SUPABASE_URL: url(),
  SUPABASE_SERVICE_ROLE_KEY: str(),
  BREVO_API_KEY: str(),
  BREVO_SENDER_EMAIL: str({ default: 'kenakaye11@gmail.com' }),
  APP_NAME: str({ default: 'CareforAb' }),
});
