import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { getApplicationDocuments } from '../utils/applicationDocuments.js';

const router = express.Router();

// Fetch supervisor dashboard metrics
router.get('/dashboard-metrics', verifyToken, requireRole('Supervisor'), async (req, res) => {
    try {
        const { data: applications, error: appErr } = await supabase.from('applications').select('status, student_id');
        if (appErr) throw appErr;

        let total = 0, approved = 0, rejected = 0, hold = 0, pending = 0;
        const statusBreakdown = {};

        (applications || []).forEach(app => {
            total++;
            if (app.status === 'Approved') approved++;
            else if (app.status === 'Rejected') rejected++;
            else if (app.status === 'Hold') hold++;
            else if (app.status === 'In Progress') pending++;

            statusBreakdown[app.status] = (statusBreakdown[app.status] || 0) + 1;
        });

        // Region stats
        const studentIds = (applications || []).map(a => a.student_id);
        const { data: profiles, error: profErr } = await supabase
            .from('student_profiles')
            .select('user_id, region')
            .in('user_id', studentIds);
        if (profErr) throw profErr;

        const regionCounts = {};
        (applications || []).forEach(app => {
            const prof = (profiles || []).find(p => p.user_id === app.student_id);
            if (prof && prof.region) {
                regionCounts[prof.region] = (regionCounts[prof.region] || 0) + 1;
            }
        });

        const regionStatsArr = Object.keys(regionCounts).map(region => ({
            region, count: regionCounts[region]
        }));

        const statusBreakdownArr = Object.keys(statusBreakdown).map(status => ({
            status, count: statusBreakdown[status]
        }));

        res.json({
            metrics: { total, approved, rejected, hold, pending },
            regionStats: regionStatsArr,
            statusBreakdown: statusBreakdownArr
        });
    } catch (error) {
        console.error("Fetch Metrics Error:", error);
        res.status(500).json({ message: "Internal server error fetching dashboard metrics." });
    }
});

// Admin Management: List Admins
router.get('/admins', verifyToken, requireRole('Supervisor'), async (req, res) => {
    try {
        const { data: admins, error } = await supabase
            .from('users')
            .select('id, name, email, region, district, status, created_at')
            .eq('role', 'Admin')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(admins || []);
    } catch (error) {
        console.error("List Admins Error:", error);
        res.status(500).json({ message: "Internal server error listing admins." });
    }
});

// Admin Management: Create Admin (with temporary credentials)
router.post('/admins', verifyToken, requireRole('Supervisor'), async (req, res) => {
    const { name, email, region, district } = req.body;

    if (!name || !email || !region || !district) {
        return res.status(400).json({ message: "All admin fields are required." });
    }

    try {
        const { data: userCheck, error: chkErr } = await supabase.from('users').select('id').eq('email', email);
        if (chkErr) throw chkErr;
        if (userCheck && userCheck.length > 0) return res.status(400).json({ message: "Email is already in use." });

        const adminId = crypto.randomUUID();
        const tempPassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
        const hash = await bcrypt.hash(tempPassword, 10);

        const { error: insErr } = await supabase.from('users').insert([{
            id: adminId, name, email, password_hash: hash, role: 'Admin', region, district, status: 'Active'
        }]);
        if (insErr) throw insErr;

        await supabase.from('audit_logs').insert([{
            id: crypto.randomUUID(), actor_id: req.user.id, actor_role: 'Supervisor',
            action: 'Admin Created', remarks: `Admin account created for ${name} (${email}) for region: ${region}, district: ${district}`
        }]);

        res.status(201).json({
            message: "Admin created successfully.",
            credentials: { email, password: tempPassword }
        });
    } catch (error) {
        console.error("Create Admin Error:", error);
        res.status(500).json({ message: "Internal server error creating admin." });
    }
});

// Admin Management: Edit Admin
router.put('/admins/:id', verifyToken, requireRole('Supervisor'), async (req, res) => {
    const adminId = req.params.id;
    const { name, region, district } = req.body;

    if (!name || !region || !district) {
        return res.status(400).json({ message: "Name, region, and district are required." });
    }

    try {
        const { error } = await supabase.from('users').update({ name, region, district }).eq('id', adminId).eq('role', 'Admin');
        if (error) throw error;
        res.json({ message: "Admin details updated successfully." });
    } catch (error) {
        console.error("Edit Admin Error:", error);
        res.status(500).json({ message: "Internal server error editing admin." });
    }
});

