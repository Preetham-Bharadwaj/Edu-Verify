import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { supabase } from '../config/supabase.js';
import { getProfileDetailsFallback } from '../services/profileDetailsStorage.js';

const DECISION_ACTIONS = new Set([
    'Application Approved',
    'Application Rejected',
    'Application Hold',
    'Manual Override',
]);

export const TYPE_LABELS = {
    applications: 'Applications Report',
    approved: 'Approved Report',
    rejected: 'Rejected Report',
    pending: 'Pending Report',
    institution: 'Institution-wise Report',
};

const APPLICATION_COLUMNS = [
    'Application ID',
    'Student Name',
    'Student ID',
    'Institution',
    'Course',
    'Category',
    'Annual Income',
    'Auto Eligibility',
    'Current Status',
    'Submitted Date',
    'Verified Date',
    'Admin Remarks',
];

const INSTITUTION_COLUMNS = [
    'Institution',
    'Total Applications',
    'Approved',
    'Rejected',
    'Pending',
    'Hold',
];

const EMPTY_MESSAGE = 'No records found for the selected criteria.';

function isMissingTableError(error) {
    return error?.code === 'PGRST205';
}

async function queryOptionalRows(queryPromise) {
    const { data, error } = await queryPromise;
    if (error) {
        if (isMissingTableError(error)) return [];
        throw error;
    }
    return data || [];
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function displayStatus(status) {
    if (!status || status === 'In Progress') return 'Pending';
    if (status === 'Under Verification') return 'Under Verification';
    return status;
}

function isPendingStatus(status) {
    return !['Approved', 'Rejected', 'Hold'].includes(status);
}

function getAdminRemarks(app, detail) {
    return (
        detail?.admin_remarks
        || app.override_comments
        || app.rejection_reason
        || app.hold_reason
        || app.override_reason
        || ''
    );
}

function getAnnualIncome(fatherTax, motherTax) {
    const father = fatherTax?.annual_income != null ? Number(fatherTax.annual_income) : 0;
    const mother = motherTax?.annual_income != null ? Number(motherTax.annual_income) : 0;
    const total = father + mother;
    return total > 0 ? total : '';
}

function adminCanAccessApplication(app, profile, adminRegion, adminDistrict, adminId) {
    if (adminRegion && profile.region && profile.region !== adminRegion) return false;
    if (!adminDistrict) return true;
    if (profile.district === adminDistrict) return true;
    if (app.assigned_admin === adminId) return true;
    if (app.assigned_admin == null && profile.region === adminRegion) return true;
    return false;
}

function applyTypeFilter(records, type) {
    if (type === 'approved') return records.filter((row) => row.current_status === 'Approved');
    if (type === 'rejected') return records.filter((row) => row.current_status === 'Rejected');
    if (type === 'pending') return records.filter((row) => isPendingStatus(row.current_status));
    return records;
}

function applyQueryFilters(records, { from, to, institution, status }) {
    let result = records;

    if (from) {
        const fromDate = new Date(from);
        result = result.filter((row) => new Date(row.submitted_at) >= fromDate);
    }
    if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        result = result.filter((row) => new Date(row.submitted_at) <= toDate);
    }
    if (institution) {
        const needle = institution.toLowerCase();
        result = result.filter((row) => (row.institution || '').toLowerCase().includes(needle));
    }
    if (status && status !== 'All') {
        if (status === 'Pending') {
            result = result.filter((row) => isPendingStatus(row.current_status));
        } else {
            result = result.filter((row) => row.current_status === status);
        }
    }

    return result;
}

function buildSummary(records) {
    return {
        total: records.length,
        approved: records.filter((row) => row.current_status === 'Approved').length,
        rejected: records.filter((row) => row.current_status === 'Rejected').length,
        pending: records.filter((row) => isPendingStatus(row.current_status)).length,
        hold: records.filter((row) => row.current_status === 'Hold').length,
    };
}

function buildInstitutionRows(records) {
    const grouped = new Map();

    for (const row of records) {
        const key = row.institution || 'Unknown Institution';
        if (!grouped.has(key)) {
            grouped.set(key, {
                institution: key,
                total: 0,
                approved: 0,
                rejected: 0,
                pending: 0,
                hold: 0,
            });
        }
        const bucket = grouped.get(key);
        bucket.total += 1;
        if (row.current_status === 'Approved') bucket.approved += 1;
        else if (row.current_status === 'Rejected') bucket.rejected += 1;
        else if (row.current_status === 'Hold') bucket.hold += 1;
        else bucket.pending += 1;
    }

    return Array.from(grouped.values()).sort((left, right) => left.institution.localeCompare(right.institution));
}

