import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';

async function test() {
    console.log("Fetching applications...");
    const { data: apps, error } = await supabase.from('applications').select('*');
    if (error) console.error("Error fetching apps:", error);
    else console.log("Apps found:", apps?.length);
    
    if (apps?.length > 0) {
        console.log("First app:", apps[0]);
    }
    
    const { data: profiles, error: pErr } = await supabase.from('student_profiles').select('*');
    if (pErr) console.error("Error profiles:", pErr);
    else console.log("Profiles found:", profiles?.length);

    console.log("Done");
}

test();
