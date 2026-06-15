import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CircularProgress,
    Divider,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AdminShell from '../components/admin/AdminShell';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

function StatusBadge({ status }) {
    const map = {
        Approved: { label: 'Approved', bg: '#dcfce7', color: '#15803d' },
        Rejected: { label: 'Rejected', bg: '#fee2e2', color: '#b91c1c' },
        Hold:     { label: 'On Hold',  bg: '#fef3c7', color: '#92400e' },
    };
    const cfg = map[status] || { label: 'Pending', bg: '#dbeafe', color: '#1d4ed8' };
    return (
        <Box component="span" sx={{ display: 'inline-block', px: 1.25, py: 0.35, borderRadius: '4px', fontSize: 11.5, fontWeight: 700, bgcolor: cfg.bg, color: cfg.color }}>
            {cfg.label}
        </Box>
    );
}

function KV({ label, value }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ py: 1.1 }}>
            <Typography sx={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, minWidth: 130 }}>{label}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textAlign: 'right', ml: 1 }}>{value || '—'}</Typography>
        </Stack>
    );
}

export default function AdminStudentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [allApplications, setAllApplications] = useState([]);
    const [verificationHistory, setVerificationHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (admin) loadData();
    }, [id, admin]);

    useAutoRefresh(() => loadData(true), [id, admin]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true); setError('');
        try {
            const res = await api.get('/admin/applications');
            const apps = (res.data || []).filter((a) => String(a.student_id) === String(id));
            setAllApplications(apps);

            const historyEntries = [];
            for (const app of apps) {
                try {
                    const bundleRes = await api.get(`/admin/applications/${app.id}`);
                    const logs = bundleRes.data?.recentAuditLogs || [];
                    logs.forEach((log) => historyEntries.push({
                        applicationNumber: app.application_number,
                        action: log.action,
                        remarks: log.remarks || '',
                        date: log.created_at,
                    }));
                } catch { /* skip if bundle fails */ }
            }
            historyEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            setVerificationHistory(historyEntries);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load student profile.');
        } finally { setLoading(false); }
    };

    const studentInfo = useMemo(() => {
        if (!allApplications.length) return null;
        const latest = [...allApplications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        return {
            name: latest.student_name || '-',
            email: latest.student_email || '-',
            institution: latest.college_name || '-',
            district: latest.district || '-',
            region: latest.region || '-',
            rollNumber: latest.student_roll_number || '-',
        };
    }, [allApplications]);

    const stats = useMemo(() => {
        const total    = allApplications.length;
        const approved = allApplications.filter((a) => a.status === 'Approved').length;
        const rejected = allApplications.filter((a) => a.status === 'Rejected').length;
        const pending  = total - approved - rejected;
        return { total, approved, rejected, pending };
    }, [allApplications]);

    const handleNavigate = (path) => navigate(path);

    return (
        <AdminShell admin={admin} activePage="students" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button
                        size="small"
                        startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                        onClick={() => navigate('/admin/students')}
                        sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', py: 0.5, px: 1.25, '&:hover': { bgcolor: '#f8fafc' } }}
                    >
                        Back to Directory
                    </Button>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                        Student Profile
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}

                {loading ? (
                    <Box sx={{ py: 12, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={32} thickness={3} />
                    </Box>
                ) : allApplications.length === 0 ? (
                    <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: 13.5, fontWeight: 600 }}>
                                No application data found for this student.
                            </Typography>
                        </Box>
                    </Card>
                ) : (
                    <Grid container spacing={3}>
                        {/* ── Left Column ── */}
                        <Grid
                            size={{
                                xs: 12,
                                lg: 4
                            }}>
                            <Stack spacing={2.5}>
                                {/* Identity card */}
                                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <Box sx={{ p: 3, textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                        <Avatar sx={{ width: 64, height: 64, bgcolor: '#1d4ed8', fontSize: 20, fontWeight: 800, mx: 'auto', mb: 1.5 }}>
                                            {(studentInfo?.name || 'S').slice(0, 2).toUpperCase()}
                                        </Avatar>
                                        <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{studentInfo?.name}</Typography>
                                        <Typography sx={{ fontSize: 12.5, color: '#94a3b8', mt: 0.35 }}>{studentInfo?.email}</Typography>
                                    </Box>
                                    <Box sx={{ px: 2.5, py: 1 }}>
                                        <KV label="Roll Number"  value={studentInfo?.rollNumber} />
                                        <Divider light />
                                        <KV label="Institution"  value={studentInfo?.institution} />
                                        <Divider light />
                                        <KV label="District"     value={studentInfo?.district} />
                                        <Divider light />
                                        <KV label="Region"       value={studentInfo?.region} />
                                    </Box>
                                </Card>

                                {/* Summary stats */}
                                {stats.total > 0 && (
                                    <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                        <Box sx={{ px: 2.5, pt: 2.25, pb: 1.25, borderBottom: '1px solid #f1f5f9' }}>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Application Summary</Typography>
                                        </Box>
                                        <Box sx={{ p: 2 }}>
                                            <Grid container spacing={1.5}>
                                                {[
                                                    { label: 'Total',    value: stats.total,    color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
                                                    { label: 'Approved', value: stats.approved, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                                                    { label: 'Rejected', value: stats.rejected, color: '#b91c1c', bg: '#fff1f2', border: '#fecdd3' },
                                                    { label: 'Pending',  value: stats.pending,  color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
                                                ].map((s) => (
                                                    <Grid key={s.label} size={6}>
                                                        <Box sx={{ p: 1.5, border: `1px solid ${s.border}`, borderRadius: '8px', bgcolor: s.bg, textAlign: 'center' }}>
                                                            <Typography sx={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                                                            <Typography sx={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, mt: 0.5 }}>{s.label}</Typography>
                                                        </Box>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    </Card>
                                )}
                            </Stack>
                        </Grid>

                        {/* ── Right Column ── */}
                        <Grid
                            size={{
                                xs: 12,
                                lg: 8
                            }}>
                            <Stack spacing={2.5}>
                                {/* Application History */}
                                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AssignmentOutlinedIcon sx={{ fontSize: 17, color: '#1d4ed8' }} />
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Application History</Typography>
                                    </Box>
                                    <TableContainer>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                    {['Application ID', 'Submitted', 'Status', 'Remarks', 'Action'].map((h) => (
                                                        <TableCell
                                                            key={h}
                                                            align={h === 'Action' ? 'right' : 'left'}
                                                            sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5, borderBottom: '1px solid #f1f5f9' }}
                                                        >
                                                            {h}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {[...allApplications]
                                                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                                    .map((app) => (
                                                        <TableRow key={app.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9', py: 1.4 } }}>
                                                            <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{app.application_number}</TableCell>
                                                            <TableCell sx={{ fontSize: 13, color: '#64748b' }}>
                                                                {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                                                            </TableCell>
                                                            <TableCell><StatusBadge status={app.status} /></TableCell>
                                                            <TableCell sx={{ maxWidth: 200 }}>
                                                                <Typography sx={{ fontSize: 12, color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                    {app.rejection_reason || app.hold_reason || app.override_reason || '—'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Button
                                                                    size="small"
                                                                    onClick={() => navigate(`/admin/applications/${app.id}`)}
                                                                    sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600, color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', py: 0.4, px: 1.25, bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}
                                                                >
                                                                    Review
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Card>

                                {/* Verification History — only if real audit data exists */}
                                {verificationHistory.length > 0 && (
                                    <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                        <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <HistoryOutlinedIcon sx={{ fontSize: 17, color: '#1d4ed8' }} />
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Verification History</Typography>
                                        </Box>
                                        <Box sx={{ px: 2.5, py: 1.5 }}>
                                            <Stack spacing={0}>
                                                {verificationHistory.map((entry, idx) => (
                                                    <Box key={idx}>
                                                        <Box sx={{ display: 'flex', gap: 1.75, py: 1.5 }}>
                                                            <Box sx={{ pt: 0.65, flexShrink: 0 }}>
                                                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#1d4ed8' }} />
                                                            </Box>
                                                            <Box sx={{ flexGrow: 1 }}>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                                                                    <Box>
                                                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{entry.action}</Typography>
                                                                        {entry.remarks && (
                                                                            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.25 }}>{entry.remarks}</Typography>
                                                                        )}
                                                                    </Box>
                                                                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                                                        <Typography sx={{ fontSize: 11.5, color: '#94a3b8', fontFamily: 'monospace' }}>
                                                                            {entry.applicationNumber}
                                                                        </Typography>
                                                                        <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>
                                                                            {entry.date ? new Date(entry.date).toLocaleDateString() : ''}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                        {idx < verificationHistory.length - 1 && <Divider light />}
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Box>
                                    </Card>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                )}
            </Stack>
        </AdminShell>
    );
}
