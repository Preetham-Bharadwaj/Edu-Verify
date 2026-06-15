import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { verifyToken, requireRole, issueAuthToken, toAuthUser } from '../middleware/auth.js';
import { getApplicationDocuments, saveApplicationDocuments } from '../utils/applicationDocuments.js';
import { getProfileDetailsFallback, saveProfileDetailsFallback } from '../services/profileDetailsStorage.js';
import { SCHOLARSHIP_INCOME_THRESHOLD } from '../constants/eligibility.js';
import { resolveStoredParentIncome, validateParentIncome } from '../utils/parentIncome.js';

const router = express.Router();

const REGIONS_AND_DISTRICTS = {
    North: ['District A', 'District B', 'District C'],
    South: ['Chennai', 'District D', 'District E'],
    East: ['District F', 'District G', 'District H'],
    West: ['District I', 'District J']
};

const APPLICATION_STATUS_VALUES = ['In Progress', 'Under Verification', 'Hold', 'Approved', 'Rejected'];

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

function mapProfileResponse(user, profile, details) {
    return {
        fullName: profile?.student_name || user?.name || '',
        studentId: profile?.student_id || '',
        email: user?.email || '',
        phone: details?.phone || '',
        studentPhoto: details?.student_photo_data_base64
            ? {
                fileName: details.student_photo_name || 'student-photo',
                mimeType: details.student_photo_mime_type || 'image/png',
                fileDataBase64: details.student_photo_data_base64
            }
            : null,
        personalInformation: {
            dateOfBirth: details?.date_of_birth || '',
            gender: details?.gender || '',
            address: details?.address || '',
            region: profile?.region || '',
            district: profile?.district || ''
        },
        academicInformation: {
            institutionName: profile?.college_name || '',
            institutionType: details?.institution_type || 'School',
            courseGrade: details?.course_grade || profile?.grade || '',
            academicYear: details?.academic_year || ''
        },
        parentInformation: {
            fatherName: details?.father_name || '',
            motherName: details?.mother_name || '',
            fatherAadhaar: details?.father_aadhaar || '',
            motherAadhaar: details?.mother_aadhaar || '',
            fatherOccupation: details?.father_occupation || details?.parent_occupation || '',
            fatherAnnualIncome: details?.father_annual_income ?? details?.declared_annual_income ?? '',
            motherOccupation: details?.mother_occupation || '',
            motherAnnualIncome: details?.mother_annual_income ?? ''
        }
    };
}

async function fetchStudentContext(userId) {
    const [{ data: users, error: userErr }, { data: profiles, error: profileErr }] = await Promise.all([
        supabase.from('users').select('id, name, email, region, district').eq('id', userId).limit(1),
        supabase.from('student_profiles').select('*').eq('user_id', userId).limit(1),
    ]);

    if (userErr) throw userErr;
    if (profileErr) throw profileErr;

    const details = await queryOptionalRow(
        supabase.from('student_profile_details').select('*').eq('user_id', userId).limit(1)
    ) || await getProfileDetailsFallback(userId);

    return {
        user: users?.[0] || null,
        profile: profiles?.[0] || null,
        details,
    };
}

async function upsertByMatch(table, matchField, matchValue, payload) {
    const { data: existing, error: existingErr } = await supabase
        .from(table)
        .select('id')
        .eq(matchField, matchValue)
        .limit(1);

    if (existingErr) {
        if (isMissingTableError(existingErr) || existingErr.code === 'PGRST116') {
            return null;
        }
        throw existingErr;
    }

    if (existing && existing.length > 0) {
        const { error: updateErr } = await supabase
            .from(table)
            .update(payload)
            .eq(matchField, matchValue);
        if (updateErr) throw updateErr;
        return existing[0].id;
    }

    const id = crypto.randomUUID();
    const { error: insertErr } = await supabase
        .from(table)
        .insert([{ id, [matchField]: matchValue, ...payload }]);
    if (insertErr) {
        if (isMissingTableError(insertErr)) {
            return null;
        }
        throw insertErr;
    }
    return id;
}

