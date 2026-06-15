import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import AdminShell from '../components/admin/AdminShell';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

export default function AdminProfile() {
    const navigate = useNavigate();
    const { user: adminBase, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [admin, setAdmin] = useState(adminBase);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Change Password Dialog States
    const [dialogOpen, setDialogOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [dialogError, setDialogError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (adminBase) {
            setAdmin(adminBase);
            loadProfile();
        }
    }, [adminBase]);

    useAutoRefresh(() => loadProfile(true), [adminBase]);

    const loadProfile = async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/profile');
            setAdmin((prev) => ({ ...prev, ...res.data.admin }));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (path) => navigate(path);

    const handleOpenDialog = () => {
        setDialogOpen(true);
        setCurrentPassword('');
        setIsVerified(false);
        setNewPassword('');
        setConfirmPassword('');
        setDialogError('');
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleVerifyCurrentPassword = async () => {
        setDialogError('');
        if (!currentPassword) {
            setDialogError('Current password is required.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/admin/profile/verify-password', { currentPassword });
            setIsVerified(true);
        } catch (err) {
            setDialogError(err.response?.data?.message || 'Verification failed. Password may be incorrect.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        setDialogError('');
        setSuccess('');

        if (!newPassword || !confirmPassword) {
            setDialogError('New password fields are required.');
            return;
        }
        if (newPassword.length < 8) {
            setDialogError('New password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setDialogError('New password and confirmation do not match.');
            return;
        }

        setSaving(true);
        try {
            const res = await api.put('/admin/profile/password', {
                currentPassword,
                newPassword
            });
            setSuccess(res.data.message || 'Password updated successfully.');
            setDialogOpen(false);
        } catch (err) {
            setDialogError(err.response?.data?.message || 'Failed to update password.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminShell admin={admin} activePage="profile" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f1e36' }}>
                        Admin Profile Center
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#627d98', mt: 0.5 }}>
                        Verify employee profile information and manage account security.
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {/* Admin Information Card */}
                    <Grid
                        size={{
                            xs: 12,
                            md: 7
                        }}>
                        <Card sx={{ boxShadow: '0 8px 24px rgba(11, 42, 92, 0.08)' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, color: '#0f1e36' }}>
                                    Admin Information
                                </Typography>
                                <Grid container spacing={2.5}>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 6
                                        }}>
                                        <Typography variant="caption" sx={{ color: '#627d98', display: 'block', mb: 0.5 }}>Name</Typography>
                                        <Typography sx={{ fontWeight: 800, color: '#0f1e36' }}>{loading ? 'Loading...' : admin?.name || '-'}</Typography>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 6
                                        }}>
                                        <Typography variant="caption" sx={{ color: '#627d98', display: 'block', mb: 0.5 }}>Employee ID</Typography>
                                        <Typography sx={{ fontWeight: 800, color: '#0f1e36' }}>{loading ? 'Loading...' : admin?.employeeId || admin?.id || '-'}</Typography>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 6
                                        }}>
                                        <Typography variant="caption" sx={{ color: '#627d98', display: 'block', mb: 0.5 }}>Assigned Region</Typography>
                                        <Typography sx={{ fontWeight: 800, color: '#0f1e36' }}>{loading ? 'Loading...' : `${admin?.region || '-'} (${admin?.district || '-'})`}</Typography>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 6
                                        }}>
                                        <Typography variant="caption" sx={{ color: '#627d98', display: 'block', mb: 0.5 }}>Email Address</Typography>
                                        <Typography sx={{ fontWeight: 800, color: '#0f1e36' }}>{loading ? 'Loading...' : admin?.email || '-'}</Typography>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 6
                                        }}>
                                        <Typography variant="caption" sx={{ color: '#627d98', display: 'block', mb: 0.5 }}>Phone</Typography>
                                        <Typography sx={{ fontWeight: 800, color: '#0f1e36' }}>{loading ? 'Loading...' : admin?.phone || '+91 98765 43210'}</Typography>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 6
                                        }}>
                                        <Typography variant="caption" sx={{ color: '#627d98', display: 'block', mb: 0.5 }}>Role</Typography>
                                        <Typography sx={{ fontWeight: 800, color: '#0f1e36' }}>{loading ? 'Loading...' : admin?.role || 'Admin'}</Typography>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 6
                                        }}>
                                        <Typography variant="caption" sx={{ color: '#627d98', display: 'block', mb: 0.5 }}>Last Login</Typography>
                                        <Typography sx={{ fontWeight: 800, color: '#0f1e36' }}>{new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Account Security Section Card */}
                    <Grid
                        size={{
                            xs: 12,
                            md: 5
                        }}>
                        <Card sx={{ boxShadow: '0 8px 24px rgba(11, 42, 92, 0.08)', height: '100%' }}>
                            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, color: '#0f1e36' }}>
                                    Account Security
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#627d98', mb: 3 }}>
                                    Click below to securely update your credentials. A validation dialog will verify your identity.
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<LockResetOutlinedIcon />}
                                    onClick={handleOpenDialog}
                                    sx={{ bgcolor: '#0b2a5c', '&:hover': { bgcolor: '#0a1d3d' } }}
                                >
                                    Change Password
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Stack>
            {/* Secure Password Update Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 900 }}>Secure Account Update</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        {dialogError && <Alert severity="error">{dialogError}</Alert>}

                        {!isVerified ? (
                            <>
                                <Typography variant="body2" sx={{ color: '#627d98' }}>
                                    Please enter your current password to verify your identity.
                                </Typography>
                                <TextField
                                    label="Current Password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    fullWidth
                                    autoFocus
                                />
                            </>
                        ) : (
                            <>
                                <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                                    ✓ Identity verified. Enter your new password below.
                                </Typography>
                                <TextField
                                    label="New Password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    fullWidth
                                    autoFocus
                                />
                                <TextField
                                    label="Confirm New Password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    fullWidth
                                />
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={handleCloseDialog} variant="outlined">
                        Cancel
                    </Button>
                    {!isVerified ? (
                        <Button
                            onClick={handleVerifyCurrentPassword}
                            variant="contained"
                            disabled={saving}
                            sx={{ bgcolor: '#0b2a5c' }}
                        >
                            {saving ? 'Verifying...' : 'Validate Password'}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleUpdatePassword}
                            variant="contained"
                            disabled={saving}
                            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                        >
                            {saving ? 'Saving...' : 'Update Password'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </AdminShell>
    );
}
