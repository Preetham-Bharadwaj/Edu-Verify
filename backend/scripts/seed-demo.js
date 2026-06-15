/**
 * Demo Seed Script
 * Ensures the standard demo Student, Admin, and Supervisor accounts exist.
 * Run once with: node scripts/seed-demo.js
 */

import dotenv from 'dotenv';
import { ensureDemoAccounts } from '../utils/demoAccounts.js';

dotenv.config();

async function seedDemoData() {
    console.log('\n==================================================');
    console.log('  DEMO ACCOUNT SEEDER');
    console.log('==================================================\n');

    const result = await ensureDemoAccounts();
    if (result?.skipped) {
        console.log('DATABASE_URL is not configured. Skipping seed.');
        return;
    }

    console.log(`Demo accounts verified. Seeded ${result.seeded || 0} new account(s).`);
    console.log('==================================================\n');
}

seedDemoData().catch((err) => {
    console.error('Seeder failed:', err.message);
    process.exit(1);
});
