import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';

async function fixPriya() {
    const { error } = await supabase
        .from('users')
        .update({ region: null, district: null })
        .eq('email', 'admin1@scholarship.gov.in');

    if (error) {
        console.error("Failed to update Priya:", error);
    } else {
        console.log("Successfully removed region/district restrictions from Priya Menon. She is now a global admin.");
    }
}

fixPriya();
