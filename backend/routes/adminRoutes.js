import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { getApplicationDocuments } from '../utils/applicationDocuments.js';
import { getProfileDetailsFallback } from '../services/profileDetailsStorage.js';
import { SCHOLARSHIP_INCOME_THRESHOLD } from '../constants/eligibility.js';

const router = express.Router();

const RELEVANT_DECISION_ACTIONS = new Set([
    'Application Approved',
    'Application Rejected',
    'Application Hold',
    'Manual Override'
]);

function normalizeDecisionLabel(action, status) {
    if (action === 'Application Approved') return 'Approved';
    if (action === 'Application Rejected') return 'Rejected';
    if (action === 'Application Hold') return 'Hold';
    if (action === 'Manual Override') return status || 'Manual Override';
    return status || 'Pending Review';
}

function getVerificationCheckLabel(isPassed) {
    return isPassed ? 'PASSED' : 'FAILED';
}

function isMissingTableError(error) {
    return error?.code === 'PGRST205';
}

async function queryOptionalRow(queryPromise) {
    const { data, error } = await queryPromise;
    if (error) {
        if (isMissingTableError(error) || error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }
    return data?.[0] || null;
}

async function queryOptionalRows(queryPromise) {
    const { data, error } = await queryPromise;
    if (error) {
        if (isMissingTableError(error)) {
            return [];
        }
        throw error;
    }
    return data || [];
}

function adminCanAccessApplication(app, profile, adminRegion, adminDistrict, adminId) {
    if (adminRegion && profile.region && profile.region !== adminRegion) {
        return false;
    }
    if (!adminDistrict) {
        return true;
    }
    if (profile.district === adminDistrict) {
        return true;
    }
    if (app.assigned_admin === adminId) {
        return true;
    }
    if (app.assigned_admin == null && profile.region === adminRegion) {
        return true;
    }
    return false;
}

async function fetchAdminApplications(adminRegion, adminDistrict, adminId) {
    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
    const { data: apps, error: appErr } = await query;
    if (appErr) throw appErr;

    if (!apps || apps.length === 0) {
        return [];
    }

    const studentIds = apps.map((app) => app.student_id);
    const [profilesRes, usersRes] = await Promise.all([
        supabase.from('student_profiles').select('*').in('user_id', studentIds),
        supabase.from('users').select('id, email').in('id', studentIds)
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (usersRes.error) throw usersRes.error;

    let result = apps.map((app) => {
        const profile = (profilesRes.data || []).find((item) => item.user_id === app.student_id) || {};
        const user = (usersRes.data || []).find((item) => item.id === app.student_id) || {};

        return {
            ...app,
            student_name: profile.student_name,
            student_roll_number: profile.student_id,
            college_name: profile.college_name,
            grade: profile.grade,
            district: profile.district,
            region: profile.region,
            student_email: user.email
        };
    });

    if (adminRegion) {
        result = result.filter((row) => row.region === adminRegion);
    }
    if (adminDistrict) {
        result = result.filter((row) =>
            row.district === adminDistrict ||
            row.assigned_admin === adminId ||
            (row.assigned_admin == null && row.region === adminRegion)
        );
    }

    return result;
}

async function fetchAdminProfile(adminId) {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, region, district, status, role')
        .eq('id', adminId)
        .limit(1);

    if (error) throw error;
    return data?.[0] || null;
}

async function fetchVerificationBundle(app, adminRegion, adminDistrict, adminId) {
    const [profile, user, detail, auditLogs, fatherTax, motherTax, detailsExt] = await Promise.all([
        queryOptionalRow(supabase.from('student_profiles').select('*').eq('user_id', app.student_id).limit(1)),
        queryOptionalRow(supabase.from('users').select('email').eq('id', app.student_id).limit(1)),
        queryOptionalRow(supabase.from('application_details').select('*').eq('application_id', app.id).limit(1)),
        queryOptionalRows(
            supabase.from('audit_logs').select('*').eq('application_id', app.id).order('created_at', { ascending: true })
        ),
        queryOptionalRow(
            supabase.from('tax_records').select('annual_income, tax_paid').eq('aadhaar_number', app.father_aadhaar).limit(1)
        ),
        queryOptionalRow(
            supabase.from('tax_records').select('annual_income, tax_paid').eq('aadhaar_number', app.mother_aadhaar).limit(1)
        ),
        queryOptionalRow(
            supabase.from('student_profile_details').select('*').eq('user_id', app.student_id).limit(1)
        ).then(async (row) => row || getProfileDetailsFallback(app.student_id)),
    ]);

    const documents = await getApplicationDocuments(app.id);

    const profileData = profile || {};

    if (!adminCanAccessApplication(app, profileData, adminRegion, adminDistrict, adminId)) {
        return null;
    }

    const fatherDeclaredIncome = app.father_annual_income != null
        ? Number(app.father_annual_income)
        : (detail?.father_annual_income != null
            ? Number(detail.father_annual_income)
            : (detailsExt?.father_annual_income != null
                ? Number(detailsExt.father_annual_income)
                : null));
    const motherDeclaredIncome = app.mother_annual_income != null
        ? Number(app.mother_annual_income)
        : (detail?.mother_annual_income != null
            ? Number(detail.mother_annual_income)
            : (detailsExt?.mother_annual_income != null
                ? Number(detailsExt.mother_annual_income)
                : null));
    const combinedFamilyIncome = (fatherDeclaredIncome ?? 0) + (motherDeclaredIncome ?? 0);
    const incomeEligibilityPassed = combinedFamilyIncome <= SCHOLARSHIP_INCOME_THRESHOLD;
    const incomeEligibilityStatus = incomeEligibilityPassed
        ? 'Income Eligibility Passed'
        : 'Income Eligibility Failed';

    const fatherIncome = fatherTax?.annual_income != null ? Number(fatherTax.annual_income) : null;
    const motherIncome = motherTax?.annual_income != null ? Number(motherTax.annual_income) : null;
    const verifiedHouseholdIncome = (fatherIncome != null || motherIncome != null)
        ? (fatherIncome || 0) + (motherIncome || 0)
        : null;
    const incomeCheckPassed = incomeEligibilityPassed
        && (fatherIncome || 0) <= SCHOLARSHIP_INCOME_THRESHOLD
        && (motherIncome || 0) <= SCHOLARSHIP_INCOME_THRESHOLD
        && (fatherIncome || 0) + (motherIncome || 0) <= SCHOLARSHIP_INCOME_THRESHOLD
        && !fatherTax?.tax_paid
        && !motherTax?.tax_paid;

    let feeCheckPassed = true;
    let feeRecord = null;
    const schoolName = detail?.school_name || profileData.college_name;
    const classGrade = detail?.class_grade || profileData.grade;
    if (schoolName && classGrade) {
        feeRecord = await queryOptionalRow(
            supabase
                .from('institution_fees')
                .select('total_fee, fee_paid, payment_status')
                .eq('school_name', schoolName)
                .eq('grade', classGrade)
                .limit(1)
        );
        if (feeRecord) {
            feeCheckPassed = Number(feeRecord.fee_paid || 0) < Number(feeRecord.total_fee || 0);
        }
    }

    const autoEligibilityResult = incomeCheckPassed && feeCheckPassed ? 'ELIGIBLE' : 'NOT ELIGIBLE';

    const academicYear = detail?.academic_year || detailsExt?.academic_year || null;

    return {
        application: {
            ...app,
            student_name: profileData.student_name || app.student_name,
            student_roll_number: profileData.student_id || app.student_roll_number,
            college_name: profileData.college_name || app.college_name,
            grade: profileData.grade || app.grade,
            district: profileData.district || app.district,
            region: profileData.region || app.region,
            student_email: user?.email || app.student_email,
            year_of_study: academicYear,
            details: detail,
            documents,
            auditLogs
        },
        studentDetails: {
            name: detail?.student_name || profileData.student_name || app.student_name || '',
            studentId: detail?.student_identifier || profileData.student_id || app.student_roll_number || '',
            college: detail?.school_name || profileData.college_name || app.college_name || '',
            grade: detail?.class_grade || profileData.grade || app.grade || '',
            region: detail?.region || profileData.region || app.region || '',
            district: detail?.district || profileData.district || app.district || '',
            email: user?.email || app.student_email || '',
            phone: detailsExt?.phone || '',
            dateOfBirth: detailsExt?.date_of_birth || null,
            gender: detailsExt?.gender || null,
            address: detailsExt?.address || '',
            course: detailsExt?.course_grade || profileData.grade || app.grade || '',
            year: academicYear
        },
        fatherDetails: {
            name: detail?.father_name || app.father_name || '',
            aadhaar: detail?.father_aadhaar || app.father_aadhaar || '',
            occupation: detail?.father_occupation || app.father_occupation || detailsExt?.father_occupation || detailsExt?.parent_occupation || '',
            annualIncome: fatherDeclaredIncome,
            verifiedFatherIncome: fatherIncome,
            taxPaid: Boolean(fatherTax?.tax_paid),
        },
        motherDetails: {
            name: detail?.mother_name || app.mother_name || '',
            aadhaar: detail?.mother_aadhaar || app.mother_aadhaar || '',
            occupation: detail?.mother_occupation || app.mother_occupation || detailsExt?.mother_occupation || '',
            annualIncome: motherDeclaredIncome,
            verifiedMotherIncome: motherIncome,
            taxPaid: Boolean(motherTax?.tax_paid),
        },
        parentVerification: {
            combinedFamilyIncome,
            incomeEligibilityStatus,
            incomeThreshold: SCHOLARSHIP_INCOME_THRESHOLD,
            verifiedHouseholdIncome,
        },
        documents,
        autoVerificationResults: {
            incomeTaxCheck: getVerificationCheckLabel(incomeCheckPassed),
            incomeEligibilityStatus,
            schoolFeeCheck: getVerificationCheckLabel(feeCheckPassed),
            finalAutoEligibility: autoEligibilityResult,
            taxSummary: {
                fatherIncome: fatherTax?.annual_income ?? null,
                motherIncome: motherTax?.annual_income ?? null,
                fatherTaxPaid: Boolean(fatherTax?.tax_paid),
                motherTaxPaid: Boolean(motherTax?.tax_paid)
            },
            feeSummary: feeRecord
                ? {
                    totalFee: feeRecord.total_fee,
                    feePaid: feeRecord.fee_paid,
                    paymentStatus: feeRecord.payment_status || null
                }
                : null
        },
        recentAuditLogs: auditLogs.slice(-10)
    };
}

// Get applications in Admin's queue (region/district matched)
router.get('/applications', verifyToken, requireRole('Admin'), async (req, res) => {
    const adminRegion = req.user.region;
    const adminDistrict = req.user.district;
    const adminId = req.user.id;

    try {
        const result = await fetchAdminApplications(adminRegion, adminDistrict, adminId);
        res.json(result);
    } catch (error) {
        console.error("Admin Fetch Applications Error:", error);
        res.status(500).json({ message: "Internal server error fetching queue." });
    }
});

router.get('/dashboard-summary', verifyToken, requireRole('Admin'), async (req, res) => {
    const adminRegion = req.user.region;
    const adminDistrict = req.user.district;
    const adminId = req.user.id;

    try {
        const applications = await fetchAdminApplications(adminRegion, adminDistrict, adminId);
        const summary = applications.reduce((accumulator, app) => {
            accumulator.totalApplications += 1;
            if (app.status === 'Approved') accumulator.approved += 1;
            else if (app.status === 'Rejected') accumulator.rejected += 1;
            else if (app.status === 'Hold') accumulator.onHold += 1;
            else accumulator.pendingReview += 1;
            return accumulator;
        }, {
            totalApplications: 0,
            pendingReview: 0,
            approved: 0,
            rejected: 0,
            onHold: 0
        });

        const applicationMap = new Map(applications.map((app) => [app.id, app]));
        const appIds = applications.map((app) => app.id);

        let recentDecisions = [];
        let recentActivity = [];
        if (appIds.length > 0) {
            const { data: logs, error: logsErr } = await supabase
                .from('audit_logs')
                .select('id, application_id, action, created_at, remarks')
                .in('application_id', appIds)
                .order('created_at', { ascending: false })
                .limit(20);
            if (logsErr) throw logsErr;

            const activityActions = new Set([
                'Application Approved',
                'Application Rejected',
                'Application Hold'
            ]);

            recentDecisions = (logs || [])
                .filter((log) => RELEVANT_DECISION_ACTIONS.has(log.action))
                .map((log) => {
                    const app = applicationMap.get(log.application_id);
                    return {
                        id: log.id,
                        applicationId: app?.application_number || log.application_id,
                        studentName: app?.student_name || 'Unknown',
                        decision: normalizeDecisionLabel(log.action, app?.status),
                        date: log.created_at,
                        remarks: log.remarks || ''
                    };
                })
                .slice(0, 10);

            recentActivity = (logs || [])
                .filter((log) => activityActions.has(log.action))
                .map((log) => {
                    const app = applicationMap.get(log.application_id);
                    return {
                        id: log.id,
                        applicationId: app?.application_number || log.application_id,
                        studentName: app?.student_name || 'Unknown',
                        action: log.action,
                        date: log.created_at
                    };
                })
                .slice(0, 5);
        }

        res.json({
            summary,
            recentDecisions,
            recentActivity
        });
    } catch (error) {
        console.error("Admin Dashboard Summary Error:", error);
        res.status(500).json({ message: "Internal server error fetching dashboard summary." });
    }
});

router.get('/profile', verifyToken, requireRole('Admin'), async (req, res) => {
    try {
        const profile = await fetchAdminProfile(req.user.id);
        if (!profile) {
            return res.status(404).json({ message: 'Admin profile not found.' });
        }

        res.json({
            admin: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                region: profile.region,
                district: profile.district,
                employeeId: profile.id,
                phone: null,
                role: profile.role,
                status: profile.status
            }
        });
    } catch (error) {
        console.error('Admin Profile Fetch Error:', error);
        res.status(500).json({ message: 'Internal server error fetching profile.' });
    }
});

router.post('/profile/verify-password', verifyToken, requireRole('Admin'), async (req, res) => {
    const { currentPassword } = req.body;
    if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required.' });
    }
    try {
        const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id, password_hash')
            .eq('id', req.user.id)
            .limit(1);
        if (userErr) throw userErr;
        const user = users?.[0];
        if (!user) {
            return res.status(404).json({ message: 'Admin profile not found.' });
        }
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }
        res.json({ valid: true, message: 'Password verified.' });
    } catch (error) {
        console.error('Verify Password Error:', error);
        res.status(500).json({ message: 'Internal server error verifying password.' });
    }
});

