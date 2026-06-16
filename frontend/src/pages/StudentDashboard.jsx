import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    AppBar,
    Avatar,
    Badge,
    Box,
    BottomNavigation,
    BottomNavigationAction,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Toolbar,
    Typography
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import HomeIcon from '@mui/icons-material/Home';
import PostAddIcon from '@mui/icons-material/PostAdd';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import PersonIcon from '@mui/icons-material/Person';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ScholarshipForm from './ScholarshipForm';
import api from '../api';
import { clearSession, getUser, updateSessionToken, updateSessionUser } from '../utils/auth';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const HEADER_HEIGHT = 72;
const SIDEBAR_WIDTH = 260;
const PROFILE_GENDERS = ['Male', 'Female', 'Other'];
const FALLBACK_REFERENCE_DATA = {
    regionsAndDistricts: {
        North: ['District A', 'District B', 'District C'],
        South: ['Chennai', 'District D', 'District E'],
        East: ['District F', 'District G', 'District H'],
        West: ['District I', 'District J']
    }
};

function formatDate(value, withTime = false) {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleString('en-US', withTime ? {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    } : {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function statusChipLabel(status) {
    if (!status) return 'Pending';
    const normalized = String(status).toLowerCase();
    if (normalized.includes('approved')) return 'Approved';
    if (normalized.includes('rejected')) return 'Rejected';
    if (normalized.includes('hold')) return 'Hold';
    return 'Pending';
}

function getStatusChip(status) {
    const label = statusChipLabel(status);
    const style = {
        Pending: { bg: '#fff3e0', color: '#ed6c02' },
        Approved: { bg: '#e8f5e9', color: '#2e7d32' },
        Rejected: { bg: '#ffebee', color: '#c62828' },
        Hold: { bg: '#fff8e1', color: '#b26a00' }
    }[label];
    return <Chip label={label} size="small" sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, borderRadius: 1.5 }} />;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function buildFallbackDashboard(profileData, applicationsData, notificationsData) {
    const profile = profileData?.profileView || {
        fullName: profileData?.profile?.student_name || profileData?.user?.name || 'Student',
        studentId: profileData?.profile?.student_id || '',
        email: profileData?.user?.email || '',
        phone: '',
        personalInformation: {
            dateOfBirth: '',
            gender: '',
            address: '',
            region: profileData?.profile?.region || '',
            district: profileData?.profile?.district || ''
        },
        academicInformation: {
            institutionName: profileData?.profile?.college_name || '',
            courseGrade: profileData?.profile?.grade || '',
            academicYear: ''
        },
        parentInformation: {
            fatherName: '',
            motherName: '',
            fatherAadhaar: '',
            motherAadhaar: '',
            fatherOccupation: '',
            fatherAnnualIncome: '',
            motherOccupation: '',
            motherAnnualIncome: ''
        }
    };

    const apps = (applicationsData || []).map((app) => ({
        ...app,
        remarks: app.override_comments || app.override_reason || app.rejection_reason || app.hold_reason || 'Application under review'
    }));

    return {
        student: profile,
        stats: {
            totalApplications: apps.length,
            pendingApplications: apps.filter((item) => ['In Progress', 'Under Verification', 'Hold'].includes(item.status)).length,
            approvedApplications: apps.filter((item) => item.status === 'Approved').length,
            rejectedApplications: apps.filter((item) => item.status === 'Rejected').length
        },
        applications: apps,
        notifications: notificationsData || [],
        unreadNotificationCount: (notificationsData || []).filter((n) => !n.read_status).length
    };
}

export default function StudentDashboard() {
    const navigate = useNavigate();
    const [currentTab, setCurrentTab] = useState('home');
    const [dashboardData, setDashboardData] = useState(null);
    const [referenceData, setReferenceData] = useState(FALLBACK_REFERENCE_DATA);
    const [profileView, setProfileView] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);
    const [error, setError] = useState('');
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [documentBusyId, setDocumentBusyId] = useState('');
    const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [profileForm, setProfileForm] = useState({
        fullName: '',
        studentId: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        region: '',
        district: '',
        institutionName: '',
        institutionType: 'School',
        courseGrade: '',
        academicYear: '',
        semester: '',
        fatherName: '',
        motherName: '',
        fatherAadhaar: '',
        motherAadhaar: '',
        currentPassword: '',
        newPassword: ''
    });

    const user = useMemo(() => getUser('Student'), []);

    const sidebarItems = [
        { value: 'home', label: 'Dashboard', icon: <HomeIcon /> },
        { value: 'apply', label: 'Apply Scholarship', icon: <PostAddIcon /> },
        { value: 'status', label: 'Application Status', icon: <TrackChangesIcon /> }
    ];

    useEffect(() => {
        loadInitialData();
    }, []);

    useAutoRefresh(() => reloadDashboard(), []);

    useEffect(() => {
        if (!profileView) return;
        setProfileForm({
            fullName: profileView.fullName || '',
            studentId: profileView.studentId || '',
            email: profileView.email || '',
            phone: profileView.phone || '',
            dateOfBirth: profileView.personalInformation?.dateOfBirth || '',
            gender: profileView.personalInformation?.gender || '',
            address: profileView.personalInformation?.address || '',
            region: profileView.personalInformation?.region || '',
            district: profileView.personalInformation?.district || '',
            institutionName: profileView.academicInformation?.institutionName || '',
            institutionType: profileView.academicInformation?.institutionType || 'School',
            courseGrade: profileView.academicInformation?.courseGrade || '',
            academicYear: profileView.academicInformation?.academicYear || '',
            semester: profileView.academicInformation?.semester || '',
            fatherName: profileView.parentInformation?.fatherName || '',
            motherName: profileView.parentInformation?.motherName || '',
            fatherAadhaar: profileView.parentInformation?.fatherAadhaar || '',
            motherAadhaar: profileView.parentInformation?.motherAadhaar || '',
            currentPassword: '',
            newPassword: ''
        });
    }, [profileView]);

    async function loadDashboardSources() {
        const [profileRes, applicationsRes, notificationsRes] = await Promise.allSettled([
            api.get('/student/profile'),
            api.get('/student/applications'),
            api.get('/student/notifications')
        ]);

        const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
        const applicationsData = applicationsRes.status === 'fulfilled' ? applicationsRes.value.data : [];
        const notificationsData = notificationsRes.status === 'fulfilled' ? notificationsRes.value.data : [];

        if (profileRes.status === 'fulfilled') {
            setProfileView(profileRes.value.data.profileView || buildFallbackDashboard(profileRes.value.data, [], []).student);
            setReferenceData(profileRes.value.data.referenceData || FALLBACK_REFERENCE_DATA);
        }

        setDashboardData(buildFallbackDashboard(profileData, applicationsData, notificationsData));
    }

    async function loadInitialData() {
        setLoading(true);
        setError('');
        try {
            await loadDashboardSources();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load student dashboard.');
        } finally {
            setLoading(false);
        }
    }

    async function reloadDashboard() {
        try {
            await loadDashboardSources();
        } catch {
            setError('Failed to refresh dashboard.');
        }
    }

    async function reloadProfile() {
        try {
            const res = await api.get('/student/profile');
            setProfileView(res.data.profileView || buildFallbackDashboard(res.data, [], []).student);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to refresh profile.');
        }
    }

    const student = dashboardData?.student || profileView;
    const applications = dashboardData?.applications || [];
    const notifications = dashboardData?.notifications || [];
    const unreadCount = dashboardData?.unreadNotificationCount || 0;
    const districts = referenceData?.regionsAndDistricts?.[profileForm.region] || [];
    const currentApplication = applications[0] || null;

    const summaryCards = [
        { label: 'Total Applications', value: dashboardData?.stats?.totalApplications || 0, icon: <FolderOpenIcon sx={{ color: '#94a3b8' }} /> },
        { label: 'Pending', value: dashboardData?.stats?.pendingApplications || 0, icon: <HourglassEmptyIcon sx={{ color: '#ed6c02' }} /> },
        { label: 'Approved', value: dashboardData?.stats?.approvedApplications || 0, icon: <CheckCircleIcon sx={{ color: '#2e7d32' }} /> },
        { label: 'Rejected', value: dashboardData?.stats?.rejectedApplications || 0, icon: <HighlightOffIcon sx={{ color: '#d32f2f' }} /> }
    ];

    const quickActions = [
        { label: 'Apply for Scholarship', icon: <PostAddIcon />, tab: 'apply' },
        { label: 'Track Application', icon: <TrackChangesIcon />, tab: 'status' }
    ];

    const verificationTimeline = [
        { label: 'Submitted', completed: true },
        { label: 'Data Verification', completed: ['In Progress', 'Under Verification', 'Hold', 'Approved', 'Rejected'].includes(currentApplication?.status) },
        { label: 'Income Verification', completed: ['Under Verification', 'Hold', 'Approved', 'Rejected'].includes(currentApplication?.status) },
        { label: 'Fee Verification', completed: ['Under Verification', 'Hold', 'Approved', 'Rejected'].includes(currentApplication?.status) },
        { label: 'Admin Review', completed: ['Hold', 'Approved', 'Rejected'].includes(currentApplication?.status) },
        { label: 'Final Decision', completed: ['Approved', 'Rejected'].includes(currentApplication?.status) }
    ];

    const statusReason = currentApplication?.remarks || currentApplication?.rejection_reason || currentApplication?.hold_reason || 'No remarks available.';

    const handleLogout = () => {
        clearSession('Student');
        navigate('/', { replace: true });
    };

    const handleMarkRead = async (id) => {
        try {
            await api.put(`/student/notifications/${id}/read`);
            await reloadDashboard();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update notification.');
        }
    };

    const handleProfileField = (field, value) => {
        setProfileForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();
        setProfileSaving(true);
        setProfileError('');
        setProfileSuccess('');
        try {
            const res = await api.put('/student/profile', { ...profileForm });
            if (res.data?.token && res.data?.user) {
                updateSessionToken(res.data.token, res.data.user, 'Student');
            } else {
                updateSessionUser({
                    ...getUser('Student'),
                    name: profileForm.fullName,
                    email: profileForm.email,
                    region: profileForm.region,
                    district: profileForm.district
                });
            }
            await Promise.all([reloadDashboard(), reloadProfile()]);
            setProfileSuccess('Profile updated successfully.');
            setProfileForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
        } catch (err) {
            setProfileError(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleApplicationComplete = async () => {
        setTabLoading(true);
        try {
            await Promise.all([reloadDashboard(), reloadProfile()]);
            setCurrentTab('status');
        } finally {
            setTabLoading(false);
        }
    };

    const handleOpenApplication = async (appId) => {
        setApplicationDialogOpen(true);
        setSelectedApplication(null);
        setDetailLoading(true);
        try {
            const res = await api.get(`/student/applications/${appId}`);
            setSelectedApplication(res.data.application);
        } catch {
            setSelectedApplication(applications.find((item) => item.id === appId) || null);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDocumentReplace = async (docId, file) => {
        if (!file) return;
        setDocumentBusyId(docId);
        try {
            const base64 = await fileToBase64(file);
            await api.put(`/student/documents/${docId}`, {
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileSize: file.size,
                fileDataBase64: base64
            });
            await reloadProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to replace document.');
        } finally {
            setDocumentBusyId('');
        }
    };

    const handleDocumentUpload = async (file) => {
        if (!file) return;
        setDocumentBusyId('profile');
        try {
            const base64 = await fileToBase64(file);
            const res = await api.put('/student/profile', {
                ...profileForm,
                studentPhoto: {
                    fileName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    fileDataBase64: base64
                }
            });
            if (res.data?.token && res.data?.user) {
                updateSessionToken(res.data.token, res.data.user, 'Student');
            }
            await Promise.all([reloadDashboard(), reloadProfile()]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload document.');
        } finally {
            setDocumentBusyId('');
        }
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f4f7fa' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f4f7fa', pb: { xs: 10, md: 0 } }}>
            <AppBar position="fixed" color="inherit" elevation={0} sx={{ height: HEADER_HEIGHT, justifyContent: 'center', borderBottom: '1px solid #e2e8f0', bgcolor: 'white', zIndex: (theme) => theme.zIndex.drawer + 2 }}>
                <Toolbar sx={{ minHeight: `${HEADER_HEIGHT}px !important`, px: { xs: 2, md: 0 } }}>
                    <Box sx={{ width: '100%', maxWidth: '1400px', mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <SchoolIcon sx={{ color: '#004d61', fontSize: 28 }} />
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d61' }}>
                                EduVerify
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton size="small" onClick={(event) => setNotificationAnchor(event.currentTarget)}>
                                <Badge badgeContent={unreadCount} color="error">
                                    <NotificationsIcon sx={{ color: '#627d98' }} />
                                </Badge>
                            </IconButton>
                            <IconButton size="small" onClick={handleLogout}>
                                <LogoutIcon sx={{ color: '#c62828' }} />
                            </IconButton>
                            <Avatar 
                                onClick={() => setCurrentTab('profile')} 
                                sx={{ width: 34, height: 34, bgcolor: '#0b2a5c', fontWeight: 700, cursor: 'pointer', transition: '0.2s', '&:hover': { opacity: 0.8 } }}
                            >
                                {(student?.fullName || user?.name || 'ST').slice(0, 2).toUpperCase()}
                            </Avatar>
                        </Box>
                    </Box>
                </Toolbar>
            </AppBar>
            <Box sx={{ pt: `${HEADER_HEIGHT}px` }}>
                <Box
                    sx={{
                        position: 'fixed',
                        top: `${HEADER_HEIGHT}px`,
                        left: 0,
                        width: `${SIDEBAR_WIDTH}px`,
                        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                        bgcolor: 'white',
                        borderRight: '1px solid #e2e8f0',
                        display: { xs: 'none', md: 'block' },
                        p: 2.5
                    }}
                >
                    <Stack spacing={1}>
                        {sidebarItems.map((item) => (
                            <Button
                                key={item.value}
                                startIcon={item.icon}
                                onClick={() => setCurrentTab(item.value)}
                                variant={currentTab === item.value ? 'contained' : 'text'}
                                sx={{
                                    justifyContent: 'flex-start',
                                    px: 2,
                                    py: 1.4,
                                    borderRadius: 2,
                                    bgcolor: currentTab === item.value ? '#0b2a5c' : 'transparent',
                                    color: currentTab === item.value ? 'white' : '#334e68',
                                    '&:hover': { bgcolor: currentTab === item.value ? '#0b2a5c' : '#f1f5f9' }
                                }}
                            >
                                {item.label}
                            </Button>
                        ))}
                        <Button startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ justifyContent: 'flex-start', px: 2, py: 1.4, borderRadius: 2, color: '#c62828' }}>
                            Logout
                        </Button>
                    </Stack>
                </Box>

                <Box
                    component="main"
                    sx={{
                        ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
                        px: { xs: 2, sm: 3, md: 4 },
                        py: { xs: 3, md: 4 }
                    }}
                >
                    <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
                        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                        {tabLoading && <LinearProgress sx={{ mb: 3, borderRadius: 999 }} />}

                        {currentTab === 'home' && (
                            <Stack spacing={3.5}>
                                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f1e36' }}>
                                            Hello, {student?.fullName || 'Student'}
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: '#627d98', mt: 1 }}>
                                            Here is your scholarship application overview.
                                        </Typography>
                                    </CardContent>
                                </Card>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5 }}>
                                    {summaryCards.map((card) => (
                                        <Card key={card.label} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                            <CardContent sx={{ p: 2.5 }}>
                                                <Typography variant="caption" sx={{ color: '#627d98', fontWeight: 700 }}>
                                                    {card.label}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                                                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                                        {card.value}
                                                    </Typography>
                                                    {card.icon}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>

                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
                                    {quickActions.map((action) => (
                                        <Card
                                            key={action.label}
                                            onClick={() => setCurrentTab(action.tab)}
                                            sx={{
                                                cursor: 'pointer',
                                                borderRadius: 3,
                                                border: '1px solid #e2e8f0',
                                                boxShadow: 'none',
                                                '&:hover': { borderColor: '#0b2a5c' }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ bgcolor: '#eef5fb', color: '#0b2a5c', width: 40, height: 40 }}>
                                                        {action.icon}
                                                    </Avatar>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f1e36' }}>
                                                        {action.label}
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>

                                <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f1e36', mb: 2 }}>
                                            Recent Activity
                                        </Typography>
                                        <TableContainer>
                                            <Table sx={{ minWidth: 640 }}>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700 }}>Scholarship Name</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Submission Date</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Current Status</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(applications.slice(0, 5)).length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={3} sx={{ py: 4, textAlign: 'center', color: '#627d98' }}>
                                                                No applications found.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        applications.slice(0, 5).map((app) => (
                                                            <TableRow key={app.id}>
                                                                <TableCell sx={{ fontWeight: 600 }}>
                                                                    Scholarship Application {app.application_number}
                                                                </TableCell>
                                                                <TableCell>{formatDate(app.created_at)}</TableCell>
                                                                <TableCell>{getStatusChip(app.status)}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}

                        {currentTab === 'apply' && (
                            <ScholarshipForm profile={profileView} referenceData={referenceData} onComplete={handleApplicationComplete} />
                        )}

                        {currentTab === 'status' && (
                            <Stack spacing={3}>
                                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f1e36', mb: 0.5 }}>
                                            Application Status
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#627d98', mb: 3 }}>
                                            Track status, verification result, and review details for your submitted applications.
                                        </Typography>

                                        {currentApplication ? (
                                            <Stack spacing={3}>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ color: '#627d98' }}>
                                                            Current Status
                                                        </Typography>
                                                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f1e36', mt: 0.5 }}>
                                                            {currentApplication.application_number}
                                                        </Typography>
                                                    </Box>
                                                    {getStatusChip(currentApplication.status)}
                                                </Box>

                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
                                                    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="caption" sx={{ color: '#627d98', fontWeight: 700 }}>Application ID</Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>{currentApplication.application_number}</Typography>
                                                        </CardContent>
                                                    </Card>
                                                    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="caption" sx={{ color: '#627d98', fontWeight: 700 }}>Submission Date</Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>{formatDate(currentApplication.created_at)}</Typography>
                                                        </CardContent>
                                                    </Card>
                                                    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="caption" sx={{ color: '#627d98', fontWeight: 700 }}>Assigned Region</Typography>
                                                            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
                                                                {student?.personalInformation?.region || profileForm.region || '-'}
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Box>

                                                <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                    <CardContent>
                                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Verification Timeline</Typography>
                                                        <Stack spacing={2}>
                                                            {verificationTimeline.map((step, index) => (
                                                                <Box key={step.label}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{step.label}</Typography>
                                                                        <Chip label={step.completed ? 'Completed' : 'Pending'} size="small" color={step.completed ? 'success' : 'default'} />
                                                                    </Box>
                                                                    {index < verificationTimeline.length - 1 && (
                                                                        <Typography variant="body2" sx={{ color: '#cbd5e1', pl: 0.5 }}>
                                                                            ↓
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>

                                                <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                    <CardContent>
                                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Remarks</Typography>
                                                        <Typography variant="body2" sx={{ color: '#0f1e36', fontWeight: 600 }}>
                                                            Status: {statusChipLabel(currentApplication.status).toUpperCase()}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ mt: 1, color: '#627d98' }}>
                                                            Reason:
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                            {statusReason}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Stack>
                                        ) : (
                                            <Alert severity="info">No applications submitted yet.</Alert>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>All Applications</Typography>
                                        <TableContainer>
                                            <Table sx={{ minWidth: 860 }}>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700 }}>Application ID</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Submission Date</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Application Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Verification Result</TableCell>
                                                        <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {applications.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} sx={{ py: 5, textAlign: 'center', color: '#627d98' }}>
                                                                No applications submitted yet.
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        applications.map((app) => (
                                                            <TableRow key={app.id}>
                                                                <TableCell sx={{ fontWeight: 600 }}>{app.application_number}</TableCell>
                                                                <TableCell>{formatDate(app.created_at)}</TableCell>
                                                                <TableCell>{getStatusChip(app.status)}</TableCell>
                                                                <TableCell>{app.auto_eligibility_status || '-'}</TableCell>
                                                                <TableCell>
                                                                    <Button variant="outlined" onClick={() => handleOpenApplication(app.id)}>
                                                                        View Details
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}

                        {currentTab === 'profile' && (
                            <Stack spacing={3}>
                                <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f1e36', mb: 0.5 }}>
                                            Profile
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#627d98', mb: 3 }}>
                                            Keep your profile, security, and parent information up to date.
                                        </Typography>

                                        {profileError && <Alert severity="error" sx={{ mb: 3 }}>{profileError}</Alert>}
                                        {profileSuccess && <Alert severity="success" sx={{ mb: 3 }}>{profileSuccess}</Alert>}

                                        <Box component="form" onSubmit={handleProfileSave}>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 280px) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
                                                <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                        <Avatar sx={{ width: 96, height: 96, bgcolor: '#0b2a5c', fontSize: 28 }}>
                                                            {(profileForm.fullName || 'ST').slice(0, 2).toUpperCase()}
                                                        </Avatar>
                                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{profileForm.fullName || 'Student'}</Typography>
                                                        <Typography variant="body2" sx={{ color: '#627d98' }}>{profileForm.studentId || '-'}</Typography>
                                                        <Typography variant="body2" sx={{ color: '#627d98' }}>{profileForm.email || '-'}</Typography>
                                                        <Button component="label" variant="outlined" disabled={documentBusyId === 'profile'}>
                                                            Profile Photo
                                                            <input hidden type="file" accept="image/*" onChange={(event) => handleDocumentUpload(event.target.files?.[0])} />
                                                        </Button>
                                                    </CardContent>
                                                </Card>

                                                <Stack spacing={3} sx={{ minWidth: 0, width: '100%' }}>
                                                    <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Personal Details</Typography>
                                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                                                                <TextField label="Name" value={profileForm.fullName} onChange={(e) => handleProfileField('fullName', e.target.value)} fullWidth />
                                                                <TextField label="Student ID" value={profileForm.studentId} disabled fullWidth />
                                                                <TextField label="Email" value={profileForm.email} onChange={(e) => handleProfileField('email', e.target.value)} fullWidth />
                                                                <TextField label="Phone Number" value={profileForm.phone} onChange={(e) => handleProfileField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} fullWidth />
                                                                <TextField label="Date of Birth" type="date" value={profileForm.dateOfBirth} onChange={(e) => handleProfileField('dateOfBirth', e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                                                                <TextField select label="Gender" value={profileForm.gender} onChange={(e) => handleProfileField('gender', e.target.value)} fullWidth>
                                                                    {PROFILE_GENDERS.map((option) => (
                                                                        <MenuItem key={option} value={option}>{option}</MenuItem>
                                                                    ))}
                                                                </TextField>
                                                                <TextField label="Address" value={profileForm.address} onChange={(e) => handleProfileField('address', e.target.value)} fullWidth multiline minRows={3} sx={{ gridColumn: { md: '1 / span 2' } }} />
                                                                <TextField select label="Region" value={profileForm.region} onChange={(e) => {
                                                                    handleProfileField('region', e.target.value);
                                                                    handleProfileField('district', '');
                                                                }} fullWidth>
                                                                    {Object.keys(referenceData?.regionsAndDistricts || FALLBACK_REFERENCE_DATA.regionsAndDistricts).map((region) => (
                                                                        <MenuItem key={region} value={region}>{region}</MenuItem>
                                                                    ))}
                                                                </TextField>
                                                                <TextField select label="District" value={profileForm.district} onChange={(e) => handleProfileField('district', e.target.value)} fullWidth>
                                                                    {districts.map((district) => (
                                                                        <MenuItem key={district} value={district}>{district}</MenuItem>
                                                                    ))}
                                                                </TextField>
                                                            </Box>
                                                        </CardContent>
                                                    </Card>

                                                    <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Academic Details</Typography>
                                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                                                                <TextField label="School / Institution Name" value={profileForm.institutionName} onChange={(e) => handleProfileField('institutionName', e.target.value)} fullWidth sx={{ gridColumn: { md: '1 / span 2' } }} />
                                                                <TextField select label="Institution Type" value={profileForm.institutionType} onChange={(e) => handleProfileField('institutionType', e.target.value)} fullWidth>
                                                                    <MenuItem value="School">School</MenuItem>
                                                                    <MenuItem value="College">College / University</MenuItem>
                                                                </TextField>
                                                                <TextField label="Class / Grade / Year" value={profileForm.courseGrade} onChange={(e) => handleProfileField('courseGrade', e.target.value)} fullWidth />
                                                                <TextField label="Academic Year" placeholder="e.g. 2025-26" value={profileForm.academicYear} onChange={(e) => handleProfileField('academicYear', e.target.value)} fullWidth />
                                                                <TextField select label="Semester (optional)" value={profileForm.semester} onChange={(e) => handleProfileField('semester', e.target.value)} fullWidth slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                                                                    <MenuItem value=""><em>Not Applicable</em></MenuItem>
                                                                    {[1,2,3,4,5,6,7,8].map((s) => (
                                                                        <MenuItem key={s} value={String(s)}>Semester {s}</MenuItem>
                                                                    ))}
                                                                </TextField>
                                                            </Box>
                                                        </CardContent>
                                                    </Card>

                                                    <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Parent Details</Typography>
                                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                                                                <TextField label="Father Name" value={profileForm.fatherName} onChange={(e) => handleProfileField('fatherName', e.target.value)} fullWidth />
                                                                <TextField label="Father Aadhaar" value={profileForm.fatherAadhaar} onChange={(e) => handleProfileField('fatherAadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} fullWidth />
                                                                <TextField label="Mother Name" value={profileForm.motherName} onChange={(e) => handleProfileField('motherName', e.target.value)} fullWidth />
                                                                <TextField label="Mother Aadhaar" value={profileForm.motherAadhaar} onChange={(e) => handleProfileField('motherAadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} fullWidth />
                                                            </Box>
                                                        </CardContent>
                                                    </Card>

                                                    <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Income</Typography>
                                                            <Typography variant="body2" sx={{ color: '#627d98' }}>
                                                                Income is verified automatically from the backend tax records and fee database.
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>

                                                    <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                                        <CardContent>
                                                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Security</Typography>
                                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                                                                <TextField label="Current Password" type="password" value={profileForm.currentPassword} onChange={(e) => handleProfileField('currentPassword', e.target.value)} fullWidth />
                                                                <TextField label="New Password" type="password" value={profileForm.newPassword} onChange={(e) => handleProfileField('newPassword', e.target.value)} fullWidth />
                                                            </Box>
                                                        </CardContent>
                                                    </Card>

                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                                                        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={profileSaving} sx={{ bgcolor: '#0b2a5c' }}>
                                                            {profileSaving ? 'Saving...' : 'Save Changes'}
                                                        </Button>
                                                        <Button variant="outlined" color="error" onClick={handleLogout}>
                                                            Logout
                                                        </Button>
                                                    </Box>
                                                </Stack>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}
                    </Box>
                </Box>
            </Box>
            <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: { xs: 'block', md: 'none' }, zIndex: 1000, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
                <BottomNavigation showLabels value={currentTab} onChange={(event, newValue) => setCurrentTab(newValue)}>
                    <BottomNavigationAction label="Home" value="home" icon={<HomeIcon />} />
                    <BottomNavigationAction label="Apply" value="apply" icon={<PostAddIcon />} />
                    <BottomNavigationAction label="Status" value="status" icon={<TrackChangesIcon />} />
                </BottomNavigation>
            </Box>
            <Menu
                anchorEl={notificationAnchor}
                open={Boolean(notificationAnchor)}
                onClose={() => setNotificationAnchor(null)}
                PaperProps={{
                    sx: {
                        mt: 1.5,
                        width: 380,
                        maxWidth: 'calc(100vw - 24px)',
                        borderRadius: 3,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 18px 48px rgba(15, 30, 54, 0.12)'
                    }
                }}
            >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f1e36' }}>
                        Notifications
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#627d98' }}>
                        Latest updates
                    </Typography>
                </Box>
                <Box sx={{ maxHeight: 420, overflowY: 'auto', px: 2, py: 1 }}>
                    <List disablePadding>
                        {notifications.length === 0 ? (
                            <ListItem>
                                <ListItemText primary="No notifications available." />
                            </ListItem>
                        ) : (
                            notifications.slice(0, 5).map((item, index) => (
                                <React.Fragment key={item.id}>
                                    {index > 0 && <Divider />}
                                    <ListItem
                                        secondaryAction={
                                            !item.read_status && (
                                                <IconButton onClick={() => handleMarkRead(item.id)}>
                                                    <MarkEmailReadIcon color="success" />
                                                </IconButton>
                                            )
                                        }
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                        {item.title}
                                                    </Typography>
                                                    {!item.read_status && <Chip label="Unread" size="small" color="error" />}
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                        {item.message}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                                        {formatDate(item.created_at, true)}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                </React.Fragment>
                            ))
                        )}
                    </List>
                </Box>
            </Menu>
            <Dialog
                open={applicationDialogOpen}
                onClose={() => {
                    setApplicationDialogOpen(false);
                    setSelectedApplication(null);
                }}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#0f1e36' }}>
                    {detailLoading ? 'Loading Application...' : `Application Details${selectedApplication ? ` - ${selectedApplication.application_number}` : ''}`}
                </DialogTitle>
                <DialogContent dividers>
                    {detailLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : selectedApplication && (
                        <Stack spacing={3}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
                                <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Student Information</Typography>
                                        <Typography variant="body2">Name: {selectedApplication.details?.student_name || student?.fullName || '-'}</Typography>
                                        <Typography variant="body2">Student ID: {selectedApplication.details?.student_identifier || student?.studentId || '-'}</Typography>
                                        <Typography variant="body2">Institution: {selectedApplication.details?.school_name || '-'}</Typography>
                                        <Typography variant="body2">Class / Grade: {selectedApplication.details?.class_grade || '-'}</Typography>
                                    </CardContent>
                                </Card>

                                <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Application Remarks</Typography>
                                        <Typography variant="body2">Status: {selectedApplication.status || '-'}</Typography>
                                        <Typography variant="body2" sx={{ mt: 1 }}>Result: {selectedApplication.auto_eligibility_status || '-'}</Typography>
                                        <Typography variant="body2" sx={{ mt: 1 }}>Remarks: {selectedApplication.remarks || selectedApplication.rejection_reason || selectedApplication.hold_reason || '-'}</Typography>
                                    </CardContent>
                                </Card>
                            </Box>

                            {selectedApplication.status === 'Rejected' && (
                                <Alert severity="error">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Rejection Reason</Typography>
                                    <Typography variant="body2">{selectedApplication.rejection_reason || selectedApplication.remarks || '-'}</Typography>
                                </Alert>
                            )}

                            {selectedApplication.status === 'Hold' && (
                                <Alert severity="warning">
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Hold Reason</Typography>
                                    <Typography variant="body2">{selectedApplication.hold_reason || '-'}</Typography>
                                </Alert>
                            )}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setApplicationDialogOpen(false);
                        setSelectedApplication(null);
                    }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
