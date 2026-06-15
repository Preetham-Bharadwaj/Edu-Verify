import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Warning: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not fully configured in your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');