function buildApplicationTimeline(app, auditLogs = []) {
    const submitted = app.created_at;
    const adminEvent = auditLogs.find((log) =>
        ['Application Approved', 'Application Rejected', 'Application Hold', 'Manual Override'].includes(log.action)
    );

    const verificationStarted = auditLogs.find((log) =>
        log.action === 'Application Submitted' || log.action === 'Verification Started'
    );

    return [
        {
            label: 'Submitted',
            completed: true,
            timestamp: submitted
        },
        {
            label: 'Verification Started',
            completed: app.status !== 'In Progress',
            timestamp: verificationStarted?.created_at || null
        },
        {
            label: 'Admin Review',
            completed: app.status === 'Approved' || app.status === 'Rejected' || app.status === 'Hold',
            timestamp: adminEvent?.created_at || null
        },
        {
            label: 'Final Decision',
            completed: app.status === 'Approved' || app.status === 'Rejected',
            timestamp: adminEvent?.created_at || null
        }
    ];
}

function getApplicationRemarks(app, detail) {
    return (
        app.override_comments ||
        app.override_reason ||
        app.rejection_reason ||
        app.hold_reason ||
        detail?.required_action ||
        detail?.admin_remarks ||
        'Application under review'
    );
}

async function fetchApplicationBundle(userId) {
    const { data: applications, error: appErr } = await supabase
        .from('applications')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false });
    if (appErr) throw appErr;

    if (!applications || applications.length === 0) {
        return [];
    }

    const applicationIds = applications.map((app) => app.id);

    const [details, docs, logs] = await Promise.all([
        queryOptionalRows(supabase.from('application_details').select('*').in('application_id', applicationIds)),
        Promise.all(applicationIds.map((appId) => getApplicationDocuments(appId, { includeContent: false }))).then(
            (groups) => groups.flat()
        ),
        queryOptionalRows(
            supabase.from('audit_logs').select('*').in('application_id', applicationIds).order('created_at', { ascending: true })
        ),
    ]);

    return applications.map((app) => {
        const detail = details?.find((item) => item.application_id === app.id) || null;
        const appDocs = (docs || []).filter((item) => item.application_id === app.id);
        const appLogs = (logs || []).filter((item) => item.application_id === app.id);
        const lastUpdated = appLogs.length > 0 ? appLogs[appLogs.length - 1].created_at : app.created_at;

        return {
            ...app,
            details: detail,
            documents: appDocs,
            last_updated: lastUpdated,
            remarks: getApplicationRemarks(app, detail),
            timeline: buildApplicationTimeline(app, appLogs)
        };
    });
}

router.get('/dashboard', verifyToken, requireRole('Student'), async (req, res) => {
    try {
        const userId = req.user.id;
        const [{ user, profile, details }, applications, notifications] = await Promise.all([
            fetchStudentContext(userId),
            fetchApplicationBundle(userId),
            supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        ]);

        if (!user || !profile) {
            return res.status(404).json({ message: 'Student profile not found.' });
        }

        const notificationRows = notifications.data || [];
        const unreadCount = notificationRows.filter((item) => !item.read_status).length;
        const stats = {
            totalApplications: applications.length,
            pendingApplications: applications.filter((item) => ['In Progress', 'Under Verification', 'Hold'].includes(item.status)).length,
            approvedApplications: applications.filter((item) => item.status === 'Approved').length,
            rejectedApplications: applications.filter((item) => item.status === 'Rejected').length
        };

        const latestApplication = applications[0] || null;
        const progressSummary = latestApplication
            ? {
                applicationId: latestApplication.application_number,
                currentStatus: latestApplication.status,
                steps: latestApplication.timeline
            }
            : {
                applicationId: null,
                currentStatus: null,
                steps: []
            };

        res.json({
            student: mapProfileResponse(user, profile, details),
            stats,
            applications,
            recentActivity: applications.slice(0, 6).map((item) => ({
                applicationId: item.application_number,
                date: item.created_at,
                status: item.status,
                remarks: item.remarks
            })),
            notifications: notificationRows.slice(0, 6),
            unreadNotificationCount: unreadCount,
            progressSummary
        });
    } catch (error) {
        console.error('Fetch Student Dashboard Error:', error);
        res.status(500).json({ message: 'Internal server error fetching dashboard.' });
    }
});

