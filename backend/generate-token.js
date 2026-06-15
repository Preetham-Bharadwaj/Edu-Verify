import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';
import { issueAuthToken } from './middleware/auth.js';

async function generateToken() {
    const { data: users } = await supabase.from('users').select('*');
    const admin = users.find(u => u.role === 'Admin');
    console.log("Admin token:", issueAuthToken(admin));
}

generateToken();