router.put('/profile/password', verifyToken, requireRole('Admin'), async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (String(newPassword).length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    try {
        const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id, password_hash')
            .eq('id', req.user.id)
            .limit(1);
        if (userErr) throw userErr;
        const user = users?.[0];
        if (!user) {
            return res.status(404).json({ message: 'Admin profile not found.' });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateErr } = await supabase
            .from('users')
            .update({ password_hash: hashedPassword })
            .eq('id', req.user.id);
        if (updateErr) throw updateErr;

        await supabase.from('audit_logs').insert([{
            id: crypto.randomUUID(),
            actor_id: req.user.id,
            actor_role: 'Admin',
            action: 'Admin Password Updated',
            remarks: 'Admin changed account password from the profile page.'
        }]);

        res.json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Admin Password Update Error:', error);
        res.status(500).json({ message: 'Internal server error updating password.' });
    }
});

// Get detailed application audit logs & mock verification details for Review
router.get('/applications/:id', verifyToken, requireRole('Admin'), async (req, res) => {
    const appId = req.params.id;
    const adminRegion = req.user.region;
    const adminDistrict = req.user.district;
    const adminId = req.user.id;

    try {
        const { data: apps, error: appErr } = await supabase.from('applications').select('*').eq('id', appId).limit(1);
        if (appErr) throw appErr;
        if (!apps || apps.length === 0) return res.status(404).json({ message: "Application not found." });
        const bundle = await fetchVerificationBundle(apps[0], adminRegion, adminDistrict, adminId);
        if (!bundle) {
            return res.status(403).json({ message: "Forbidden. Out of district jurisdiction." });
        }

        res.json(bundle);
    } catch (error) {
        console.error("Review Application Fetch Error:", error);
        res.status(500).json({ message: "Internal server error fetching application details." });
    }
});

