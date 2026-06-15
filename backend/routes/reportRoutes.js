import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import {
    TYPE_LABELS,
    fetchReportApplications,
    prepareReportData,
    buildApplicationCsv,
    buildInstitutionCsv,
    buildExcelBuffer,
    sendPdf,
    logReportExport,
} from '../utils/reportExport.js';

const router = express.Router();

const VALID_TYPES = ['applications', 'approved', 'rejected', 'pending', 'institution'];
const VALID_FORMATS = ['csv', 'pdf', 'excel'];

router.get('/export', verifyToken, requireRole(['Admin', 'Supervisor']), async (req, res) => {
    const { type, format, from, to, institution, status } = req.query;

    if (!type || !format || !VALID_TYPES.includes(type) || !VALID_FORMATS.includes(format)) {
        return res.status(400).json({ message: 'Invalid type or format query parameters.' });
    }

    try {
        const filters = { from, to, institution, status };
        const allRecords = await fetchReportApplications(req.user);
        const reportData = prepareReportData(allRecords, type, filters);
        const generatedBy = req.user.name || 'Admin';
        const filename = `${type}_report_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;

        await logReportExport(req.user, type, format, filters, reportData.rows.length);

        if (format === 'csv') {
            const csv = reportData.isInstitution
                ? buildInstitutionCsv(reportData.rows)
                : buildApplicationCsv(reportData.rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(csv);
        }

        if (format === 'excel') {
            const buffer = await buildExcelBuffer(reportData);
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(Buffer.from(buffer));
        }

        if (format === 'pdf') {
            return sendPdf(res, { type, reportData, generatedBy, filters });
        }

        return res.status(400).json({ message: 'Unsupported export format.' });
    } catch (error) {
        console.error('Report Export Error:', error);
        res.status(500).json({ message: 'Internal server error generating export.' });
    }
});

export { TYPE_LABELS };
export default router;
