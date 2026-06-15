import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log('Seeding Demo Accounts...');

  const supHash = await bcrypt.hash('Supervisor@123', 10);
  const admHash = await bcrypt.hash('Admin@123', 10);
  const stuHash = await bcrypt.hash('Student@123', 10);

  const supId = '00000000-0000-0000-0000-000000000001';
  const admId = '00000000-0000-0000-0000-000000000002';
  const stuId = '00000000-0000-0000-0000-000000000003';

  const { error: supErr } = await supabase.from('users').upsert([
    { id: supId, name: 'System Supervisor', email: 'supervisor@scholarship.gov.in', password_hash: supHash, role: 'Supervisor', status: 'Active' }
  ], { onConflict: 'email' });
  if (supErr) console.error('SupErr:', supErr);

  const { error: admErr } = await supabase.from('users').upsert([
    { id: admId, name: 'Demo Admin Officer', email: 'admin@scholarship.gov.in', password_hash: admHash, role: 'Admin', region: 'South', district: 'Chennai', status: 'Active' }
  ], { onConflict: 'email' });
  if (admErr) console.error('AdmErr:', admErr);

  const { error: stuErr } = await supabase.from('users').upsert([
    { id: stuId, name: 'Demo Student', email: 'student@scholarship.gov.in', password_hash: stuHash, role: 'Student', region: 'South', district: 'Chennai', status: 'Active' }
  ], { onConflict: 'email' });
  if (stuErr) console.error('StuErr:', stuErr);

  const { error: profErr } = await supabase.from('student_profiles').upsert([
    { id: stuId, user_id: stuId, student_name: 'Demo Student', student_id: 'STU-2026-0001', college_name: 'National Institute of Technology', grade: 'Year 1', district: 'Chennai', region: 'South' }
  ], { onConflict: 'user_id' });
  if (profErr) console.error('ProfErr:', profErr);

  console.log('Accounts seeded successfully!');
}

seed();