function escapeCsv(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function applicationRowValues(row) {
    return [
        row.application_id,
        row.student_name,
        row.student_id,
        row.institution,
        row.course,
        row.category,
        row.annual_income,
        row.auto_eligibility,
        displayStatus(row.current_status),
        formatDate(row.submitted_at),
        formatDate(row.verified_at),
        row.admin_remarks,
    ];
}

export async function fetchReportApplications(reqUser) {
    const adminRegion = reqUser.region || null;
    const adminDistrict = reqUser.district || null;
    const adminId = reqUser.id;

    const { data: apps, error: appErr } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });
    if (appErr) throw appErr;
    if (!apps?.length) return [];

    const studentIds = [...new Set(apps.map((app) => app.student_id).filter(Boolean))];
    const applicationIds = apps.map((app) => app.id);

    const [profiles, details, auditLogs, profileDetailsRows] = await Promise.all([
        queryOptionalRows(supabase.from('student_profiles').select('*').in('user_id', studentIds)),
        queryOptionalRows(supabase.from('application_details').select('*').in('application_id', applicationIds)),
        queryOptionalRows(supabase.from('audit_logs').select('*').in('application_id', applicationIds).order('created_at', { ascending: true })),
        Promise.all(studentIds.map(async (studentId) => {
            const { data } = await supabase.from('student_profile_details').select('*').eq('user_id', studentId).limit(1);
            const row = data?.[0] || await getProfileDetailsFallback(studentId);
            return row ? { ...row, user_id: studentId } : null;
        })),
    ]);

    const aadhaarNumbers = [...new Set(
        apps.flatMap((app) => [app.father_aadhaar, app.mother_aadhaar]).filter(Boolean)
    )];
    const taxRows = aadhaarNumbers.length
        ? await queryOptionalRows(supabase.from('tax_records').select('*').in('aadhaar_number', aadhaarNumbers))
        : [];

    const profileDetails = profileDetailsRows.filter(Boolean);
    const verifiedAtByApp = new Map();
    for (const log of auditLogs) {
        if (log.application_id && DECISION_ACTIONS.has(log.action)) {
            verifiedAtByApp.set(log.application_id, log.created_at);
        }
    }

    let records = apps.map((app) => {
        const profile = profiles.find((item) => item.user_id === app.student_id) || {};
        const detail = details.find((item) => item.application_id === app.id) || {};
        const detailsExt = profileDetails.find((item) => item.user_id === app.student_id) || {};
        const fatherTax = taxRows.find((item) => item.aadhaar_number === app.father_aadhaar) || null;
        const motherTax = taxRows.find((item) => item.aadhaar_number === app.mother_aadhaar) || null;

        return {
            application_id: app.application_number,
            student_name: detail.student_name || profile.student_name || '',
            student_id: detail.student_identifier || profile.student_id || '',
            institution: detail.institution_name || detail.school_name || profile.college_name || '',
            course: detail.class_grade || detail.current_class || detailsExt.course_grade || profile.grade || '',
            category: detailsExt.institution_type || detail.institution_type || 'School',
            annual_income: getAnnualIncome(fatherTax, motherTax),
            auto_eligibility: app.auto_eligibility_status || '',
            current_status: app.status || 'In Progress',
            submitted_at: app.created_at,
            verified_at: verifiedAtByApp.get(app.id) || '',
            admin_remarks: getAdminRemarks(app, detail),
            _profile: profile,
            _app: app,
        };
    });

    if (reqUser.role === 'Admin') {
        records = records.filter((row) =>
            adminCanAccessApplication(row._app, row._profile, adminRegion, adminDistrict, adminId)
        );
    } else if (adminRegion) {
        records = records.filter((row) => row._profile.region === adminRegion);
    }

    return records.map(({ _profile, _app, ...row }) => row);
}

export function prepareReportData(records, type, filters) {
    let rows = applyTypeFilter(records, type);
    rows = applyQueryFilters(rows, filters);

    if (type === 'institution') {
        return {
            type,
            isInstitution: true,
            rows: buildInstitutionRows(rows),
            summary: buildSummary(rows),
            applicationRows: rows,
        };
    }

    return {
        type,
        isInstitution: false,
        rows,
        summary: buildSummary(rows),
        applicationRows: rows,
    };
}

