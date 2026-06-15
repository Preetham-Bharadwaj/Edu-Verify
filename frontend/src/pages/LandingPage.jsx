import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SchoolIcon from '@mui/icons-material/School';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import api from '../api';
import { writeSession } from '../utils/auth';

const HEADER_HEIGHT = 68;
const BLUE = '#2563eb';
const BLUE_DARK = '#1d4ed8';
const TEXT = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e5e7eb';

const HOW_IT_WORKS = [
    'Student Registration',
    'Scholarship Application Submission',
    'Automated Eligibility Verification',
    'Admin Review & Validation',
    'Final Scholarship Approval',
];

const DEMO_ACCOUNTS = [
    {
        title: 'Students',
        icon: <SchoolRoundedIcon sx={{ color: BLUE, fontSize: 24 }} />,
        accent: BLUE,
        accounts: [
            { label: 'Aditi Rao' },
            { label: 'Arjun Shetty' },
            { label: 'Kavya Naik' },
            { label: 'Rohan Kulkarni' },
            { label: 'Ananya Iyer' },
        ],
    },
    {
        title: 'Admins',
        icon: <AdminPanelSettingsRoundedIcon sx={{ color: '#7c3aed', fontSize: 24 }} />,
        accent: '#7c3aed',
        accounts: [
            { label: 'Priya Menon' },
            { label: 'Suresh Kumar' },
            { label: 'Farhan Khan' },
        ],
    },
    {
        title: 'Super Admin',
        icon: <WorkspacePremiumRoundedIcon sx={{ color: '#16a34a', fontSize: 24 }} />,
        accent: '#16a34a',
        accounts: [
            { label: 'Naveen Kumar' },
        ],
    },
];

const DEMO_CREDENTIALS = {
    'Aditi Rao': { email: 'student1@scholarship.gov.in', password: 'Q7!sT9#Lm2@v' },
    'Arjun Shetty': { email: 'student2@scholarship.gov.in', password: 'R4#uN8$Pd6@x' },
    'Kavya Naik': { email: 'student3@scholarship.gov.in', password: 'H2!kQ5%Za7@r' },
    'Rohan Kulkarni': { email: 'student4@scholarship.gov.in', password: 'T8@nM3!Wx9#c' },
    'Ananya Iyer': { email: 'student5@scholarship.gov.in', password: 'F6$yV1!Js4@p' },
    'Priya Menon': { email: 'admin1@scholarship.gov.in', password: 'A9!dR2#kL7@u' },
    'Suresh Kumar': { email: 'admin2@scholarship.gov.in', password: 'B3$hT8!qM5#z' },
    'Farhan Khan': { email: 'admin3@scholarship.gov.in', password: 'C7@fN1!wP6$y' },
    'Naveen Kumar': { email: 'superadmin@scholarship.gov.in', password: 'S0!uP9#Xc4@k' },
};

function RoleCard({ title, icon, accent, accounts, selectedRole, onSelect }) {
    return (
        <Card
            elevation={0}
            sx={{
                border: `1px solid ${BORDER}`,
                borderRadius: 2.5,
                p: 2,
                height: '100%',
                background: '#ffffff',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, mb: 1.2 }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '12px',
                        display: 'grid',
                        placeItems: 'center',
                        background: `${accent}12`,
                        border: `1px solid ${accent}22`,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: TEXT, lineHeight: 1.2 }}>
                    {title}
                </Typography>
            </Box>

            <Divider sx={{ mb: 1.4 }} />

            <Box sx={{ display: 'grid', gap: 0.9 }}>
                {accounts.map((account) => (
                    <Button
                        key={account.label}
                        variant="outlined"
                        fullWidth
                        type="button"
                        onClick={() => onSelect(account.label)}
                        sx={{
                            justifyContent: 'center',
                            borderColor: accent,
                            color: selectedRole === account.label ? '#ffffff' : accent,
                            borderRadius: 2,
                            py: 0.9,
                            fontWeight: 700,
                            background: selectedRole === account.label ? accent : 'transparent',
                            '&:hover': {
                                borderColor: accent,
                                background: selectedRole === account.label ? accent : `${accent}08`,
                            },
                        }}
                    >
                        {account.label}
                    </Button>
                ))}
            </Box>
        </Card>
    );
}

