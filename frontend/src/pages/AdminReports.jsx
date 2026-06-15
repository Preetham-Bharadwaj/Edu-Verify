import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Grid,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AdminShell from '../components/admin/AdminShell';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

const REPORT_TYPES = [
    { key: 'applications', label: 'Applications Report', description: 'All submitted applications with student and institution details.' },
    { key: 'approved',     label: 'Approved Report',    description: 'Approved applications with decision dates and remarks.' },
    { key: 'rejected',    label: 'Rejected Report',    description: 'Rejected applications grouped by rejection reason.' },
    { key: 'pending',     label: 'Pending Report',     description: 'Pending applications awaiting decision.' },
    { key: 'institution', label: 'Institution-wise Report', description: 'Applications grouped by school and college.' },
];

export default function AdminReports() {
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(null);
    const [reportHistory, setReportHistory] = useState([]);
    const [stats, setStats] = useState(null);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [institutionFilter, setInstitutionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        if (admin) loadData();
    }, [admin]);

    useAutoRefresh(() => loadData(true), [admin]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true); setError('');
        try {
            const [statsRes, historyRes] = await Promise.allSettled([
                api.get('/admin/reports'),
                api.get('/admin/report-history'),
            ]);
            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data?.stats);
            } else {
                setError(statsRes.reason?.response?.data?.message || 'Failed to load reports data.');
            }
            if (historyRes.status === 'fulfilled') {
                setReportHistory(historyRes.value.data || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load reports data.');
        } finally { setLoading(false); }
    };

    const handleExport = async (reportKey, format) => {
        const exportId = `${reportKey}-${format}`;
        setExporting(exportId);
        try {
            const params = { type: reportKey, format };
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            if (institutionFilter) params.institution = institutionFilter;
            if (statusFilter !== 'All') params.status = statusFilter;

            const response = await api.get('/reports/export', { params, responseType: 'blob' });
            const mimeMap = {
                pdf: 'application/pdf',
                excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                csv: 'text/csv',
            };
            const extensionMap = {
                pdf: 'pdf',
                excel: 'xlsx',
                csv: 'csv',
            };
            const blob = new Blob([response.data], { type: mimeMap[format] || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportKey}-report.${extensionMap[format]}`;
            a.click();
            window.URL.revokeObjectURL(url);
            await loadData();
        } catch (err) {
            console.error('Export failed', err);
            setError('Failed to export report. Please try again.');
        } finally { setExporting(null); }
    };

    const handleNavigate = (path) => navigate(path);

    return (
        <AdminShell admin={admin} activePage="reports" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3}>
                <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Reports</Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#64748b', mt: 0.25 }}>Generate and export scholarship application reports.</Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}

                {/* Filters */}
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', p: 2.5 }}>
                    <Grid container spacing={2} sx={{ alignItems: 'flex-end' }}>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2.5
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date From</Typography>
                            <TextField fullWidth size="small" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2.5
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date To</Typography>
                            <TextField fullWidth size="small" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 3
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Institution</Typography>
                            <TextField fullWidth size="small" placeholder="Filter by institution..." value={institutionFilter} onChange={(e) => setInstitutionFilter(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</Typography>
                            <TextField fullWidth select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }}>
                                <MenuItem value="All">All Status</MenuItem>
                                <MenuItem value="Approved">Approved</MenuItem>
                                <MenuItem value="Rejected">Rejected</MenuItem>
                                <MenuItem value="Pending">Pending</MenuItem>
                                <MenuItem value="Hold">Hold</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                md: 2
                            }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => { setDateFrom(''); setDateTo(''); setInstitutionFilter(''); setStatusFilter('All'); }}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: '7px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    py: 0.9,
                                    color: '#475569',
                                    borderColor: '#e2e8f0',
                                    '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                                }}
                            >
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                </Card>

                {/* Report Generation Cards */}
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Generate Reports</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#64748b', mt: 0.25 }}>Exports contain application data only from the database. Filters above will be applied.</Typography>
                    </Box>
                    <Box sx={{ p: 2.5 }}>
                        <Stack spacing={1.5}>
                            {REPORT_TYPES.map((report) => (
                                <Box key={report.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, p: 2, border: '1px solid #f1f5f9', borderRadius: '8px', bgcolor: '#fafafa', '&:hover': { bgcolor: '#f8fafc', borderColor: '#e2e8f0' } }}>
                                    <Box>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{report.label}</Typography>
                                        <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>{report.description}</Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        {['csv', 'excel', 'pdf'].map((fmt) => (
                                            <Button
                                                key={fmt}
                                                size="small"
                                                startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 13 }} />}
                                                disabled={exporting === `${report.key}-${fmt}`}
                                                onClick={() => handleExport(report.key, fmt)}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    py: 0.5,
                                                    px: 1.25,
                                                    borderRadius: '6px',
                                                    ...(fmt === 'excel'
                                                        ? { bgcolor: '#1d4ed8', color: '#fff', border: '1px solid #1d4ed8', '&:hover': { bgcolor: '#1e40af' } }
                                                        : fmt === 'csv'
                                                            ? { color: '#0f766e', border: '1px solid #99f6e4', bgcolor: '#f0fdfa', '&:hover': { bgcolor: '#ccfbf1' } }
                                                            : { color: '#475569', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#f8fafc' } }
                                                    ),
                                                    '&:disabled': { opacity: 0.55 },
                                                }}
                                            >
                                                {fmt.toUpperCase()}
                                            </Button>
                                        ))}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Card>

                {/* Report History Table */}
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #f1f5f9' }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Report History</Typography>
                    </Box>
                    {loading ? (
                        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} thickness={3} /></Box>
                    ) : reportHistory.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No reports generated yet.</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        {['Report Name', 'Generated By', 'Date', 'Download'].map((h) => (
                                            <TableCell key={h} align={h === 'Download' ? 'right' : 'left'}
                                                sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {reportHistory.slice(0, 10).map((report, idx) => (
                                        <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9', py: 1.4 } }}>
                                            <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{report.name}</TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#475569' }}>{report.generatedBy || 'Admin'}</TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#64748b' }}>{report.date ? new Date(report.date).toLocaleDateString() : '-'}</TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 13 }} />}
                                                    onClick={() => handleExport(report.key, report.format)}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        color: '#1d4ed8',
                                                        border: '1px solid #bfdbfe',
                                                        borderRadius: '6px',
                                                        py: 0.4,
                                                        px: 1.25,
                                                        bgcolor: '#eff6ff',
                                                        '&:hover': { bgcolor: '#dbeafe' },
                                                    }}
                                                >
                                                    Download
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Card>
            </Stack>
        </AdminShell>
    );
}