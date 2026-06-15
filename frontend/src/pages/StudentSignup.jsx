import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Grid,
    Typography,
    TextField,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    InputAdornment,
    MenuItem,
    Alert
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import api from '../api';

const REGIONS_AND_DISTRICTS = {
    "North": ["District A", "District B", "District C"],
    "South": ["District D", "District E"],
    "East": ["District F", "District G", "District H"],
    "West": ["District I", "District J"]
};

export default function StudentSignup() {
    const navigate = useNavigate();

    // Form states
    const [fullName, setFullName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [collegeName, setCollegeName] = useState('');
    const [grade, setGrade] = useState('');
    const [email, setEmail] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [region, setRegion] = useState('');
    const [district, setDistrict] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreed, setAgreed] = useState(false);

    // UX states
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }

        if (!agreed) {
            setErrorMsg("You must agree to the Terms of Service.");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/student/signup', {
                fullName,
                studentId,
                collegeName,
                grade,
                email,
                mobileNumber,
                password,
                region,
                district
            });
            setSuccessMsg(res.data.message);
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#f4f7fa', justifyContent: 'center', alignItems: 'center', p: { xs: 1, sm: 3 } }}>
            <Grid container sx={{ maxWidth: 1050, bgcolor: 'white', borderRadius: 4, overflow: 'hidden', boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.08)' }}>
                {/* Left Blue Sidebar (Design-accurate) */}
                <Grid
                    sx={{ bgcolor: '#f0f5ff', p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    size={{
                        xs: 12,
                        md: 5
                    }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                            <SchoolIcon sx={{ color: '#0b2a5c', fontSize: 32 }} />
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0b2a5c', lineHeight: 1.2 }}>
                                EduVerify
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#627d98', mb: 4, lineHeight: 1.6 }}>
                            Create an account to track your eligibility, submit required documentation, and securely manage your government scholarship applications.
                        </Typography>

                        {/* Image copied from public/student_photo.png */}
                        <Box 
                            component="img"
                            src="/student_photo.png"
                            alt="Student Registration"
                            sx={{ 
                                width: '100%', 
                                maxHeight: 260, 
                                objectFit: 'cover', 
                                borderRadius: 3, 
                                boxShadow: '0px 10px 25px rgba(11, 42, 92, 0.1)',
                                border: '1px solid #e2e8f0',
                                mb: 3
                            }}
                        />
                    </Box>

                    {/* Secure Banner */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        <VerifiedUserIcon sx={{ color: '#2e7d32', mt: 0.2 }} />
                        <Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0b2a5c', display: 'block' }}>
                                Secure EduVerify Portal
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#627d98', display: 'block', lineHeight: 1.3 }}>
                                Your data is encrypted and protected by government-grade security standards.
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                {/* Right Form Container */}
                <Grid
                    sx={{ p: { xs: 3, sm: 5 } }}
                    size={{
                        xs: 12,
                        md: 7
                    }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#0f1e36' }}>
                        Student Registration
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#627d98', mb: 3 }}>
                        Please fill in your official details to begin the verification process.
                    </Typography>

                    {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
                    {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

                    <form onSubmit={handleSignup}>
                        <Grid container spacing={2}>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Full Name *</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="As per official ID"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Student ID *</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="E.g., 2023-XXXX"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    required
                                />
                            </Grid>

                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>School/College Name *</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="Enter full institution name"
                                    value={collegeName}
                                    onChange={(e) => setCollegeName(e.target.value)}
                                    required
                                />
                            </Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Grade / Year *</Typography>
                                <TextField
                                    fullWidth
                                    select
                                    label=""
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    required
                                >
                                    <MenuItem value="Grade 12">Grade 12</MenuItem>
                                    <MenuItem value="Year 1">Year 1 (Undergrad)</MenuItem>
                                    <MenuItem value="Year 2">Year 2 (Undergrad)</MenuItem>
                                    <MenuItem value="Year 3">Year 3 (Undergrad)</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Email Address *</Typography>
                                <TextField
                                    fullWidth
                                    type="email"
                                    placeholder="student@example.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Mobile Number *</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="+1 (555) 000-0000"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                />
                            </Grid>

                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Region *</Typography>
                                <TextField
                                    fullWidth
                                    select
                                    value={region}
                                    onChange={(e) => {
                                        setRegion(e.target.value);
                                        setDistrict('');
                                    }}
                                    required
                                >
                                    {Object.keys(REGIONS_AND_DISTRICTS).map((reg) => (
                                        <MenuItem key={reg} value={reg}>{reg}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>District *</Typography>
                                <TextField
                                    fullWidth
                                    select
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                    disabled={!region}
                                    required
                                >
                                    {region && REGIONS_AND_DISTRICTS[region].map((dist) => (
                                        <MenuItem key={dist} value={dist}>{dist}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Password *</Typography>
                                <TextField
                                    fullWidth
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
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
                            </Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Confirm Password *</Typography>
                                <TextField
                                    fullWidth
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 3, mb: 3 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox 
                                        checked={agreed} 
                                        onChange={(e) => setAgreed(e.target.checked)} 
                                        color="primary" 
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ color: '#627d98' }}>
                                        I acknowledge that I have read and agree to the{' '}
                                        <Box component="span" sx={{ color: '#0b2a5c', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
                                            Terms of Service
                                        </Box>{' '}
                                        and{' '}
                                        <Box component="span" sx={{ color: '#0b2a5c', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>
                                            Privacy Policy
                                        </Box>{' '}
                                        governing the use of EduVerify.
                                    </Typography>
                                }
                            />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                endIcon={<ArrowForwardIcon />}
                                sx={{ py: 1.2, px: 4, bgcolor: '#0b2a5c' }}
                            >
                                {loading ? "Registering..." : "Register"}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/', { replace: true })}
                                sx={{ borderColor: '#cbd5e1', color: '#0f1e36', '&:hover': { borderColor: '#94a3b8' } }}
                            >
                                Back to Login
                            </Button>
                        </Box>
                    </form>
                </Grid>
            </Grid>
        </Box>
    );
}
