import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
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
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import HistoryIcon from '@mui/icons-material/History';
import AdminShell from '../components/admin/AdminShell';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

function StatusBadge({ status }) {
    const map = {
        Approved: { label: 'Approved', bg: '#dcfce7', color: '#15803d' },
        Rejected: { label: 'Rejected', bg: '#fee2e2', color: '#b91c1c' },
        Hold:     { label: 'Hold',     bg: '#fef3c7', color: '#92400e' },
    };
    const cfg = map[status] || { label: status || 'Pending', bg: '#dbeafe', color: '#1d4ed8' };
    return (
        <Box component="span" sx={{ display: 'inline-block', px: 1.25, py: 0.35, borderRadius: '4px', fontSize: 11.5, fontWeight: 700, bgcolor: cfg.bg, color: cfg.color }}>
            {cfg.label}
        </Box>
    );
}

function MetricCard({ label, value, icon, iconBg, valueColor, loading }) {
    return (
        <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Box sx={{ p: '20px' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', mb: 1 }}>
                            {label}
                        </Typography>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: valueColor || '#0f172a', lineHeight: 1 }}>
                            {loading ? '—' : value}
                        </Typography>
                    </Box>
                    <Box sx={{ width: 40, height: 40, borderRadius: '8px', bgcolor: iconBg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        {icon}
                    </Box>
                </Box>
            </Box>
        </Card>
    );
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [summary, setSummary] = useState({ totalApplications: 0, pendingReview: 0, approved: 0, rejected: 0 });
    const [queue, setQueue] = useState([]);
    const [recentDecisions, setRecentDecisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (admin) loadDashboard();
    }, [admin]);

    useAutoRefresh(() => loadDashboard(true), [admin]);

    const loadDashboard = async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const [queueRes, summaryRes] = await Promise.allSettled([
                api.get('/admin/applications'),
                api.get('/admin/dashboard-summary'),
            ]);
            if (queueRes.status === 'fulfilled') setQueue(queueRes.value.data || []);
            else setError(queueRes.reason?.response?.data?.message || 'Failed to load applications.');

            if (summaryRes.status === 'fulfilled') {
                setSummary(summaryRes.value.data?.summary || { totalApplications: 0, pendingReview: 0, approved: 0, rejected: 0 });
                setRecentDecisions(summaryRes.value.data?.recentActivity || []);
            } else {
                setError(summaryRes.reason?.response?.data?.message || 'Failed to load summary.');
            }
        } catch { setError('Failed to load dashboard.'); }
        finally { setLoading(false); }
    };

    const handleNavigate = (path) => navigate(path);

    const pendingCount = summary.totalApplications - summary.approved - summary.rejected;
    const recentQueue = queue.slice(0, 5);

    return (
        <AdminShell admin={admin} activePage="dashboard" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3}>
                <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Dashboard</Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#64748b', mt: 0.25 }}>Overview of scholarship applications.</Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}

                {/* Metric Cards */}
                <Grid container spacing={2}>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                            lg: 3
                        }}>
                        <MetricCard label="Total Applications" value={summary.totalApplications}
                            icon={<AssignmentOutlinedIcon sx={{ fontSize: 18, color: '#1d4ed8' }} />} iconBg="#dbeafe" loading={loading} />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                            lg: 3
                        }}>
                        <MetricCard label="Pending Applications" value={pendingCount > 0 ? pendingCount : 0}
                            icon={<PendingActionsOutlinedIcon sx={{ fontSize: 18, color: '#d97706' }} />} iconBg="#fef3c7" valueColor="#d97706" loading={loading} />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                            lg: 3
                        }}>
                        <MetricCard label="Approved Applications" value={summary.approved}
                            icon={<CheckCircleOutlinedIcon sx={{ fontSize: 18, color: '#15803d' }} />} iconBg="#dcfce7" valueColor="#15803d" loading={loading} />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                            lg: 3
                        }}>
                        <MetricCard label="Rejected Applications" value={summary.rejected}
                            icon={<CancelOutlinedIcon sx={{ fontSize: 18, color: '#b91c1c' }} />} iconBg="#fee2e2" valueColor="#b91c1c" loading={loading} />
                    </Grid>
                </Grid>

                <Grid container spacing={3}>
                    {/* Recent Applications Table */}
                    <Grid
                        size={{
                            xs: 12,
                            lg: 8
                        }}>
                        <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Recent Applications</Typography>
                                <Button size="small" onClick={() => navigate('/admin/applications')} sx={{ textTransform: 'none', fontSize: 12.5, color: '#1d4ed8', fontWeight: 600, px: 1 }}>View All</Button>
                            </Box>
                            {loading ? (
                                <Box sx={{ py: 7, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} thickness={3} /></Box>
                            ) : recentQueue.length === 0 ? (
                                <Box sx={{ py: 7, textAlign: 'center' }}>
                                    <InboxOutlinedIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                                    <Typography sx={{ color: '#94a3b8', fontSize: 13.5, fontWeight: 600 }}>No applications found.</Typography>
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                                {['Application ID', 'Student Name', 'College', 'Status', 'Date', 'Action'].map((h) => (
                                                    <TableCell key={h} align={h === 'Action' ? 'right' : 'left'}
                                                        sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {recentQueue.map((app) => (
                                                <TableRow key={app.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9', py: 1.5 } }}>
                                                    <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{app.application_number}</TableCell>
                                                    <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{app.student_name || '-'}</TableCell>
                                                    <TableCell sx={{ fontSize: 13, color: '#475569' }}>{app.college_name || '-'}</TableCell>
                                                    <TableCell><StatusBadge status={app.status} /></TableCell>
                                                    <TableCell sx={{ fontSize: 13, color: '#64748b' }}>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell align="right">
                                                        <Button
                                                            size="small"
                                                            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
                                                            onClick={() => navigate(`/admin/applications/${app.id}`)}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: '#475569',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '6px',
                                                                py: 0.4,
                                                                px: 1.25,
                                                                '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
                                                            }}
                                                        >
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Card>
                    </Grid>

                    {/* Recent Decisions Panel */}
                    <Grid
                        size={{
                            xs: 12,
                            lg: 4
                        }}>
                        <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', height: '100%' }}>
                            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <HistoryIcon sx={{ fontSize: 18, color: '#1d4ed8' }} />
                                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Recent Decisions</Typography>
                            </Box>
                            {loading ? (
                                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} thickness={3} /></Box>
                            ) : recentDecisions.length === 0 ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>No recent decisions.</Typography>
                                </Box>
                            ) : (
                                <Box sx={{ p: 2, maxHeight: 340, overflowY: 'auto' }}>
                                    <Stack spacing={1.5}>
                                        {recentDecisions.slice(0, 8).map((decision, idx) => (
                                            <Box key={idx} sx={{ p: 1.5, border: '1px solid #f1f5f9', borderRadius: '8px', bgcolor: '#fafafa', '&:hover': { bgcolor: '#f8fafc' } }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{decision.action || 'Decision'}</Typography>
                                                    <StatusBadge status={decision.status || decision.action} />
                                                </Box>
                                                <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
                                                    {decision.date ? new Date(decision.date).toLocaleDateString() : ''}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Card>
                    </Grid>
                </Grid>
            </Stack>
        </AdminShell>
    );
}