import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { supabase } from '../config/supabase.js';
import { issueAuthToken, toAuthUser } from '../middleware/auth.js';

dotenv.config();

const { Pool } = pg;

export const DEMO_ACCOUNT_SETS = [
    {
        role: 'Student',
        accounts: [
            {
                label: 'Aditi Rao',
                name: 'Aditi Rao',
                email: 'student1@scholarship.gov.in',
                password: 'Q7!sT9#Lm2@v',
                region: 'Karnataka',
                district: 'Bengaluru Urban',
                profile: {
                    student_id: 'STU-DEMO-001',
                    college_name: 'BMS College of Engineering',
                    grade: 'Year 1',
                },
            },
            {
                label: 'Arjun Shetty',
                name: 'Arjun Shetty',
                email: 'student2@scholarship.gov.in',
                password: 'R4#uN8$Pd6@x',
                region: 'Karnataka',
                district: 'Dakshina Kannada',
                profile: {
                    student_id: 'STU-DEMO-002',
                    college_name: 'National Institute of Technology Karnataka',
                    grade: 'Year 2',
                },
            },
            {
                label: 'Kavya Naik',
                name: 'Kavya Naik',
                email: 'student3@scholarship.gov.in',
                password: 'H2!kQ5%Za7@r',
                region: 'Karnataka',
                district: 'Bengaluru Rural',
                profile: {
                    student_id: 'STU-DEMO-003',
                    college_name: 'RV College of Engineering',
                    grade: 'Year 3',
                },
            },
            {
                label: 'Rohan Kulkarni',
                name: 'Rohan Kulkarni',
                email: 'student4@scholarship.gov.in',
                password: 'T8@nM3!Wx9#c',
                region: 'Karnataka',
                district: 'Mysuru',
                profile: {
                    student_id: 'STU-DEMO-004',
                    college_name: 'JSS Science and Technology University',
                    grade: 'Year 4',
                },
            },
            {
                label: 'Ananya Iyer',
                name: 'Ananya Iyer',
                email: 'student5@scholarship.gov.in',
                password: 'F6$yV1!Js4@p',
                region: 'Karnataka',
                district: 'Udupi',
                profile: {
                    student_id: 'STU-DEMO-005',
                    college_name: 'Manipal Institute of Technology',
                    grade: 'Year 5',
                },
            },
        ],
    },
    {
        role: 'Admin',
        accounts: [
            {
                label: 'Priya Menon',
                name: 'Priya Menon',
                email: 'admin1@scholarship.gov.in',
                password: 'A9!dR2#kL7@u',
                region: 'Karnataka',
                district: 'Bengaluru Urban',
            },
            {
                label: 'Suresh Kumar',
                name: 'Suresh Kumar',
                email: 'admin2@scholarship.gov.in',
                password: 'B3$hT8!qM5#z',
                region: 'Karnataka',
                district: 'Mysuru',
            },
            {
                label: 'Farhan Khan',
                name: 'Farhan Khan',
                email: 'admin3@scholarship.gov.in',
                password: 'C7@fN1!wP6$y',
                region: 'Karnataka',
                district: 'Mangaluru',
            },
        ],
    },
    {
        role: 'Supervisor',
        accounts: [
            {
                label: 'Naveen Kumar',
                name: 'Naveen Kumar',
                email: 'superadmin@scholarship.gov.in',
                password: 'S0!uP9#Xc4@k',
                region: 'Karnataka',
                district: 'Bengaluru Urban',
            },
        ],
    },
];

function createPool() {
    if (!process.env.DATABASE_URL) {
        return null;
    }

    return new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
}

function getDemoAccount(role, label) {
    const normalizedRole = String(role || '').trim().toLowerCase();
    const normalizedLabel = String(label || '').trim().toLowerCase();
    const set = DEMO_ACCOUNT_SETS.find((entry) => entry.role.toLowerCase() === normalizedRole);
    return set?.accounts.find((account) => account.label.toLowerCase() === normalizedLabel) || null;
}

async function ensureStudentProfile(pool, account, userId) {
    const { rowCount } = await pool.query(
        'SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1',
        [userId]
    );

    if (rowCount > 0) {
        await pool.query(
            'UPDATE student_profiles SET student_name = $1, student_id = $2, college_name = $3, grade = $4, district = $5, region = $6 WHERE user_id = $7',
            [
                account.name,
                account.profile.student_id,
                account.profile.college_name,
                account.profile.grade,
                account.district,
                account.region,
                userId,
            ]
        );
        return;
    }

    await pool.query(
        'INSERT INTO student_profiles (id, user_id, student_name, student_id, college_name, grade, district, region) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
            crypto.randomUUID(),
            userId,
            account.name,
            account.profile.student_id,
            account.profile.college_name,
            account.profile.grade,
            account.district,
            account.region,
        ]
    );
}

export async function ensureDemoAccounts() {
    const pool = createPool();
    if (!pool) {
        return { seeded: 0, skipped: true };
    }

    let seeded = 0;

    try {
        for (const accountSet of DEMO_ACCOUNT_SETS) {
            for (const account of accountSet.accounts) {
                const { rows: existingRows } = await pool.query(
                    'SELECT id FROM users WHERE email = $1 LIMIT 1',
                    [account.email]
                );

                let userId = existingRows[0]?.id || null;
                if (!userId) {
                    const passwordHash = await bcrypt.hash(account.password, 10);
                    userId = crypto.randomUUID();
                    await pool.query(
                        accountSet.role === 'Student'
                            ? 'INSERT INTO users (id, name, email, password_hash, role, status, region, district) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)'
                            : 'INSERT INTO users (id, name, email, password_hash, role, status, region, district) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                        [
                            userId,
                            account.name,
                            account.email,
                            passwordHash,
                            accountSet.role,
                            'Active',
                            account.region,
                            account.district,
                        ]
                    );
                    seeded += 1;
                } else {
                    const passwordHash = await bcrypt.hash(account.password, 10);
                    await pool.query(
                        'UPDATE users SET name = $1, password_hash = $2, role = $3, status = $4, region = $5, district = $6 WHERE id = $7',
                        [
                            account.name,
                            passwordHash,
                            accountSet.role,
                            'Active',
                            account.region,
                            account.district,
                            userId,
                        ]
                    );
                }

                if (accountSet.role === 'Student') {
                    await ensureStudentProfile(pool, account, userId);
                }
            }
        }

        return { seeded, skipped: false };
    } finally {
        await pool.end();
    }
}

export async function loginDemoAccount({ role, label }) {
    const account = getDemoAccount(role, label);
    if (!account) {
        return null;
    }

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', account.email)
        .limit(1);

    if (error) throw error;
    if (!users?.length) {
        await ensureDemoAccounts();
        const { data: seededUsers, error: seededError } = await supabase
            .from('users')
            .select('*')
            .eq('email', account.email)
            .limit(1);

        if (seededError) throw seededError;
        if (!seededUsers?.length) return null;
        return loginDemoAccountFromUser(seededUsers[0], account.password);
    }

    return loginDemoAccountFromUser(users[0], account.password);
}

async function loginDemoAccountFromUser(user, password) {
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        return null;
    }

    let profile = null;
    if (user.role === 'Student') {
        const { data: profiles, error: profileErr } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);

        if (profileErr) throw profileErr;
        if (profiles?.length) profile = profiles[0];
    }

    return {
        token: issueAuthToken(user),
        user: toAuthUser(user),
        profile,
    };
}

