import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CircularProgress,
    InputAdornment,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
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

export default function AdminStudents() {
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (admin) loadStudents();
    }, [admin]);

    useAutoRefresh(() => loadStudents(true), [admin]);

    const loadStudents = async (silent = false) => {
        if (!silent) setLoading(true); setError('');
        try {
            const res = await api.get('/admin/applications');
            setApplications(res.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load student directory.');
        } finally { setLoading(false); }
    };

    /* De-duplicate by student_id — keep latest application per student */
    const students = useMemo(() => {
        const seen = new Map();
        const counts = {};
        for (const app of applications) {
            const key = app.student_id;
            counts[key] = (counts[key] || 0) + 1;
            if (!seen.has(key) || new Date(app.created_at) > new Date(seen.get(key).created_at)) {
                seen.set(key, app);
            }
        }
        return Array.from(seen.values()).map((s) => ({ ...s, applicationCount: counts[s.student_id] || 1 }));
    }, [applications]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return students;
        return students.filter((s) =>
            String(s.student_name || '').toLowerCase().includes(term) ||
            String(s.college_name || '').toLowerCase().includes(term) ||
            String(s.district || '').toLowerCase().includes(term)
        );
    }, [students, search]);

    const handleNavigate = (path) => navigate(path);

    return (
        <AdminShell admin={admin} activePage="students" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3.5}>
                <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                        Students
                    </Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#64748b', mt: 0.25 }}>
                        Student directory for your assigned jurisdiction.
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}

                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    {/* Search bar */}
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            placeholder="Search by name, institution, or district…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                            sx={{ maxWidth: 380, '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }}
                        />
                        {!loading && (
                            <Typography sx={{ fontSize: 12.5, color: '#64748b', ml: 'auto' }}>
                                {filtered.length} of {students.length} student{students.length !== 1 ? 's' : ''}
                            </Typography>
                        )}
                    </Box>

                    {loading ? (
                        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={28} thickness={3} />
                        </Box>
                    ) : filtered.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <PersonOutlineIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                            <Typography sx={{ color: '#94a3b8', fontSize: 13.5, fontWeight: 600 }}>
                                {students.length === 0 ? 'No student records found.' : 'No students match your search.'}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        {['Student Name', 'Institution', 'District', 'Applications', 'Status', 'Profile'].map((h) => (
                                            <TableCell
                                                key={h}
                                                align={h === 'Profile' ? 'right' : 'left'}
                                                sx={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', py: 1.5, borderBottom: '1px solid #f1f5f9' }}
                                            >
                                                {h}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.map((row) => (
                                        <TableRow
                                            key={row.student_id}
                                            hover
                                            sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9', py: 1.4 } }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#1d4ed8', fontSize: 11, fontWeight: 800 }}>
                                                        {(row.student_name || 'S').slice(0, 2).toUpperCase()}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{row.student_name || '-'}</Typography>
                                                        {row.student_email && (
                                                            <Typography sx={{ fontSize: 11.5, color: '#94a3b8' }}>{row.student_email}</Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#475569' }}>{row.college_name || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#475569' }}>{row.district || '-'}</TableCell>
                                            <TableCell>
                                                <Box
                                                    component="span"
                                                    sx={{ display: 'inline-block', px: 1.25, py: 0.35, borderRadius: '4px', fontSize: 12, fontWeight: 800, bgcolor: '#f1f5f9', color: '#0f172a' }}
                                                >
                                                    {row.applicationCount}
                                                </Box>
                                            </TableCell>
                                            <TableCell><StatusBadge status={row.status} /></TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    endIcon={<ArrowForwardIosIcon sx={{ fontSize: 10 }} />}
                                                    onClick={() => navigate(`/admin/students/${row.student_id}`)}
                                                    sx={{
                                                        textTransform: 'none', fontSize: 12, fontWeight: 600,
                                                        color: '#1d4ed8', border: '1px solid #bfdbfe',
                                                        borderRadius: '6px', py: 0.4, px: 1.25,
                                                        bgcolor: '#eff6ff',
                                                        '&:hover': { bgcolor: '#dbeafe' },
                                                    }}
                                                >
                                                    View Profile
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
