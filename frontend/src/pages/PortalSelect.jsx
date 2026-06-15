import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    IconButton,
    Divider,
} from '@mui/material';
import SchoolIcon             from '@mui/icons-material/School';
import AdminPanelSettingsIcon  from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon   from '@mui/icons-material/SupervisorAccount';
import ArrowBackIcon           from '@mui/icons-material/ArrowBack';
import LockIcon                from '@mui/icons-material/Lock';

const NAVY  = '#0b2a5c';
const BG    = '#f8fafd';
const MUTED = '#627d98';
const BORDER = '#e2e8f0';

const PORTALS = [
    {
        accentColor: '#52c41a',
        iconBg: '#e8f5e9',
        icon: <SchoolIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
        title: 'Student Portal',
        desc: 'Apply for scholarships and track your application status in real time.',
        actions: [
            { label: 'Login',   path: '/student/login',  variant: 'contained' },
            { label: 'Sign Up', path: '/student/signup', variant: 'outlined'  },
        ],
    },
    {
        accentColor: '#ed6c02',
        iconBg: '#fff3e0',
        icon: <AdminPanelSettingsIcon sx={{ fontSize: 40, color: '#e65100' }} />,
        title: 'Admin Portal',
        desc: 'Review submitted applications, verify eligibility and process approvals.',
        actions: [
            { label: 'Login',          path: '/admin/login',   variant: 'contained' },
            { label: 'Request Access', path: '/admin/request', variant: 'outlined'  },
        ],
    },
    {
        accentColor: NAVY,
        iconBg: '#e1f5fe',
        icon: <SupervisorAccountIcon sx={{ fontSize: 40, color: '#0288d1' }} />,
        title: 'Supervisor Portal',
        desc: 'Manage regional admins, monitor applications and review audit logs.',
        badge: 'Authorised Personnel Only',
        actions: [
            { label: 'Login', path: '/supervisor/login', variant: 'contained' },
        ],
    },
];

export default function PortalSelect() {
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: BG, display: 'flex', flexDirection: 'column' }}>
            {/* ─── Minimal top bar ─── */}
            <Box sx={{ bgcolor: 'white', borderBottom: `1px solid ${BORDER}`, py: 1.5, px: { xs: 2, md: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, mx: 'auto' }}>
                    {/* Brand */}
                    <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                        onClick={() => navigate('/')}
                    >
                        <Box sx={{ bgcolor: NAVY, borderRadius: '50%', p: 0.7, display: 'flex' }}>
                            <SchoolIcon sx={{ color: 'white', fontSize: 18 }} />
                        </Box>
                        <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 16 }}>EduVerify</Typography>
                    </Box>

                    <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: NAVY }}>
                        <ArrowBackIcon fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600, color: NAVY, display: { xs: 'none', sm: 'block' } }}>
                            Back
                        </Typography>
                    </IconButton>
                </Box>
            </Box>
            {/* ─── Main content ─── */}
            <Box sx={{ flexGrow: 1, py: { xs: 5, md: 8 } }}>
                <Container maxWidth="lg">
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 900, color: NAVY,
                                fontSize: { xs: '1.8rem', md: '2.5rem' },
                                mb: 1.5,
                            }}
                        >
                            Choose Your Portal
                        </Typography>
                        <Typography sx={{ color: MUTED, fontSize: '1.05rem', maxWidth: 460, mx: 'auto' }}>
                            Select the portal that matches your role to log in or register.
                        </Typography>
                    </Box>

                    {/* Portal Cards */}
                    <Grid container spacing={{ xs: 3, md: 4 }} justifyContent="center">
                        {PORTALS.map((p) => (
                            <Grid
                                key={p.title}
                                size={{
                                    xs: 12,
                                    sm: 10,
                                    md: 4
                                }}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        height: '100%',
                                        borderTop: `4px solid ${p.accentColor}`,
                                        border: `1px solid ${BORDER}`,
                                        borderRadius: 2,
                                        transition: 'box-shadow 0.2s, transform 0.2s',
                                        '&:hover': {
                                            boxShadow: '0 10px 32px rgba(11,42,92,0.13)',
                                            transform: 'translateY(-4px)',
                                        },
                                    }}
                                >
                                    <CardContent
                                        sx={{
                                            p: { xs: 3.5, sm: 4 },
                                            display: 'flex',
                                            flexDirection: 'column',
                                            height: '100%',
                                        }}
                                    >
                                        {/* Icon */}
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                bgcolor: p.iconBg,
                                                p: 1.8,
                                                borderRadius: '50%',
                                                mb: 2.5,
                                                width: 'fit-content',
                                            }}
                                        >
                                            {p.icon}
                                        </Box>

                                        {/* Title */}
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f1e36', mb: 1 }}>
                                            {p.title}
                                        </Typography>

                                        {/* Badge (Supervisor only) */}
                                        {p.badge && (
                                            <Box
                                                sx={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 0.6,
                                                    bgcolor: '#fff3e0', borderRadius: 10, px: 1.2, py: 0.3,
                                                    mb: 1.5, width: 'fit-content',
                                                }}
                                            >
                                                <LockIcon sx={{ fontSize: 11, color: '#e65100' }} />
                                                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700, color: '#e65100' }}>
                                                    {p.badge}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Description */}
                                        <Typography
                                            variant="body2"
                                            sx={{ color: MUTED, mb: 4, flexGrow: 1, lineHeight: 1.75 }}
                                        >
                                            {p.desc}
                                        </Typography>

                                        <Divider sx={{ mb: 3 }} />

                                        {/* Action Buttons */}
                                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                            {p.actions.map((a) => (
                                                <Button
                                                    key={a.label}
                                                    variant={a.variant}
                                                    fullWidth={p.actions.length === 1}
                                                    onClick={() => navigate(a.path)}
                                                    sx={{
                                                        fontWeight: 700,
                                                        py: 1.1,
                                                        flex: p.actions.length > 1 ? 1 : 'unset',
                                                        ...(a.variant === 'contained'
                                                            ? { bgcolor: NAVY, '&:hover': { bgcolor: '#163d7a' } }
                                                            : {
                                                                borderColor: BORDER,
                                                                color: '#0f1e36',
                                                                '&:hover': { borderColor: '#94a3b8' },
                                                            }),
                                                    }}
                                                >
                                                    {a.label}
                                                </Button>
                                            ))}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
            {/* ─── Minimal footer ─── */}
            <Box sx={{ bgcolor: '#0a1f47', py: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                    © {new Date().getFullYear()} EduVerify — Government of India. All rights reserved.
                </Typography>
            </Box>
        </Box>
    );
}