export function buildApplicationCsv(rows) {
    const header = `${APPLICATION_COLUMNS.join(',')}\n`;
    if (!rows.length) {
        return `${header}${escapeCsv(EMPTY_MESSAGE)}\n`;
    }
    return header + rows.map((row) => applicationRowValues(row).map(escapeCsv).join(',')).join('\n') + '\n';
}

export function buildInstitutionCsv(rows) {
    const header = `${INSTITUTION_COLUMNS.join(',')}\n`;
    if (!rows.length) {
        return `${header}${escapeCsv(EMPTY_MESSAGE)}\n`;
    }
    return header + rows.map((row) => [
        escapeCsv(row.institution),
        escapeCsv(row.total),
        escapeCsv(row.approved),
        escapeCsv(row.rejected),
        escapeCsv(row.pending),
        escapeCsv(row.hold),
    ].join(',')).join('\n') + '\n';
}

export async function buildExcelBuffer(reportData) {
    const workbook = new ExcelJS.Workbook();
    const applicationsSheet = workbook.addWorksheet('Applications Data');
    const summarySheet = workbook.addWorksheet('Summary');

    if (reportData.isInstitution) {
        applicationsSheet.addRow(INSTITUTION_COLUMNS);
        if (!reportData.rows.length) {
            applicationsSheet.addRow([EMPTY_MESSAGE]);
        } else {
            reportData.rows.forEach((row) => {
                applicationsSheet.addRow([
                    row.institution,
                    row.total,
                    row.approved,
                    row.rejected,
                    row.pending,
                    row.hold,
                ]);
            });
        }
    } else {
        applicationsSheet.addRow(APPLICATION_COLUMNS);
        if (!reportData.rows.length) {
            applicationsSheet.addRow([EMPTY_MESSAGE]);
        } else {
            reportData.rows.forEach((row) => {
                applicationsSheet.addRow(applicationRowValues(row));
            });
        }
    }

    summarySheet.addRow(['Metric', 'Count']);
    summarySheet.addRow(['Total Applications', reportData.summary.total]);
    summarySheet.addRow(['Approved', reportData.summary.approved]);
    summarySheet.addRow(['Rejected', reportData.summary.rejected]);
    summarySheet.addRow(['Pending', reportData.summary.pending]);
    summarySheet.addRow(['Hold', reportData.summary.hold]);

    return workbook.xlsx.writeBuffer();
}

function drawFilterBlock(doc, filters) {
    const lines = [];
    if (filters.institution) lines.push(`Institution: ${filters.institution}`);
    if (filters.status && filters.status !== 'All') lines.push(`Status: ${filters.status}`);
    if (filters.from || filters.to) {
        lines.push(`Date Range: ${filters.from || 'Any'} to ${filters.to || 'Any'}`);
    }
    if (!lines.length) return;

    doc.fontSize(9).fillColor('#475569').text('Applied Filters', { underline: true });
    lines.forEach((line) => doc.text(line));
    doc.moveDown();
}

