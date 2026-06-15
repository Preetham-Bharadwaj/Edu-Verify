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
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import AdminShell from '../components/admin/AdminShell';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

function ageDiff(createdAt) {
    if (!createdAt) return 0;
    return Math.floor((Date.now() - new Date(createdAt)) / 86400000);
}

function verificationStage(row) {
    if (row.status === 'Hold') return 'On Hold — Awaiting Info';
    const diff = ageDiff(row.created_at);
    if (diff >= 7) return 'Overdue — Priority Review';
    if (diff >= 3) return 'In Progress — Aging';
    return 'In Progress — New';
}

function AgingBadge({ createdAt }) {
    const diff = ageDiff(createdAt);
    let label, bg, color;
    if (diff >= 7)       { label = `${diff}d — Overdue`; bg = '#fee2e2'; color = '#b91c1c'; }
    else if (diff >= 3)  { label = `${diff}d — Aging`;   bg = '#fef3c7'; color = '#92400e'; }
    else if (diff === 0) { label = 'Today';               bg = '#dcfce7'; color = '#15803d'; }
    else                 { label = `${diff}d ago`;        bg = '#f0fdf4'; color = '#166534'; }
    return (
        <Box component="span" sx={{ display: 'inline-block', px: 1.25, py: 0.35, borderRadius: '4px', fontSize: 11.5, fontWeight: 700, bgcolor: bg, color }}>
            {label}
        </Box>
    );
}

export default function AdminVerifications() {
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchInput, setSearchInput]   = useState('');
    const [agingFilter, setAgingFilter]   = useState('All');

    useEffect(() => {
        if (admin) loadApplications();
    }, [admin]);

    useAutoRefresh(() => loadApplications(true), [admin]);

    const loadApplications = async (silent = false) => {
        if (!silent) setLoading(true); setError('');
        try {
            const res = await api.get('/admin/applications');
            const pending = (res.data || []).filter((a) => !['Approved', 'Rejected'].includes(a.status));
            setQueue(pending);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load verifications.');
        } finally { setLoading(false); }
    };

    const filtered = useMemo(() => {
        return queue.filter((row) => {
            const term = searchInput.trim().toLowerCase();
            const matchName = !term || String(row.student_name || '').toLowerCase().includes(term);
            const diff = ageDiff(row.created_at);
            let matchAging = true;
            if (agingFilter === 'New')     matchAging = diff < 3;
            if (agingFilter === 'Aging')   matchAging = diff >= 3 && diff < 7;
            if (agingFilter === 'Overdue') matchAging = diff >= 7;
            return matchName && matchAging;
        });
    }, [queue, searchInput, agingFilter]);

    /* ─── Summary counts ─── */
    const overdue = queue.filter((r) => ageDiff(r.created_at) >= 7).length;
    const aging   = queue.filter((r) => { const d = ageDiff(r.created_at); return d >= 3 && d < 7; }).length;
    const onHold  = queue.filter((r) => r.status === 'Hold').length;

    const handleNavigate = (path) => navigate(path);

    return (
        <AdminShell admin={admin} activePage="verifications" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3.5}>
                <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                        Verifications
                    </Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#64748b', mt: 0.25 }}>
                        Applications currently under review. Finalized decisions are excluded.
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}

                {/* Summary stat row — only when data exists */}
                {!loading && queue.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {[
                            { label: 'In Queue',         value: queue.length,  bg: '#f8fafc', border: '#e2e8f0',   color: '#0f172a' },
                            { label: 'Overdue (7+ days)', value: overdue,      bg: '#fff1f2', border: '#fecdd3',   color: '#b91c1c' },
                            { label: 'Aging (3–6 days)',  value: aging,        bg: '#fffbeb', border: '#fde68a',   color: '#92400e' },
                            { label: 'On Hold',           value: onHold,       bg: '#faf5ff', border: '#ddd6fe',   color: '#7c3aed' },
                        ].map((s) => (
                            <Card
                                key={s.label}
                                sx={{ flex: '1 1 140px', bgcolor: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', boxShadow: 'none' }}
                            >
                                <Box sx={{ px: 2, py: 1.75 }}>
                                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                                    <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', mt: 0.5 }}>{s.label}</Typography>
                                </Box>
                            </Card>
                        ))}
                    </Box>
                )}

                {/* ── Table Card ── */}
                <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    {/* Filters */}
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Search student name…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }}
                        />
                        <TextField
                            select size="small"
                            value={agingFilter}
                            onChange={(e) => setAgingFilter(e.target.value)}
                            sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }}
                        >
                            <MenuItem value="All">All Ages</MenuItem>
                            <MenuItem value="New">New (0–2 days)</MenuItem>
                            <MenuItem value="Aging">Aging (3–6 days)</MenuItem>
                            <MenuItem value="Overdue">Overdue (7+ days)</MenuItem>
                        </TextField>
                        <Button
                            onClick={() => { setSearchInput(''); setAgingFilter('All'); }}
                            sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', py: 0.6, px: 1.5, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                            Clear
                        </Button>
                        {!loading && (
                            <Typography sx={{ fontSize: 12.5, color: '#64748b', ml: 'auto' }}>
                                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                            </Typography>
                        )}
                    </Box>

                    {loading ? (
                        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={28} thickness={3} />
                        </Box>
                    ) : filtered.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <HourglassEmptyOutlinedIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1 }} />
                            <Typography sx={{ color: '#94a3b8', fontSize: 13.5, fontWeight: 600 }}>
                                {queue.length === 0 ? 'No applications are currently under review.' : 'No results match your filters.'}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                        {['Application ID', 'Student Name', 'Verification Stage', 'Assigned Admin', 'Submitted', 'Aging', 'Action'].map((h) => (
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
                                    {filtered.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{ '&:hover': { bgcolor: '#f8fafc' }, '& td': { borderBottom: '1px solid #f1f5f9', py: 1.4 } }}
                                        >
                                            <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{row.application_number}</TableCell>
                                            <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{row.student_name || '-'}</TableCell>
                                            <TableCell sx={{ fontSize: 12.5, color: '#475569' }}>{verificationStage(row)}</TableCell>
                                            <TableCell sx={{ fontSize: 12.5, color: '#64748b' }}>
                                                {row.assigned_admin ? String(row.assigned_admin).slice(0, 10) + '…' : 'Unassigned'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: 13, color: '#64748b' }}>
                                                {row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell><AgingBadge createdAt={row.created_at} /></TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 14 }} />}
                                                    onClick={() => navigate(`/admin/applications/${row.id}`)}
                                                    sx={{
                                                        textTransform: 'none', fontSize: 12, fontWeight: 600,
                                                        color: '#1d4ed8', border: '1px solid #bfdbfe',
                                                        borderRadius: '6px', py: 0.4, px: 1.25,
                                                        bgcolor: '#eff6ff',
                                                        '&:hover': { bgcolor: '#dbeafe' },
                                                    }}
                                                >
                                                    Review
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
