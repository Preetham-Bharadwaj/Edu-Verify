import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';

async function listAdmins() {
    const { data: users } = await supabase.from('users').select('id, name, email, role, region, district').eq('role', 'Admin');
    console.log("Admins:", users);
    
    const { data: apps } = await supabase.from('applications').select('id');
    console.log("Total apps:", apps?.length);
}

listAdmins();
