import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { verifyToken, issueAuthToken, toAuthUser } from '../middleware/auth.js';
import { ensureDemoAccounts, loginDemoAccount } from '../utils/demoAccounts.js';

const router = express.Router();

// Student Signup
router.post('/student/signup', async (req, res) => {
    const { fullName, studentId, collegeName, grade, email, mobileNumber, password, district, region } = req.body;

    if (!fullName || !studentId || !collegeName || !grade || !email || !password || !district || !region) {
        return res.status(400).json({ message: "All fields except mobile number are required." });
    }

    try {
        // Check if email already exists
        const { data: userCheck, error: emailError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email);

        if (emailError) throw emailError;
        if (userCheck && userCheck.length > 0) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        // Check if studentId already exists
        const { data: profileCheck, error: profileError } = await supabase
            .from('student_profiles')
            .select('id')
            .eq('student_id', studentId);

        if (profileError) throw profileError;
        if (profileCheck && profileCheck.length > 0) {
            return res.status(400).json({ message: "Student ID is already registered." });
        }

        const userId = crypto.randomUUID();
        const profileId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert into Users table
        const { error: insertUserError } = await supabase
            .from('users')
            .insert([{
                id: userId,
                name: fullName,
                email: email,
                password_hash: passwordHash,
                role: 'Student',
                status: 'Active',
                region: region,
                district: district
            }]);

        if (insertUserError) throw insertUserError;

        // Insert into Student Profiles table
        const { error: insertProfileError } = await supabase
            .from('student_profiles')
            .insert([{
                id: profileId,
                user_id: userId,
                student_name: fullName,
                student_id: studentId,
                college_name: collegeName,
                grade: grade,
                district: district,
                region: region
            }]);

        if (insertProfileError) throw insertProfileError;

        // Send a notification
        const { error: notifyError } = await supabase
            .from('notifications')
            .insert([{
                id: crypto.randomUUID(),
                user_id: userId,
                title: "Welcome to EduVerify",
                message: `Hello ${fullName}, your student account has been created successfully.`
            }]);

        if (notifyError) throw notifyError;

        res.status(201).json({ message: "Student registered successfully. You can now log in." });
    } catch (error) {
        console.error("Student Signup Error:", error);
        res.status(500).json({ message: "Internal server error during registration." });
    }
});

// Unified Login (No role dropdown required, role is read from DB)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error) throw error;
        if (!users || users.length === 0) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = users[0];

        // Check status
        if (user.status === 'Suspended') {
            return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
        } else if (user.status === 'Pending') {
            return res.status(403).json({ message: "Your account is pending supervisor approval." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Fetch student profile details if user is Student
        let profile = null;
        if (user.role === 'Student') {
            const { data: profiles, error: profileErr } = await supabase
                .from('student_profiles')
                .select('*')
                .eq('user_id', user.id);
            
            if (profileErr) throw profileErr;
            if (profiles && profiles.length > 0) {
                profile = profiles[0];
            }
        }

        const token = issueAuthToken(user);

        res.json({
            token,
            user: toAuthUser(user),
            profile
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error during login." });
    }
});

// Refresh session — validates current token and issues a new one
router.post('/demo-login', async (req, res) => {
    const { role, label } = req.body;

    if (!role || !label) {
        return res.status(400).json({ message: 'Role and account label are required.' });
    }

    try {
        const session = await loginDemoAccount({ role, label });

        if (!session) {
            await ensureDemoAccounts();
            const retrySession = await loginDemoAccount({ role, label });
            if (!retrySession) {
                return res.status(404).json({ message: 'Demo account not found.' });
            }

            return res.json(retrySession);
        }

        res.json(session);
    } catch (error) {
        console.error('Demo login Error:', error);
        res.status(500).json({ message: 'Internal server error during demo login.' });
    }
});

router.get('/me', verifyToken, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .limit(1);

        if (error) throw error;
        if (!users?.length) {
            return res.status(401).json({ message: 'User not found.' });
        }

        const user = users[0];

        if (user.status === 'Suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
        }
        if (user.status === 'Pending') {
            return res.status(403).json({ message: 'Your account is pending approval.' });
        }

        let profile = null;
        if (user.role === 'Student') {
            const { data: profiles, error: profileErr } = await supabase
                .from('student_profiles')
                .select('*')
                .eq('user_id', user.id);
            if (profileErr) throw profileErr;
            if (profiles?.length) profile = profiles[0];
        }

        res.json({
            token: issueAuthToken(user),
            user: toAuthUser(user),
            profile
        });
    } catch (error) {
        console.error('Session refresh error:', error);
        res.status(500).json({ message: 'Failed to refresh session.' });
    }
});

// Admin Access Request
router.post('/admin/request-access', async (req, res) => {
    const { employeeName, employeeId, designation, email, mobile, region, district } = req.body;

    if (!employeeName || !employeeId || !designation || !email || !mobile || !region || !district) {
        return res.status(400).json({ message: "All form fields are required." });
    }

    try {
        // Check if email already exists in users or admin_requests
        const { data: userCheck, error: userErr } = await supabase
            .from('users')
            .select('id')
            .eq('email', email);

        if (userErr) throw userErr;
        
        const { data: reqCheck, error: reqErr } = await supabase
            .from('admin_requests')
            .select('id')
            .eq('email', email)
            .eq('status', 'Pending');
            
        if (reqErr) throw reqErr;

        if (userCheck && userCheck.length > 0) {
            return res.status(400).json({ message: "Email is already registered as an active account." });
        }
        if (reqCheck && reqCheck.length > 0) {
            return res.status(400).json({ message: "An admin access request is already pending for this email." });
        }

        const requestId = crypto.randomUUID();
        const { error: insertErr } = await supabase
            .from('admin_requests')
            .insert([{
                id: requestId,
                employee_name: employeeName,
                employee_id: employeeId,
                designation: designation,
                email: email,
                mobile: mobile,
                region: region,
                district: district,
                status: 'Pending'
            }]);

        if (insertErr) throw insertErr;

        res.status(201).json({ message: "Access request submitted successfully. It will be reviewed by the Supervisor." });
    } catch (error) {
        console.error("Admin Request Error:", error);
        res.status(500).json({ message: "Internal server error during access request submission." });
    }
});

export default router;