export default function LandingPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);
    const [howItWorksOpen, setHowItWorksOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');

    const handleSelectRole = (roleLabel) => {
        const credentials = DEMO_CREDENTIALS[roleLabel];
        if (!credentials) return;

        setSelectedRole(roleLabel);
        setEmail(credentials.email);
        setPassword(credentials.password);
        setLoginError('');
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setLoading(true);
        setLoginError('');

        try {
            const response = await api.post('/auth/login', { email, password });
            const role = response.data.user.role;

            writeSession({
                token: response.data.token,
                user: response.data.user,
                profile: response.data.profile || null,
                role,
            });

            if (role === 'Student') {
                navigate('/student/dashboard', { replace: true });
            } else if (role === 'Admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/supervisor/dashboard', { replace: true });
            }
        } catch (error) {
            setLoginError(error.response?.data?.message || 'Unable to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                overflowX: 'hidden',
                overflowY: 'visible',
                position: 'relative',
                background: 'linear-gradient(180deg, #f8fbff 0%, #f5f7fc 100%)',
                color: TEXT,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: 'radial-gradient(circle at 10% 15%, rgba(37,99,235,0.08), transparent 28%), radial-gradient(circle at 88% 12%, rgba(124,58,237,0.08), transparent 24%), radial-gradient(circle at 50% 92%, rgba(22,163,74,0.06), transparent 22%)',
                }}
            />

            <Box
                component="header"
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    height: HEADER_HEIGHT,
                    px: { xs: 2, md: 3.5 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(14px)',
                    borderBottom: `1px solid ${BORDER}`,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
                            display: 'grid',
                            placeItems: 'center',
                            boxShadow: '0 12px 26px rgba(37, 99, 235, 0.22)',
                        }}
                    >
                        <ShieldRoundedIcon sx={{ color: 'white', fontSize: 22 }} />
                    </Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: TEXT }}>
                        EduVerify
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2.2, md: 3.5 } }}>
                    <Button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        sx={{
                            minWidth: 0,
                            p: 0,
                            color: TEXT,
                            fontWeight: 600,
                            fontSize: 15,
                            '&:hover': { background: 'transparent', color: BLUE },
                        }}
                    >
                        Home
                    </Button>
                    <Button
                        onClick={() => setHowItWorksOpen(true)}
                        sx={{
                            minWidth: 0,
                            p: 0,
                            color: TEXT,
                            fontWeight: 600,
                            fontSize: 15,
                            '&:hover': { background: 'transparent', color: BLUE },
                        }}
                    >
                        How It Works
                    </Button>
                </Box>
            </Box>

            <Box
                component="main"
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    minHeight: `calc(100dvh - ${HEADER_HEIGHT}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: { xs: 1.5, sm: 2.5 },
                    py: { xs: 1.5, md: 2 },
                }}
            >
                <Box
                    component="section"
                    sx={{
                        width: '100%',
                        maxWidth: 820,
                    }}
                >
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            border: `1px solid ${BORDER}`,
                            boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)',
                            background: 'rgba(255,255,255,0.96)',
                            backdropFilter: 'blur(12px)',
                            p: { xs: 2, md: 2.5 },
                        }}
                    >
                        <Box
                            component="form"
                            onSubmit={handleLogin}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1.5,
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0.8 }}>
                                <Box
                                    sx={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: '18px',
                                        background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(37,99,235,0.06))',
                                        display: 'grid',
                                        placeItems: 'center',
                                        border: '1px solid rgba(37,99,235,0.10)',
                                    }}
                                >
                                    <SecurityRoundedIcon sx={{ color: BLUE, fontSize: 26 }} />
                                </Box>

                                <Box>
                                    <Typography sx={{ fontSize: { xs: 24, md: 28 }, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.03em', color: TEXT }}>
                                        Welcome to EduVerify
                                    </Typography>
                                    <Typography sx={{ mt: 0.5, fontSize: 13.5, color: MUTED }}>
                                        Login to access your account
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'grid', gap: 1.1 }}>
                                <Box>
                                    <Typography sx={{ mb: 0.6, fontSize: 13, fontWeight: 700, color: TEXT }}>
                                        User ID / Email
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="Enter your user id or email"
                                        size="small"
                                        autoComplete="email"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                background: '#ffffff',
                                                minHeight: 44,
                                            },
                                        }}
                                    />
                                </Box>

                                <Box>
                                    <Typography sx={{ mb: 0.6, fontSize: 13, fontWeight: 700, color: TEXT }}>
                                        Password
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Enter your password"
                                        type={showPassword ? 'text' : 'password'}
                                        size="small"
                                        autoComplete="current-password"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                background: '#ffffff',
                                                minHeight: 44,
                                            },
                                        }}
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            edge="end"
                                                            onClick={() => setShowPassword((current) => !current)}
                                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                            sx={{ color: MUTED }}
                                                        >
                                                            {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>

                            {loginError && <Alert severity="error" sx={{ py: 0.5 }}>{loginError}</Alert>}

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading}
                                startIcon={<LoginRoundedIcon />}
                                sx={{
                                    width: '100%',
                                    py: 1.05,
                                    borderRadius: 2,
                                    background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
                                    boxShadow: '0 16px 30px rgba(37, 99, 235, 0.22)',
                                    '&:hover': {
                                        background: `linear-gradient(135deg, ${BLUE_DARK} 0%, #1e40af 100%)`,
                                    },
                                }}
                            >
                                {loading ? 'Signing In...' : 'Login'}
                            </Button>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 1.5,
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, minmax(0, 1fr))',
                                        md: 'repeat(3, minmax(0, 1fr))',
                                    },
                                }}
                            >
                                {DEMO_ACCOUNTS.map((group) => (
                                    <RoleCard
                                        key={group.title}
                                        title={group.title}
                                        icon={group.icon}
                                        accent={group.accent}
                                        accounts={group.accounts}
                                        selectedRole={selectedRole}
                                        onSelect={handleSelectRole}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Card>
                </Box>
            </Box>

            <Dialog
                open={howItWorksOpen}
                onClose={() => setHowItWorksOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: `1px solid ${BORDER}`,
                        boxShadow: '0 28px 80px rgba(15, 23, 42, 0.18)',
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1.5, fontWeight: 800, color: TEXT, fontSize: 22 }}>
                    How EduVerify Works
                </DialogTitle>
                <DialogContent sx={{ pt: 1, pb: 3 }}>
                    <Box sx={{ display: 'grid', gap: 1.4 }}>
                        {HOW_IT_WORKS.map((step, index) => (
                            <Box key={step} sx={{ display: 'flex', gap: 1.6, alignItems: 'flex-start' }}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        display: 'grid',
                                        placeItems: 'center',
                                        background: index < 2 ? 'rgba(37,99,235,0.12)' : index < 4 ? 'rgba(124,58,237,0.12)' : 'rgba(22,163,74,0.12)',
                                        color: index < 2 ? BLUE : index < 4 ? '#7c3aed' : '#16a34a',
                                        fontWeight: 800,
                                        fontSize: 13,
                                    }}
                                >
                                    {index + 1}
                                </Box>
                                <Box sx={{ pt: 0.15 }}>
                                    <Typography sx={{ fontWeight: 700, color: TEXT, lineHeight: 1.4 }}>
                                        {step}
                                    </Typography>
                                    {index < HOW_IT_WORKS.length - 1 && (
                                        <Box sx={{ width: 2, height: 14, background: BORDER, ml: '14px', mt: 0.7 }} />
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