router.post('/apply', verifyToken, requireRole('Student'), async (req, res) => {
    const userId = req.user.id;
    const {
        studentInformation = {},
        parentInformation = {},
        academicInformation = {},
        personalInformation = {},
        documents = [],
        fatherName,
        motherName,
        fatherAadhaar,
        motherAadhaar,
        collegeName,
        grade
    } = req.body;

    const normalizedStudent = {
        studentName: studentInformation.studentName,
        studentId: studentInformation.studentId,
        schoolCollegeName: studentInformation.schoolCollegeName || collegeName,
        classGrade: studentInformation.classGrade || grade,
        region: studentInformation.region,
        district: studentInformation.district,
        institutionType: studentInformation.institutionType || 'School'
    };

    const normalizedPersonal = {
        phone: personalInformation.phone || studentInformation.phone || '',
        dateOfBirth: personalInformation.dateOfBirth || studentInformation.dateOfBirth || '',
        gender: personalInformation.gender || studentInformation.gender || '',
        address: personalInformation.address || studentInformation.address || ''
    };

    const normalizedParent = {
        fatherName: parentInformation.fatherName || fatherName,
        motherName: parentInformation.motherName || motherName,
        fatherAadhaar: parentInformation.fatherAadhaar || fatherAadhaar,
        motherAadhaar: parentInformation.motherAadhaar || motherAadhaar,
        fatherOccupation: parentInformation.fatherOccupation || '',
        fatherAnnualIncome: parentInformation.fatherAnnualIncome ?? '',
        motherOccupation: parentInformation.motherOccupation || '',
        motherAnnualIncome: parentInformation.motherAnnualIncome ?? ''
    };

    const normalizedAcademic = {
        currentClass: academicInformation.currentClass || normalizedStudent.classGrade || '',
        previousYearPercentage: academicInformation.previousYearPercentage || '',
        institutionName: academicInformation.institutionName || normalizedStudent.schoolCollegeName || '',
        academicYear: academicInformation.academicYear || ''
    };

    if (
        !normalizedParent.fatherName ||
        !normalizedParent.motherName ||
        !normalizedParent.fatherAadhaar ||
        !normalizedParent.motherAadhaar ||
        !normalizedParent.fatherOccupation ||
        !normalizedParent.motherOccupation ||
        !normalizedStudent.schoolCollegeName ||
        !normalizedStudent.classGrade ||
        !normalizedPersonal.phone ||
        !normalizedPersonal.dateOfBirth ||
        !normalizedPersonal.address
    ) {
        return res.status(400).json({ message: 'All required application fields must be provided.' });
    }

    if (
        String(normalizedParent.fatherAadhaar).length !== 12 ||
        String(normalizedParent.motherAadhaar).length !== 12 ||
        !/^\d{12}$/.test(String(normalizedParent.fatherAadhaar)) ||
        !/^\d{12}$/.test(String(normalizedParent.motherAadhaar))
    ) {
        return res.status(400).json({ message: 'Aadhaar numbers must be exactly 12 digits.' });
    }

    const fatherIncomeError = validateParentIncome(
        normalizedParent.fatherOccupation,
        normalizedParent.fatherAnnualIncome,
        'Father'
    );
    const motherIncomeError = validateParentIncome(
        normalizedParent.motherOccupation,
        normalizedParent.motherAnnualIncome,
        'Mother'
    );
    if (fatherIncomeError || motherIncomeError) {
        return res.status(400).json({ message: fatherIncomeError || motherIncomeError });
    }

    const fatherDeclaredIncome = resolveStoredParentIncome(
        normalizedParent.fatherOccupation,
        normalizedParent.fatherAnnualIncome
    );
    const motherDeclaredIncome = resolveStoredParentIncome(
        normalizedParent.motherOccupation,
        normalizedParent.motherAnnualIncome
    );
    if (fatherDeclaredIncome == null || motherDeclaredIncome == null) {
        return res.status(400).json({ message: 'Parent annual incomes must be valid non-negative numbers.' });
    }

    try {
        const { user, profile } = await fetchStudentContext(userId);
        if (!profile) {
            return res.status(404).json({ message: 'Student profile not found. Please complete registration details.' });
        }

        const applicationRegion = normalizedStudent.region || profile.region;
        const applicationDistrict = normalizedStudent.district || profile.district;

        if (applicationRegion && applicationDistrict) {
            const { error: profileUpdateErr } = await supabase
                .from('student_profiles')
                .update({
                    student_name: normalizedStudent.studentName || profile.student_name,
                    college_name: normalizedStudent.schoolCollegeName || profile.college_name,
                    grade: normalizedStudent.classGrade || profile.grade,
                    region: applicationRegion,
                    district: applicationDistrict,
                })
                .eq('user_id', userId);
            if (profileUpdateErr) throw profileUpdateErr;
        }

        const profileDetailsId = await upsertByMatch('student_profile_details', 'user_id', userId, {
            phone: normalizedPersonal.phone || null,
            date_of_birth: normalizedPersonal.dateOfBirth || null,
            gender: normalizedPersonal.gender || null,
            address: normalizedPersonal.address || null,
            academic_year: normalizedAcademic.academicYear || null,
            course_grade: normalizedStudent.classGrade || null,
            father_name: normalizedParent.fatherName || null,
            mother_name: normalizedParent.motherName || null,
            father_aadhaar: normalizedParent.fatherAadhaar || null,
            mother_aadhaar: normalizedParent.motherAadhaar || null,
            father_occupation: normalizedParent.fatherOccupation || null,
            father_annual_income: fatherDeclaredIncome,
            mother_occupation: normalizedParent.motherOccupation || null,
            mother_annual_income: motherDeclaredIncome,
        });
        if (profileDetailsId === null) {
            await saveProfileDetailsFallback(userId, {
                phone: normalizedPersonal.phone || null,
                date_of_birth: normalizedPersonal.dateOfBirth || null,
                gender: normalizedPersonal.gender || null,
                address: normalizedPersonal.address || null,
                academic_year: normalizedAcademic.academicYear || null,
                course_grade: normalizedStudent.classGrade || null,
                institution_type: normalizedStudent.institutionType || 'School',
                father_name: normalizedParent.fatherName || null,
                mother_name: normalizedParent.motherName || null,
                father_aadhaar: normalizedParent.fatherAadhaar || null,
                mother_aadhaar: normalizedParent.motherAadhaar || null,
                father_occupation: normalizedParent.fatherOccupation || null,
                father_annual_income: fatherDeclaredIncome,
                mother_occupation: normalizedParent.motherOccupation || null,
                mother_annual_income: motherDeclaredIncome,
            });
        } else {
            const existingDetails = await getProfileDetailsFallback(userId);
            await saveProfileDetailsFallback(userId, {
                ...(existingDetails || {}),
                academic_year: normalizedAcademic.academicYear || existingDetails?.academic_year || null,
                father_occupation: normalizedParent.fatherOccupation || existingDetails?.father_occupation || null,
                father_annual_income: fatherDeclaredIncome,
                mother_occupation: normalizedParent.motherOccupation || existingDetails?.mother_occupation || null,
                mother_annual_income: motherDeclaredIncome,
            });
        }

        let isEligible = true;
        let rejectReason = '';
        let ruleMatched = '';
        const combinedDeclaredIncome = fatherDeclaredIncome + motherDeclaredIncome;

        if (combinedDeclaredIncome > SCHOLARSHIP_INCOME_THRESHOLD) {
            isEligible = false;
            ruleMatched = 'Rule 1';
            rejectReason = `Combined family income (Rs. ${combinedDeclaredIncome.toLocaleString()}) exceeds the limit of Rs. ${SCHOLARSHIP_INCOME_THRESHOLD.toLocaleString()}.`;
        }

        const { data: fatherTaxData, error: fTaxErr } = await supabase.from('tax_records').select('*').eq('aadhaar_number', normalizedParent.fatherAadhaar);
        if (fTaxErr) throw fTaxErr;

        const { data: motherTaxData, error: mTaxErr } = await supabase.from('tax_records').select('*').eq('aadhaar_number', normalizedParent.motherAadhaar);
        if (mTaxErr) throw mTaxErr;

        let fatherIncome = 0;
        let fatherTaxPaid = false;
        let motherIncome = 0;
        let motherTaxPaid = false;

        if (isEligible && fatherTaxData && fatherTaxData.length > 0) {
            fatherIncome = parseFloat(fatherTaxData[0].annual_income);
            fatherTaxPaid = fatherTaxData[0].tax_paid;
        }
        if (isEligible && motherTaxData && motherTaxData.length > 0) {
            motherIncome = parseFloat(motherTaxData[0].annual_income);
            motherTaxPaid = motherTaxData[0].tax_paid;
        }

        if (isEligible && fatherIncome > SCHOLARSHIP_INCOME_THRESHOLD) {
            isEligible = false;
            ruleMatched = 'Rule 1';
            rejectReason = `Father's verified annual income (Rs. ${fatherIncome.toLocaleString()}) exceeds the limit of Rs. ${SCHOLARSHIP_INCOME_THRESHOLD.toLocaleString()}.`;
        } else if (isEligible && motherIncome > SCHOLARSHIP_INCOME_THRESHOLD) {
            isEligible = false;
            ruleMatched = 'Rule 1';
            rejectReason = `Mother's verified annual income (Rs. ${motherIncome.toLocaleString()}) exceeds the limit of Rs. ${SCHOLARSHIP_INCOME_THRESHOLD.toLocaleString()}.`;
        } else if (isEligible && (fatherIncome + motherIncome) > SCHOLARSHIP_INCOME_THRESHOLD) {
            isEligible = false;
            ruleMatched = 'Rule 1';
            rejectReason = `Combined verified family income (Rs. ${(fatherIncome + motherIncome).toLocaleString()}) exceeds the limit of Rs. ${SCHOLARSHIP_INCOME_THRESHOLD.toLocaleString()}.`;
        }

        if (isEligible) {
            if (fatherTaxPaid) {
                isEligible = false;
                ruleMatched = 'Rule 2';
                rejectReason = 'Father is a registered taxpayer (tax paid = true).';
            } else if (motherTaxPaid) {
                isEligible = false;
                ruleMatched = 'Rule 2';
                rejectReason = 'Mother is a registered taxpayer (tax paid = true).';
            }
        }

        let feePaid = 0;
        let totalFee = 0;
        if (isEligible) {
            const { data: feesData, error: feeErr } = await supabase
                .from('institution_fees')
                .select('*')
                .eq('school_name', normalizedStudent.schoolCollegeName)
                .eq('grade', normalizedStudent.classGrade);

            if (feeErr) throw feeErr;
            if (feesData && feesData.length > 0) {
                feePaid = parseFloat(feesData[0].fee_paid);
                totalFee = parseFloat(feesData[0].total_fee);
                if (feePaid === totalFee && totalFee > 0) {
                    isEligible = false;
                    ruleMatched = 'Rule 3';
                    rejectReason = `Institution fees are fully paid (Paid: Rs. ${feePaid.toLocaleString()} / Total: Rs. ${totalFee.toLocaleString()}).`;
                }
            }
        }

        let autoStatus = 'Rejected';
        let initialAppStatus = 'Rejected';
        let autoReason = '';

        if (isEligible) {
            autoStatus = 'Eligible';
            initialAppStatus = 'In Progress';
            autoReason = `Rule 4 satisfied: Family income <= Rs. ${SCHOLARSHIP_INCOME_THRESHOLD.toLocaleString()}, not a tax payer, and college fees are not fully paid.`;
        } else {
            autoReason = `${ruleMatched} triggered: ${rejectReason}`;
        }

        let assignedAdminId = null;
        let { data: admins, error: adminErr } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'Admin')
            .eq('region', applicationRegion)
            .eq('district', applicationDistrict)
            .eq('status', 'Active')
            .limit(1);

        if (adminErr) throw adminErr;

        if (!admins || admins.length === 0) {
            const fallback = await supabase
                .from('users')
                .select('id')
                .eq('role', 'Admin')
                .eq('region', applicationRegion)
                .eq('status', 'Active')
                .limit(1);
            if (fallback.error) throw fallback.error;
            admins = fallback.data;
        }

        if (admins && admins.length > 0) {
            assignedAdminId = admins[0].id;
        }

        const applicationId = crypto.randomUUID();
        const applicationNumber = `SCH-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

        const { error: appInsertErr } = await supabase
            .from('applications')
            .insert([{
                id: applicationId,
                application_number: applicationNumber,
                student_id: userId,
                father_name: normalizedParent.fatherName,
                mother_name: normalizedParent.motherName,
                father_aadhaar: normalizedParent.fatherAadhaar,
                mother_aadhaar: normalizedParent.motherAadhaar,
                status: initialAppStatus,
                auto_eligibility_status: autoStatus,
                auto_eligibility_reason: autoReason,
                rejection_reason: initialAppStatus === 'Rejected' ? `Auto-Rejected: ${rejectReason}` : null,
                assigned_admin: assignedAdminId
            }]);
        if (appInsertErr) throw appInsertErr;

        const { error: detailInsertErr } = await supabase
            .from('application_details')
            .insert([{
                id: crypto.randomUUID(),
                application_id: applicationId,
                student_name: normalizedStudent.studentName || profile.student_name || user?.name || '',
                student_identifier: normalizedStudent.studentId || profile.student_id || '',
                school_name: normalizedStudent.schoolCollegeName || profile.college_name || '',
                class_grade: normalizedStudent.classGrade || profile.grade || '',
                region: normalizedStudent.region || profile.region || '',
                district: normalizedStudent.district || profile.district || '',
                father_name: normalizedParent.fatherName,
                mother_name: normalizedParent.motherName,
                father_aadhaar: normalizedParent.fatherAadhaar,
                mother_aadhaar: normalizedParent.motherAadhaar,
                father_occupation: normalizedParent.fatherOccupation,
                father_annual_income: fatherDeclaredIncome,
                mother_occupation: normalizedParent.motherOccupation,
                mother_annual_income: motherDeclaredIncome,
                current_class: normalizedAcademic.currentClass,
                previous_year_percentage: normalizedAcademic.previousYearPercentage ? Number(normalizedAcademic.previousYearPercentage) : null,
                institution_name: normalizedAcademic.institutionName,
                academic_year: normalizedAcademic.academicYear,
                verification_result: autoStatus
            }]);
        if (detailInsertErr && !isMissingTableError(detailInsertErr)) throw detailInsertErr;

        await saveApplicationDocuments(applicationId, userId, documents);

        const { error: auditErr } = await supabase
            .from('audit_logs')
            .insert([{
                id: crypto.randomUUID(),
                actor_id: userId,
                actor_role: 'Student',
                action: 'Application Submitted',
                application_id: applicationId,
                remarks: `Application ${applicationNumber} submitted. Auto-verification result: ${autoStatus}. Reason: ${autoReason}`
            }]);
        if (auditErr) throw auditErr;

        const { error: notifErr } = await supabase
            .from('notifications')
            .insert([{
                id: crypto.randomUUID(),
                user_id: userId,
                title: 'Scholarship Application Submitted',
                message: `Your application ${applicationNumber} has been submitted. Status: ${initialAppStatus}. Auto Eligibility: ${autoStatus}.`
            }]);
        if (notifErr) throw notifErr;

        const { data: refreshedUsers, error: refreshUserErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .limit(1);
        if (refreshUserErr) throw refreshUserErr;

        const refreshedUser = refreshedUsers?.[0] || user;
        const token = issueAuthToken(refreshedUser);

        res.status(201).json({
            message: 'Application submitted successfully.',
            token,
            user: toAuthUser(refreshedUser),
            application: {
                id: applicationId,
                applicationNumber,
                status: initialAppStatus,
                autoEligibilityStatus: autoStatus,
                autoEligibilityReason: autoReason
            }
        });
    } catch (error) {
        console.error('Apply Scholarship Error:', error);
        res.status(500).json({ message: 'Internal server error during scholarship application.' });
    }
});

router.get('/applications', verifyToken, requireRole('Student'), async (req, res) => {
    try {
        const applications = await fetchApplicationBundle(req.user.id);
        res.json(applications);
    } catch (error) {
        console.error('Fetch Applications Error:', error);
        res.status(500).json({ message: 'Internal server error fetching applications.' });
    }
});

router.get('/applications/:id', verifyToken, requireRole('Student'), async (req, res) => {
    const appId = req.params.id;
    const userId = req.user.id;

    try {
        const { data: apps, error: appErr } = await supabase
            .from('applications')
            .select('*')
            .eq('id', appId)
            .eq('student_id', userId)
            .limit(1);
        if (appErr) throw appErr;
        if (!apps || apps.length === 0) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        const app = apps[0];
        const [detailRecord, docs, logs, fTax, mTax] = await Promise.all([
            queryOptionalRow(supabase.from('application_details').select('*').eq('application_id', appId).limit(1)),
            getApplicationDocuments(appId),
            queryOptionalRows(supabase.from('audit_logs').select('*').eq('application_id', appId).order('created_at', { ascending: true })),
            queryOptionalRow(supabase.from('tax_records').select('annual_income, tax_paid').eq('aadhaar_number', app.father_aadhaar).limit(1)),
            queryOptionalRow(supabase.from('tax_records').select('annual_income, tax_paid').eq('aadhaar_number', app.mother_aadhaar).limit(1)),
        ]);

        let institutionFees = null;

        if (detailRecord?.school_name && detailRecord?.class_grade) {
            institutionFees = await queryOptionalRow(
                supabase.from('institution_fees')
                    .select('total_fee, fee_paid, payment_status')
                    .eq('school_name', detailRecord.school_name)
                    .eq('grade', detailRecord.class_grade)
                    .limit(1)
            );
        }

        res.json({
            application: {
                ...app,
                details: detailRecord,
                documents: docs || [],
                remarks: getApplicationRemarks(app, detailRecord),
                timeline: buildApplicationTimeline(app, logs || []),
                verificationData: {
                    fatherTax: fTax || null,
                    motherTax: mTax || null,
                    institutionFees
                },
                auditLogs: logs || []
            }
        });
    } catch (error) {
        console.error('Fetch Application Detail Error:', error);
        res.status(500).json({ message: 'Internal server error fetching application detail.' });
    }
});

router.get('/notifications', verifyToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(notifications || []);
    } catch (error) {
        console.error('Fetch Notifications Error:', error);
        res.status(500).json({ message: 'Internal server error fetching notifications.' });
    }
});

router.put('/notifications/:id/read', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const notificationId = req.params.id;
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read_status: true })
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ message: 'Notification marked as read.' });
    } catch (error) {
        console.error('Mark Read Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.get('/profile', verifyToken, requireRole('Student'), async (req, res) => {
    try {
        const { user, profile, details } = await fetchStudentContext(req.user.id);

        if (!user || !profile) {
            return res.status(404).json({ message: 'Profile details not found.' });
        }

        res.json({
            user,
            profile,
            details,
            profileView: mapProfileResponse(user, profile, details),
            referenceData: { regionsAndDistricts: REGIONS_AND_DISTRICTS },
        });
    } catch (error) {
        console.error('Fetch Profile Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.put('/profile', verifyToken, requireRole('Student'), async (req, res) => {
    const userId = req.user.id;
    const {
        fullName,
        email,
        phone,
        region,
        district,
        institutionName,
        courseGrade,
        academicYear,
        dateOfBirth,
        gender,
        address,
        fatherName,
        motherName,
        fatherAadhaar,
        motherAadhaar,
        fatherOccupation,
        motherOccupation,
        fatherAnnualIncome,
        motherAnnualIncome,
        currentPassword,
        newPassword,
        studentPhoto
    } = req.body;

    if (!fullName || !email || !institutionName || !courseGrade || !region || !district) {
        return res.status(400).json({ message: 'Missing required profile fields.' });
    }

    if (!REGIONS_AND_DISTRICTS[region] || !REGIONS_AND_DISTRICTS[region].includes(district)) {
        return res.status(400).json({ message: 'Invalid region or district.' });
    }

    try {
        const { data: users, error: userFetchErr } = await supabase.from('users').select('*').eq('id', userId).limit(1);
        if (userFetchErr) throw userFetchErr;
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to change password.' });
            }
            const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
            if (!isValidPassword) {
                return res.status(400).json({ message: 'Current password is incorrect.' });
            }
        }

        const userUpdate = {
            name: fullName,
            email,
            region,
            district
        };

        if (newPassword) {
            userUpdate.password_hash = await bcrypt.hash(newPassword, 10);
        }

        const { error: userErr } = await supabase.from('users').update(userUpdate).eq('id', userId);
        if (userErr) throw userErr;

        const { data: profiles, error: profileFetchErr } = await supabase.from('student_profiles').select('*').eq('user_id', userId).limit(1);
        if (profileFetchErr) throw profileFetchErr;
        if (!profiles || profiles.length === 0) {
            return res.status(404).json({ message: 'Student profile not found.' });
        }

        const { error: profileErr } = await supabase
            .from('student_profiles')
            .update({
                student_name: fullName,
                college_name: institutionName,
                grade: courseGrade,
                district,
                region
            })
            .eq('user_id', userId);
        if (profileErr) throw profileErr;

        const profileDetailsPayload = {
            phone: phone || null,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            address: address || null,
            academic_year: academicYear || null,
            course_grade: courseGrade || null,
            father_name: fatherName || null,
            mother_name: motherName || null,
            father_aadhaar: fatherAadhaar || null,
            mother_aadhaar: motherAadhaar || null,
            father_occupation: fatherOccupation || null,
            mother_occupation: motherOccupation || null,
            father_annual_income: fatherAnnualIncome != null && fatherAnnualIncome !== '' ? Number(fatherAnnualIncome) : null,
            mother_annual_income: motherAnnualIncome != null && motherAnnualIncome !== '' ? Number(motherAnnualIncome) : null,
            student_photo_name: studentPhoto?.fileName || null,
            student_photo_mime_type: studentPhoto?.mimeType || null,
            student_photo_data_base64: studentPhoto?.fileDataBase64 || null
        };
        const profileDetailsId = await upsertByMatch('student_profile_details', 'user_id', userId, profileDetailsPayload);
        if (profileDetailsId === null) {
            await saveProfileDetailsFallback(userId, profileDetailsPayload);
        }

        const { data: refreshedUsers, error: refreshUserErr } = await supabase.from('users').select('*').eq('id', userId).limit(1);
        if (refreshUserErr) throw refreshUserErr;

        const refreshedUser = refreshedUsers?.[0] || users[0];
        const token = issueAuthToken(refreshedUser);

        res.json({
            message: 'Profile updated successfully.',
            token,
            user: toAuthUser(refreshedUser)
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

router.get('/documents', verifyToken, requireRole('Student'), async (req, res) => {
    try {
        const { data: docs, error } = await supabase
            .from('student_documents')
            .select('id, category, file_name, mime_type, file_size, application_id, created_at, updated_at')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(docs || []);
    } catch (error) {
        console.error('Fetch Documents Error:', error);
        res.status(500).json({ message: 'Internal server error fetching documents.' });
    }
});

router.get('/documents/:id', verifyToken, requireRole('Student'), async (req, res) => {
    try {
        const { data: docs, error } = await supabase
            .from('student_documents')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .limit(1);

        if (error) throw error;
        if (!docs || docs.length === 0) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        res.json({ document: docs[0] });
    } catch (error) {
        console.error('Fetch Document Error:', error);
        res.status(500).json({ message: 'Internal server error fetching document.' });
    }
});

router.put('/documents/:id', verifyToken, requireRole('Student'), async (req, res) => {
    const { category, fileName, mimeType, fileSize, fileDataBase64 } = req.body;

    if (!fileName || !fileDataBase64) {
        return res.status(400).json({ message: 'Document file data is required.' });
    }

    try {
        const { error } = await supabase
            .from('student_documents')
            .update({
                category: category || null,
                file_name: fileName,
                mime_type: mimeType || 'application/octet-stream',
                file_size: fileSize || 0,
                file_data_base64: fileDataBase64
            })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ message: 'Document updated successfully.' });
    } catch (error) {
        console.error('Update Document Error:', error);
        res.status(500).json({ message: 'Internal server error updating document.' });
    }
});

router.get('/reference-data', verifyToken, requireRole('Student'), async (req, res) => {
    try {
        res.json({
            regionsAndDistricts: REGIONS_AND_DISTRICTS,
            applicationStatuses: APPLICATION_STATUS_VALUES,
            documentCategories: [
                'Student Aadhaar',
                'Income Certificate',
                'Fee Receipt',
                'Study Certificate',
                'Other Documents'
            ]
        });
    } catch (error) {
        console.error('Reference Data Error:', error);
        res.status(500).json({ message: 'Internal server error fetching reference data.' });
    }
});

export default router;
