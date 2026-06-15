import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    Alert
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../api';
import { writeSession } from '../utils/auth';

export default function LoginPage({ role }) {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { email, password });
            
            // Validate that role matches the logged-in user role
            if (res.data.user.role !== role) {
                setErrorMsg(`This account does not have ${role} privileges. Please use the correct portal.`);
                setLoading(false);
                return;
            }

        writeSession({
            token: res.data.token,
            user: res.data.user,
            profile: res.data.profile || null,
            role,
        });

        // Ensure session is persisted before navigation
            if (role === 'Student') {
                navigate('/student/dashboard', { replace: true });
            } else if (role === 'Admin') {
                navigate('/admin/dashboard', { replace: true });
            } else if (role === 'Supervisor') {
                navigate('/supervisor/dashboard', { replace: true });
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    const getRoleIcon = () => {
        switch (role) {
            case 'Student':
                return <SchoolIcon sx={{ fontSize: 40, color: '#0b2a5c' }} />;
            case 'Admin':
                return <AdminPanelSettingsIcon sx={{ fontSize: 40, color: '#0b2a5c' }} />;
            case 'Supervisor':
                return <SupervisorAccountIcon sx={{ fontSize: 40, color: '#0b2a5c' }} />;
            default:
                return <SchoolIcon sx={{ fontSize: 40, color: '#0b2a5c' }} />;
        }
    };

    return (
        <Box 
            sx={{ 
                minHeight: '100vh', 
                bgcolor: '#f8fafd', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                p: 2 
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 450, mb: 2 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => navigate('/', { replace: true })}
                    sx={{ color: '#0b2a5c' }}
                >
                    Back to Portal Selection
                </Button>
            </Box>

            <Card sx={{ width: '100%', maxWidth: 450, borderTop: '4px solid #0b2a5c', boxShadow: '0px 10px 30px rgba(11, 42, 92, 0.08)' }}>
                <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    {/* Header */}
                    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        {getRoleIcon()}
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1.5, mb: 0.5, color: '#0f1e36' }}>
                            {role} Portal Login
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#627d98' }}>
                            Enter your credentials to manage your verification system
                        </Typography>
                    </Box>

                    {errorMsg && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{errorMsg}</Alert>}

                    {/* Form */}
                    <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
                        <Box sx={{ mb: 2.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Email Address *</Typography>
                            <TextField
                                fullWidth
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Password *</Typography>
                            <TextField
                                fullWidth
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            sx={{ py: 1.2, mb: 3, bgcolor: '#0b2a5c' }}
                        >
                            {loading ? "Signing In..." : "Sign In"}
                        </Button>
                    </Box>

                    {/* Secondary Actions */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        {role === 'Student' && (
                            <Typography variant="body2" sx={{ color: '#627d98' }}>
                                Don't have an account?{' '}
                                <Box 
                                    component="span" 
                                    sx={{ color: '#0b2a5c', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                    onClick={() => navigate('/student/signup')}
                                >
                                    Sign Up
                                </Box>
                            </Typography>
                        )}
                        {role === 'Admin' && (
                            <Typography variant="body2" sx={{ color: '#627d98' }}>
                                Need access?{' '}
                                <Box 
                                    component="span" 
                                    sx={{ color: '#0b2a5c', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                    onClick={() => navigate('/admin/request')}
                                >
                                    Request Access
                                </Box>
                            </Typography>
                        )}
                        {role === 'Supervisor' && (
                            <Typography variant="body2" sx={{ color: '#627d98', textAlign: 'center', fontSize: '11px', px: 2 }}>
                                Supervisor accounts are pre-created by the organization. Please contact your administrator if you need your credentials.
                            </Typography>
                        )}
                    </Box>

                </CardContent>
            </Card>
        </Box>
    );
}
