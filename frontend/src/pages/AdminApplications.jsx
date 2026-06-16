import React, { useEffect, useMemo, useState } from 'react';
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
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
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

function EligibilityBadge({ status }) {
    const isEligible = status === 'Eligible';
    return (
        <Box component="span" sx={{ display: 'inline-block', px: 1.25, py: 0.35, borderRadius: '4px', fontSize: 11, fontWeight: 600, bgcolor: isEligible ? '#dcfce7' : '#fee2e2', color: isEligible ? '#15803d' : '#b91c1c' }}>
            {status || 'Not Eligible'}
        </Box>
    );
}

export default function AdminApplications() {
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [studentInput, setStudentInput] = useState('');
    const [appIdInput, setAppIdInput] = useState('');
    const [institutionInput, setInstitutionInput] = useState('');
    const [statusInput, setStatusInput] = useState('All');
    const [dateInput, setDateInput] = useState('');
    const [activeFilters, setActiveFilters] = useState({ student: '', appId: '', institution: '', status: 'All', date: '' });

    useEffect(() => {
        if (admin) loadApplications();
    }, [admin]);

    useAutoRefresh(() => loadApplications(true), [admin]);

    const loadApplications = async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/applications');
            setQueue(res.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load applications.');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        setActiveFilters({ student: studentInput, appId: appIdInput, institution: institutionInput, status: statusInput, date: dateInput });
    };

    const handleClearFilters = () => {
        setStudentInput(''); setAppIdInput(''); setInstitutionInput(''); setStatusInput('All'); setDateInput('');
        setActiveFilters({ student: '', appId: '', institution: '', status: 'All', date: '' });
    };

    const filteredQueue = useMemo(() => {
        return queue.filter((row) => {
            const matchStudent = !activeFilters.student.trim() ||
                String(row.student_name || '').toLowerCase().includes(activeFilters.student.trim().toLowerCase());
            const matchAppId = !activeFilters.appId.trim() ||
                String(row.application_number || '').toLowerCase().includes(activeFilters.appId.trim().toLowerCase());
            const matchInstitution = !activeFilters.institution.trim() ||
                String(row.college_name || '').toLowerCase().includes(activeFilters.institution.trim().toLowerCase());
            const matchStatus = activeFilters.status === 'All' ? true
                : activeFilters.status === 'Pending' ? !['Approved', 'Rejected', 'Hold'].includes(row.status)
                : row.status === activeFilters.status;
            const rowDate = row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '';
            const matchDate = !activeFilters.date || rowDate === activeFilters.date;
            return matchStudent && matchAppId && matchInstitution && matchStatus && matchDate;
        });
    }, [queue, activeFilters]);

    const handleNavigate = (path) => navigate(path);

    return (
        <AdminShell admin={admin} activePage="applications" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3}>
                <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Applications</Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#64748b', mt: 0.25 }}>Review and process scholarship applications.</Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}

                {/* Filter Bar */}
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', p: 2.5 }}>
                    <Grid container spacing={2} sx={{ alignItems: 'flex-end' }}>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2.5
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student Name</Typography>
                            <TextField fullWidth size="small" placeholder="Search student..." value={studentInput} onChange={(e) => setStudentInput(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Application ID</Typography>
                            <TextField fullWidth size="small" placeholder="Search ID..." value={appIdInput} onChange={(e) => setAppIdInput(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2.5
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Institution</Typography>
                            <TextField fullWidth size="small" placeholder="Institution name..." value={institutionInput} onChange={(e) => setInstitutionInput(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 2
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</Typography>
                            <TextField fullWidth select size="small" value={statusInput} onChange={(e) => setStatusInput(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }}>
                                <MenuItem value="All">All Status</MenuItem>
                                <MenuItem value="Pending">Pending</MenuItem>
                                <MenuItem value="Approved">Approved</MenuItem>
                                <MenuItem value="Rejected">Rejected</MenuItem>
                                <MenuItem value="Hold">Hold</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 1.5
                            }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mb: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</Typography>
                            <TextField fullWidth size="small" type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                        </Grid>
                        <Grid
                            size={{
                                xs: 12,
                                md: 1.5
                            }}>
                            <Stack direction="row" spacing={1}>
                                <Button variant="contained" startIcon={<FilterListIcon sx={{ fontSize: 15 }} />} onClick={handleApplyFilters}
                                    sx={{ bgcolor: '#1d4ed8', color: '#fff', textTransform: 'none', borderRadius: '7px', fontSize: 13, fontWeight: 600, py: 0.9, boxShadow: 'none', '&:hover': { bgcolor: '#1e40af', boxShadow: 'none' }, flex: 1 }}>
                                    Apply
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<ClearAllIcon sx={{ fontSize: 15 }} />}
                                    onClick={handleClearFilters}
                                    sx={{
                                        textTransform: 'none',
                                        borderRadius: '7px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        py: 0.9,
                                        color: '#475569',
                                        borderColor: '#e2e8f0',
                                        flex: 1,
                                        '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                                    }}
                                >
                                    Clear
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Card>

                {/* Applications Table */}
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Applications</Typography>
                        {!loading && <Typography sx={{ fontSize: 12.5, color: '#64748b' }}>{filteredQueue.length} result{filteredQueue.length !== 1 ? 's' : ''}</Typography>}
                    </Box>
                    {loading ? (
                        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} thickness={3} /></Box>
                    ) : filteredQueue.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <InboxOutlinedIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                            <Typography sx={{ color: '#94a3b8', fontSize: 13.5, fontWeight: 600 }}>No applications match current filters.</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        {['Application ID', 'Student Name', 'College', 'Combined Income', 'Income Status', 'App Year', 'Auto Eligibility', 'Status', 'Submitted Date', 'Action'].map((h) => (
                                            <TableCell key={h} align={h === 'Action' ? 'right' : 'left'}
                                                sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredQueue.map((row) => (
                                        <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9', py: 1.4 } }}>
                                            <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{row.application_number}</TableCell>
                                            <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{row.student_name || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#475569' }}>{row.college_name || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                                                {row.combined_family_income != null
                                                    ? `₹${Number(row.combined_family_income).toLocaleString('en-IN')}`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 12, color: row.income_verification_status?.includes('Eligible') && !row.income_verification_status?.includes('Not') ? '#15803d' : '#b91c1c' }}>
                                                {row.income_verification_status || '-'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#475569' }}>{row.application_year || new Date(row.created_at).getFullYear()}</TableCell>
                                            <TableCell><EligibilityBadge status={row.auto_eligibility_status} /></TableCell>
                                            <TableCell><StatusBadge status={row.status} /></TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#64748b' }}>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
                                                    onClick={() => navigate(`/admin/applications/${row.id}`)}
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
            </Stack>
        </AdminShell>
    );
}