// Admin Management: Suspend Admin
router.put('/admins/:id/suspend', verifyToken, requireRole('Supervisor'), async (req, res) => {
    const adminId = req.params.id;
    try {
        const { error } = await supabase.from('users').update({ status: 'Suspended' }).eq('id', adminId).eq('role', 'Admin');
        if (error) throw error;
        
        await supabase.from('audit_logs').insert([{
            id: crypto.randomUUID(), actor_id: req.user.id, actor_role: 'Supervisor',
            action: 'Admin Suspended', remarks: `Admin account suspended (ID: ${adminId})`
        }]);

        res.json({ message: "Admin suspended successfully." });
    } catch (error) {
        console.error("Suspend Admin Error:", error);
        res.status(500).json({ message: "Internal server error suspending admin." });
    }
});

// Admin Management: Activate Admin
router.put('/admins/:id/activate', verifyToken, requireRole('Supervisor'), async (req, res) => {
    const adminId = req.params.id;
    try {
        const { error } = await supabase.from('users').update({ status: 'Active' }).eq('id', adminId).eq('role', 'Admin');
        if (error) throw error;

        await supabase.from('audit_logs').insert([{
            id: crypto.randomUUID(), actor_id: req.user.id, actor_role: 'Supervisor',
            action: 'Admin Activated', remarks: `Admin account activated (ID: ${adminId})`
        }]);

        res.json({ message: "Admin activated successfully." });
    } catch (error) {
        console.error("Activate Admin Error:", error);
        res.status(500).json({ message: "Internal server error activating admin." });
    }
});

// Admin Management: Delete Admin
router.delete('/admins/:id', verifyToken, requireRole('Supervisor'), async (req, res) => {
    const adminId = req.params.id;
    try {
        const { error } = await supabase.from('users').delete().eq('id', adminId).eq('role', 'Admin');
        if (error) throw error;
        res.json({ message: "Admin deleted successfully." });
    } catch (error) {
        console.error("Delete Admin Error:", error);
        res.status(500).json({ message: "Internal server error deleting admin." });
    }
});

// Admin Request Management: List Access Requests
router.get('/admin-requests', verifyToken, requireRole('Supervisor'), async (req, res) => {
    try {
        const { data: requests, error } = await supabase.from('admin_requests').select('*').order('id', { ascending: false });
        if (error) throw error;
        res.json(requests || []);
    } catch (error) {
        console.error("Fetch Admin Requests Error:", error);
        res.status(500).json({ message: "Internal server error fetching access requests." });
    }
});

// Admin Request Management: Action (Approve / Reject)
router.post('/admin-requests/:id/action', verifyToken, requireRole('Supervisor'), async (req, res) => {
    const requestId = req.params.id;
    const { action } = req.body; 

    if (!action || !['Approve', 'Reject'].includes(action)) {
        return res.status(400).json({ message: "Invalid action." });
    }

    try {
        const { data: reqs, error: rErr } = await supabase.from('admin_requests').select('*').eq('id', requestId);
        if (rErr) throw rErr;
        if (!reqs || reqs.length === 0) return res.status(404).json({ message: "Access request not found." });
        const reqDetail = reqs[0];

        if (reqDetail.status !== 'Pending') return res.status(400).json({ message: "Request has already been processed." });

        if (action === 'Reject') {
            await supabase.from('admin_requests').update({ status: 'Rejected' }).eq('id', requestId);
            await supabase.from('audit_logs').insert([{
                id: crypto.randomUUID(), actor_id: req.user.id, actor_role: 'Supervisor',
                action: 'Admin Request Rejected', remarks: `Admin access request rejected for email: ${reqDetail.email}`
            }]);
            return res.json({ message: "Access request rejected." });
        }

        const tempPassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
        const hash = await bcrypt.hash(tempPassword, 10);
        const adminId = crypto.randomUUID();

        await supabase.from('users').insert([{
            id: adminId, name: reqDetail.employee_name, email: reqDetail.email, password_hash: hash, 
            role: 'Admin', region: reqDetail.region, district: reqDetail.district, status: 'Active'
        }]);

        await supabase.from('admin_requests').update({ status: 'Approved' }).eq('id', requestId);

        await supabase.from('audit_logs').insert([{
            id: crypto.randomUUID(), actor_id: req.user.id, actor_role: 'Supervisor',
            action: 'Admin Request Approved', remarks: `Admin request approved. Created account for ${reqDetail.employee_name} (${reqDetail.email})`
        }]);

        res.json({
            message: "Access request approved. Admin account created successfully.",
            credentials: { email: reqDetail.email, password: tempPassword }
        });
    } catch (error) {
        console.error("Action Admin Request Error:", error);
        res.status(500).json({ message: "Internal server error processing access request." });
    }
});