router.get('/reports', verifyToken, requireRole('Admin'), async (req, res) => {
    const adminRegion = req.user.region;
    const adminDistrict = req.user.district;
    const adminId = req.user.id;

    try {
        const applications = await fetchAdminApplications(adminRegion, adminDistrict, adminId);

        const stats = applications.reduce((accumulator, app) => {
            accumulator.applicationsReceived += 1;
            if (app.status === 'Approved') accumulator.approved += 1;
            else if (app.status === 'Rejected') accumulator.rejected += 1;
            else if (app.status === 'Hold') accumulator.hold += 1;
            return accumulator;
        }, {
            applicationsReceived: 0,
            approved: 0,
            rejected: 0,
            hold: 0
        });

        const schoolCounts = {};
        const collegeCounts = {};
        const rejectionReasons = {
            incomeExceedsThreshold: 0,
            feeAlreadyPaid: 0,
            invalidDocuments: 0
        };

        applications.forEach((app) => {
            const schoolKey = app.college_name || 'Unknown';
            const collegeKey = app.college_name || 'Unknown';
            schoolCounts[schoolKey] = (schoolCounts[schoolKey] || 0) + 1;
            collegeCounts[collegeKey] = (collegeCounts[collegeKey] || 0) + 1;

            if (app.status === 'Rejected') {
                const reasonText = `${app.rejection_reason || ''} ${app.override_reason || ''}`.toLowerCase();
                if (reasonText.includes('income')) rejectionReasons.incomeExceedsThreshold += 1;
                else if (reasonText.includes('fee')) rejectionReasons.feeAlreadyPaid += 1;
                else if (reasonText.includes('document')) rejectionReasons.invalidDocuments += 1;
            }
        });

        res.json({
            stats,
            schoolWiseApplications: Object.entries(schoolCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((left, right) => right.count - left.count),
            collegeWiseApplications: Object.entries(collegeCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((left, right) => right.count - left.count),
            rejectionReasonAnalysis: rejectionReasons
        });
    } catch (error) {
        console.error('Admin Reports Error:', error);
        res.status(500).json({ message: 'Internal server error fetching reports.' });
    }
});

router.get('/report-history', verifyToken, requireRole('Admin'), async (req, res) => {
    try {
        const { data: logs, error: logsErr } = await supabase
            .from('audit_logs')
            .select('id, action, created_at, remarks, actor_id')
            .ilike('action', '%Report Export%')
            .order('created_at', { ascending: false })
            .limit(20);
        if (logsErr) throw logsErr;

        const actorIds = [...new Set((logs || []).map((log) => log.actor_id).filter(Boolean))];
        let actorsById = {};
        if (actorIds.length > 0) {
            const { data: actors, error: actorErr } = await supabase
                .from('users')
                .select('id, name')
                .in('id', actorIds);
            if (actorErr) throw actorErr;
            actorsById = Object.fromEntries((actors || []).map((actor) => [actor.id, actor.name]));
        }

        const history = (logs || []).map((log) => {
            let meta = {};
            try {
                meta = log.remarks ? JSON.parse(log.remarks) : {};
            } catch {
                meta = {};
            }
            return {
                name: log.action || 'Report Export',
                generatedBy: actorsById[log.actor_id] || 'Admin',
                date: log.created_at,
                key: meta.type || 'applications',
                format: meta.format || 'csv',
            };
        });

        res.json(history);
    } catch (error) {
        console.error('Admin Report History Error:', error);
        res.json([]);
    }
});

// Process application (Approve / Reject / Hold) with Manual Override checking
router.put('/applications/:id/decision', verifyToken, requireRole('Admin'), async (req, res) => {
    const appId = req.params.id;
    const adminId = req.user.id;
    const adminRole = req.user.role;
    const { status, reason, overrideReason, overrideComments } = req.body;

    if (!status || !['Approved', 'Rejected', 'Hold'].includes(status)) {
        return res.status(400).json({ message: "Invalid or missing status." });
    }

    try {
        const { data: apps, error: appErr } = await supabase.from('applications').select('*').eq('id', appId);
        if (appErr) throw appErr;
        if (!apps || apps.length === 0) return res.status(404).json({ message: "Application not found." });
        const app = apps[0];

        // Validation for Rejection Reason / Hold Reason
        if (status === 'Rejected' && !reason) return res.status(400).json({ message: "Rejection reason is mandatory when rejecting an application." });
        if (status === 'Hold' && !reason) return res.status(400).json({ message: "Hold reason is mandatory when placing an application on hold." });

        const rejectReasonVal = status === 'Rejected' ? reason : null;
        const holdReasonVal = status === 'Hold' ? reason : null;
        const finalOverrideReason = overrideReason || null;
        const finalOverrideComments = overrideComments || null;

        // Update application
        const { error: updErr } = await supabase.from('applications').update({
            status: status,
            rejection_reason: rejectReasonVal,
            hold_reason: holdReasonVal,
            override_reason: finalOverrideReason,
            override_comments: finalOverrideComments,
            assigned_admin: adminId
        }).eq('id', appId);

        if (updErr) throw updErr;

        // Audit Logging
        const actionLabel = `Application ${status}`;
        const remarksLabel = reason
            ? `Application updated to ${status}. Remarks: ${reason}`
            : `Application updated to ${status} by Admin.`;

        await supabase.from('audit_logs').insert([{
            id: crypto.randomUUID(),
            actor_id: adminId,
            actor_role: adminRole,
            action: actionLabel,
            application_id: appId,
            remarks: remarksLabel
        }]);

        // Send Student Notification
        await supabase.from('notifications').insert([{
            id: crypto.randomUUID(),
            user_id: app.student_id,
            title: `Scholarship Application status: ${status}`,
            message: `Your scholarship application ${app.application_number} is now ${status}. ${status === 'Rejected' ? 'Reason: ' + reason : status === 'Hold' ? 'Reason: ' + reason : ''}`
        }]);

        res.json({ message: `Application ${status.toLowerCase()} successfully.` });
    } catch (error) {
        console.error("Process Decision Error:", error);
        res.status(500).json({ message: "Internal server error updating decision." });
    }
});

export default router;
