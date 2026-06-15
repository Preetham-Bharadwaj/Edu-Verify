import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';

async function test() {
    const { data: apps } = await supabase.from('applications').select('*');
    const { data: profiles } = await supabase.from('student_profiles').select('*');
    const { data: users } = await supabase.from('users').select('*');

    const admin = users.find(u => u.role === 'Admin');
    console.log("Admin:", admin);

    let result = apps.map((app) => {
        const profile = (profiles || []).find((item) => item.user_id === app.student_id) || {};
        return {
            id: app.id,
            region: profile.region,
            district: profile.district,
            assigned: app.assigned_admin
        };
    });
    
    console.log("Apps before filter:", result);

    const adminRegion = admin.region;
    const adminDistrict = admin.district;
    const adminId = admin.id;

    if (adminRegion) {
        result = result.filter((row) => row.region === adminRegion);
    }
    if (adminDistrict) {
        result = result.filter((row) =>
            row.district === adminDistrict ||
            row.assigned === adminId ||
            (row.assigned == null && row.region === adminRegion)
        );
    }
    
    console.log("Apps after filter:", result);
}

test();
