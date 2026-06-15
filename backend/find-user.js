import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';

async function listUsers() {
    const { data: users } = await supabase.from('users').select('id, name, email, role, region, district');
    console.log("Users:", users.filter(u => u.name?.toLowerCase().includes('preeth') || u.role === 'Admin'));
}

listUsers();