function drawSummaryBlock(doc, summary) {
    doc.fontSize(10).fillColor('#0f172a').text('Report Summary', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#334155');
    doc.text(`Total Applications: ${summary.total}`);
    doc.text(`Approved: ${summary.approved}`);
    doc.text(`Rejected: ${summary.rejected}`);
    doc.text(`Pending: ${summary.pending}`);
    doc.text(`Hold: ${summary.hold}`);
    doc.moveDown();
}

function drawApplicationTable(doc, rows) {
    const columns = [
        { label: 'Application ID', width: 70, key: 'application_id' },
        { label: 'Student Name', width: 75, key: 'student_name' },
        { label: 'Student ID', width: 55, key: 'student_id' },
        { label: 'Institution', width: 70, key: 'institution' },
        { label: 'Course', width: 45, key: 'course' },
        { label: 'Category', width: 45, key: 'category' },
        { label: 'Income', width: 45, key: 'annual_income' },
        { label: 'Auto Elig.', width: 45, key: 'auto_eligibility' },
        { label: 'Status', width: 45, key: 'current_status' },
        { label: 'Submitted', width: 50, key: 'submitted_at' },
        { label: 'Verified', width: 50, key: 'verified_at' },
        { label: 'Remarks', width: 70, key: 'admin_remarks' },
    ];

    const left = 20;
    const drawHeader = () => {
        let x = left;
        const y = doc.y;
        doc.fontSize(7).fillColor('#0b2a5c');
        columns.forEach((column) => {
            doc.text(column.label, x, y, { width: column.width, lineBreak: false });
            x += column.width + 4;
        });
        doc.moveDown(0.8);
        doc.strokeColor('#cbd5e1').moveTo(left, doc.y).lineTo(575, doc.y).stroke();
        doc.moveDown(0.3);
    };

    drawHeader();
    doc.fillColor('#1e293b').fontSize(7);

    if (!rows.length) {
        doc.fontSize(10).fillColor('#64748b').text(EMPTY_MESSAGE, { align: 'center' });
        return;
    }

    for (const row of rows) {
        if (doc.y > 700) {
            doc.addPage();
            drawHeader();
        }
        let x = left;
        const y = doc.y;
        const values = {
            ...row,
            current_status: displayStatus(row.current_status),
            submitted_at: formatDate(row.submitted_at),
            verified_at: formatDate(row.verified_at),
        };
        columns.forEach((column) => {
            doc.text(String(values[column.key] ?? ''), x, y, { width: column.width, height: 24, ellipsis: true });
            x += column.width + 4;
        });
        doc.moveDown(1.6);
    }
}

function drawInstitutionTable(doc, rows) {
    const columns = INSTITUTION_COLUMNS;
    const widths = [150, 70, 60, 60, 60, 50];
    const left = 30;

    const drawHeader = () => {
        let x = left;
        const y = doc.y;
        doc.fontSize(9).fillColor('#0b2a5c');
        columns.forEach((label, index) => {
            doc.text(label, x, y, { width: widths[index] });
            x += widths[index] + 8;
        });
        doc.moveDown();
        doc.strokeColor('#cbd5e1').moveTo(left, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.4);
    };

    drawHeader();
    doc.fontSize(9).fillColor('#1e293b');

    if (!rows.length) {
        doc.fontSize(10).fillColor('#64748b').text(EMPTY_MESSAGE, { align: 'center' });
        return;
    }

    for (const row of rows) {
        if (doc.y > 700) {
            doc.addPage();
            drawHeader();
        }
        let x = left;
        const y = doc.y;
        const values = [row.institution, row.total, row.approved, row.rejected, row.pending, row.hold];
        values.forEach((value, index) => {
            doc.text(String(value ?? ''), x, y, { width: widths[index] });
            x += widths[index] + 8;
        });
        doc.moveDown();
    }
}

export function sendPdf(res, { type, reportData, generatedBy, filters }) {
    const filename = `${type}_report_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#0b2a5c').text('EduVerify', { align: 'center' });
    doc.fontSize(11).fillColor('#334155').text('Scholarship Verification System', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(13).fillColor('#0f172a').text(TYPE_LABELS[type] || 'Application Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#475569');
    doc.text(`Generated Date & Time: ${formatDateTime(new Date())}`, { align: 'center' });
    doc.text(`Generated By: ${generatedBy || 'Admin'}`, { align: 'center' });
    doc.moveDown();

    drawFilterBlock(doc, filters);
    drawSummaryBlock(doc, reportData.summary);
    doc.fontSize(10).fillColor('#0f172a').text(reportData.isInstitution ? 'Institution Data' : 'Application Data', { underline: true });
    doc.moveDown(0.5);

    if (reportData.isInstitution) {
        drawInstitutionTable(doc, reportData.rows);
    } else {
        drawApplicationTable(doc, reportData.rows);
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#64748b');
        doc.text(
            'Generated by EduVerify Scholarship Verification System',
            30,
            doc.page.height - 40,
            { align: 'center', width: doc.page.width - 60 }
        );
        doc.text(
            `Page ${i + 1} of ${range.count}`,
            30,
            doc.page.height - 28,
            { align: 'center', width: doc.page.width - 60 }
        );
    }

    doc.end();
}

export async function logReportExport(reqUser, type, format, filters, recordCount) {
    try {
        await supabase.from('audit_logs').insert([{
            id: crypto.randomUUID(),
            actor_id: reqUser.id,
            actor_role: reqUser.role,
            action: `Report Export: ${TYPE_LABELS[type] || type}`,
            remarks: JSON.stringify({
                type,
                format,
                from: filters.from || null,
                to: filters.to || null,
                institution: filters.institution || null,
                status: filters.status || null,
                recordCount,
            }),
        }]);
    } catch (error) {
        console.error('Report export audit log failed:', error);
    }
}
