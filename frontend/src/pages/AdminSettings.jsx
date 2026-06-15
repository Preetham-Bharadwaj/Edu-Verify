import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    Divider,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminShell from '../components/admin/AdminShell';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

function SectionCard({ icon, title, children }) {
    return (
        <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ color: '#1d4ed8', display: 'flex' }}>{icon}</Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{title}</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 1 }}>{children}</Box>
        </Card>
    );
}

function KVRow({ label, value }) {
    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25 }}>
                <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 600, minWidth: 160 }}>{label}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{value || '—'}</Typography>
            </Box>
            <Divider light />
        </>
    );
}

function ToggleRow({ label, description, checked, onChange }) {
    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.35 }}>
                <Box sx={{ pr: 3 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{label}</Typography>
                    {description && <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>{description}</Typography>}
                </Box>
                <Switch size="small" checked={checked} onChange={onChange}
                    sx={{ flexShrink: 0, '& .MuiSwitch-switchBase.Mui-checked': { color: '#1d4ed8' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#1d4ed8' } }} />
            </Box>
            <Divider light />
        </>
    );
}

function loadPref(key, fallback) {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
    catch { return fallback; }
}

export default function AdminSettings() {
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Password change form
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');

    const [notifPrefs, setNotifPrefs] = useState(() => loadPref('admin_notif_prefs', {
        newApplication: true, statusChange: true, holdAlert: true, systemUpdates: false
    }));

    useEffect(() => {
        if (admin) loadProfile();
    }, [admin]);

    useAutoRefresh(() => loadProfile(true), [admin]);

    const loadProfile = async (silent = false) => {
        if (!silent) setLoading(true); setError('');
        try {
            const res = await api.get('/admin/profile');
            setProfile(res.data.admin);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load profile.');
        } finally { setLoading(false); }
    };

    const updateNotif = (key) => (e) => {
        const updated = { ...notifPrefs, [key]: e.target.checked };
        setNotifPrefs(updated);
        localStorage.setItem('admin_notif_prefs', JSON.stringify(updated));
    };

    const handlePasswordChange = async () => {
        setPasswordError('');
        if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
            setPasswordError('All password fields are required.'); return;
        }
        if (passwordData.new !== passwordData.confirm) {
            setPasswordError('New password and confirmation do not match.'); return;
        }
        if (passwordData.new.length < 6) {
            setPasswordError('Password must be at least 6 characters.'); return;
        }
        setChangingPassword(true);
        try {
            await api.post('/admin/change-password', { currentPassword: passwordData.current, newPassword: passwordData.new });
            setSuccess('Password changed successfully.');
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPasswordError(err.response?.data?.message || 'Failed to change password.');
        } finally { setChangingPassword(false); }
    };

    const handleNavigate = (path) => navigate(path);

    return (
        <AdminShell admin={admin} activePage="settings" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3.5}>
                <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Settings</Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#64748b', mt: 0.25 }}>Manage your profile, password, and preferences.</Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ borderRadius: '8px' }}>{success}</Alert>}
                {passwordError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{passwordError}</Alert>}

                {loading ? (
                    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} thickness={3} /></Box>
                ) : (
                    <Stack spacing={2.5}>
                        {/* Profile Settings */}
                        <SectionCard icon={<PersonOutlineIcon sx={{ fontSize: 17 }} />} title="Profile Settings">
                            <KVRow label="Full Name" value={profile?.name} />
                            <KVRow label="Email Address" value={profile?.email} />
                            <KVRow label="Role" value={profile?.role} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25 }}>
                                <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Account Status</Typography>
                                <Box component="span" sx={{ display: 'inline-block', px: 1.25, py: 0.35, borderRadius: '4px', fontSize: 11.5, fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d' }}>
                                    {profile?.status || 'Active'}
                                </Box>
                            </Box>
                        </SectionCard>

                        {/* Change Password */}
                        <SectionCard icon={<LockOutlinedIcon sx={{ fontSize: 17 }} />} title="Change Password">
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <TextField fullWidth size="small" type="password" label="Current Password" value={passwordData.current} onChange={(e) => setPasswordData(p => ({ ...p, current: e.target.value }))}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                                <TextField fullWidth size="small" type="password" label="New Password" value={passwordData.new} onChange={(e) => setPasswordData(p => ({ ...p, new: e.target.value }))}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                                <TextField fullWidth size="small" type="password" label="Confirm New Password" value={passwordData.confirm} onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }} />
                                <Button fullWidth variant="contained" onClick={handlePasswordChange} disabled={changingPassword}
                                    sx={{ bgcolor: '#1d4ed8', color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: 13.5, py: 1, borderRadius: '7px', boxShadow: 'none', '&:hover': { bgcolor: '#1e40af', boxShadow: 'none' } }}>
                                    {changingPassword ? 'Changing...' : 'Change Password'}
                                </Button>
                            </Stack>
                        </SectionCard>

                        {/* Notification Preferences */}
                        <SectionCard icon={<NotificationsNoneOutlinedIcon sx={{ fontSize: 17 }} />} title="Notification Preferences">
                            <ToggleRow label="New Application Submitted" description="Get notified when a new scholarship application arrives."
                                checked={notifPrefs.newApplication} onChange={updateNotif('newApplication')} />
                            <ToggleRow label="Application Status Changes" description="Receive alerts when an application's status is updated."
                                checked={notifPrefs.statusChange} onChange={updateNotif('statusChange')} />
                            <ToggleRow label="Hold Alerts" description="Notify when applications are placed on hold for extended periods."
                                checked={notifPrefs.holdAlert} onChange={updateNotif('holdAlert')} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.35 }}>
                                <Box sx={{ pr: 3 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>System Updates</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>Portal maintenance notices and announcements.</Typography>
                                </Box>
                                <Switch size="small" checked={notifPrefs.systemUpdates} onChange={updateNotif('systemUpdates')}
                                    sx={{ flexShrink: 0, '& .MuiSwitch-switchBase.Mui-checked': { color: '#1d4ed8' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#1d4ed8' } }} />
                            </Box>
                        </SectionCard>

                        {/* Logout */}
                        <SectionCard icon={<LogoutIcon sx={{ fontSize: 17 }} />} title="Logout">
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                                <Box>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Sign out of your account</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#94a3b8', mt: 0.2 }}>You will be redirected to the login page.</Typography>
                                </Box>
                                <Button size="small" onClick={handleLogout}
                                    sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 600, color: '#fff', bgcolor: '#b91c1c', borderRadius: '6px', py: 0.6, px: 2, '&:hover': { bgcolor: '#991b1b' } }}>
                                    Logout
                                </Button>
                            </Box>
                        </SectionCard>
                    </Stack>
                )}
            </Stack>
        </AdminShell>
    );
}