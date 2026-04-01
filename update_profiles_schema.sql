ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English (United States)',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "push": true, 
  "email": false, 
  "medication": true, 
  "clinical_sync": true, 
  "data_permissions": "standard",
  "abnormal_readings": true
}'::jsonb;