// Application Monitoring
router.get('/applications', verifyToken, requireRole('Supervisor'), async (req, res) => {
    const { region, district, status, search } = req.query;

    try {
        let q = supabase.from('applications').select('*').order('created_at', { ascending: false });
        if (status) q = q.eq('status', status);

        const { data: apps, error: appErr } = await q;
        if (appErr) throw appErr;

        if (!apps || apps.length === 0) return res.json([]);

        const studentIds = apps.map(a => a.student_id);
        const { data: profiles, error: profErr } = await supabase.from('student_profiles').select('*').in('user_id', studentIds);
        if (profErr) throw profErr;

        const { data: users, error: userErr } = await supabase.from('users').select('id, email').in('id', studentIds);
        if (userErr) throw userErr;

        let result = apps.map(a => {
            const profile = (profiles || []).find(p => p.user_id === a.student_id) || {};
            const user = (users || []).find(u => u.id === a.student_id) || {};
            
            return {
                ...a,
                student_name: profile.student_name,
                student_roll_number: profile.student_id,
                college_name: profile.college_name,
                grade: profile.grade,
                district: profile.district,
                region: profile.region,
                student_email: user.email
            };
        });

        if (region) result = result.filter(r => r.region === region);
        if (district) result = result.filter(r => r.district === district);
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(r => 
                (r.student_name && r.student_name.toLowerCase().includes(lowerSearch)) ||
                (r.student_roll_number && r.student_roll_number.toLowerCase().includes(lowerSearch)) ||
                (r.application_number && r.application_number.toLowerCase().includes(lowerSearch))
            );
        }

        result = await Promise.all(result.map(async (app) => {
            const documents = await getApplicationDocuments(app.id, { includeContent: false });
            return {
                ...app,
                document_count: documents.length,
                uploaded_documents: documents.map((doc) => ({
                    id: doc.id,
                    file_name: doc.file_name,
                    category: doc.category,
                    file_size: doc.file_size,
                })),
            };
        }));

        res.json(result);
    } catch (error) {
        console.error("Supervisor Applications Query Error:", error);
        res.status(500).json({ message: "Internal server error fetching applications." });
    }
});

router.get('/applications/:id', verifyToken, requireRole('Supervisor'), async (req, res) => {
    try {
        const { data: apps, error: appErr } = await supabase
            .from('applications')
            .select('*')
            .eq('id', req.params.id)
            .limit(1);
        if (appErr) throw appErr;
        if (!apps?.length) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        const app = apps[0];
        const { data: profiles } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('user_id', app.student_id)
            .limit(1);
        const profile = profiles?.[0] || {};
        const documents = await getApplicationDocuments(app.id);

        res.json({
            application: {
                ...app,
                student_name: profile.student_name,
                student_roll_number: profile.student_id,
                college_name: profile.college_name,
                grade: profile.grade,
                district: profile.district,
                region: profile.region,
            },
            documents,
        });
    } catch (error) {
        console.error('Supervisor Application Detail Error:', error);
        res.status(500).json({ message: 'Internal server error fetching application details.' });
    }
});

// Audit Log Fetching
router.get('/audit-logs', verifyToken, requireRole('Supervisor'), async (req, res) => {
    try {
        const { data: logs, error: logErr } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (logErr) throw logErr;

        const actorIds = (logs || []).map(l => l.actor_id).filter(id => id != null);
        const { data: users, error: userErr } = await supabase.from('users').select('id, name, email').in('id', actorIds);
        if (userErr) throw userErr;

        const result = (logs || []).map(log => {
            const user = (users || []).find(u => u.id === log.actor_id) || {};
            return {
                ...log,
                actor_name: user.name,
                actor_email: user.email
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Fetch Audit Logs Error:", error);
        res.status(500).json({ message: "Internal server error fetching audit logs." });
    }
});

export default router;
