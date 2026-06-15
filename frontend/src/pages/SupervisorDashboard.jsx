import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Tabs,
    Tab,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    MenuItem,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Avatar,
    IconButton,
    CircularProgress,
    FormControl,
    Select,
    InputLabel,
    Divider,
    AppBar,
    Toolbar
} from '@mui/material';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    Legend 
} from 'recharts';
import api from '../api';
import { getToken } from '../utils/auth';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

const REGIONS_AND_DISTRICTS = {
    "North": ["District A", "District B", "District C"],
    "South": ["District D", "District E"],
    "East": ["District F", "District G", "District H"],
    "West": ["District I", "District J"]
};

const COLORS = ['#0b2a5c', '#2e7d32', '#d32f2f', '#ed6c02', '#0288d1'];

export default function SupervisorDashboard() {
    const navigate = useNavigate();
    const { user: supervisor, logout: handleLogout } = usePortalUser('Supervisor', '/supervisor/login');
    const [activeTab, setActiveTab] = useState(0);

    // General Metrics & Chart data
    const [metrics, setMetrics] = useState({ total: 0, approved: 0, rejected: 0, hold: 0, pending: 0 });
    const [regionChartData, setRegionChartData] = useState([]);
    const [pieChartData, setPieChartData] = useState([]);

    // Admin List
    const [admins, setAdmins] = useState([]);
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [editAdminMode, setEditAdminMode] = useState(false);
    const [selectedAdminId, setSelectedAdminId] = useState(null);
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminRegion, setAdminRegion] = useState('');
    const [adminDistrict, setAdminDistrict] = useState('');
    const [tempCredentials, setTempCredentials] = useState(null);

    // Admin Requests List
    const [requests, setRequests] = useState([]);
    
    // Application Monitoring List
    const [applications, setApplications] = useState([]);
    const [appSearch, setAppSearch] = useState('');
    const [appRegion, setAppRegion] = useState('');
    const [appDistrict, setAppDistrict] = useState('');
    const [appStatus, setAppStatus] = useState('');
    const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
    const [selectedAppDocuments, setSelectedAppDocuments] = useState([]);
    const [selectedAppRef, setSelectedAppRef] = useState('');

    // Audit Logs
    const [auditLogs, setAuditLogs] = useState([]);

    // Alert states
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (supervisor) loadDashboardMetrics();
    }, [supervisor]);

    // Load data based on selected tab
    useEffect(() => {
        if (!supervisor) return;
        if (activeTab === 0) {
            loadDashboardMetrics();
        } else if (activeTab === 1) {
            loadAdmins();
        } else if (activeTab === 2) {
            loadAdminRequests();
        } else if (activeTab === 3) {
            loadApplications();
        } else if (activeTab === 4) {
            loadAuditLogs();
        }
    }, [activeTab, supervisor]);

    useAutoRefresh(() => {
        if (!supervisor) return;
        if (activeTab === 0) loadDashboardMetrics(true);
        else if (activeTab === 1) loadAdmins(true);
        else if (activeTab === 2) loadAdminRequests(true);
        else if (activeTab === 3) loadApplications(true);
        else if (activeTab === 4) loadAuditLogs(true);
    }, [activeTab, supervisor, appRegion, appDistrict, appStatus, appSearch]);

    const loadDashboardMetrics = async () => {
        try {
            const res = await api.get('/supervisor/dashboard-metrics');
            setMetrics(res.data.metrics);
            
            // Format Region Chart Data
            const regionData = res.data.regionStats.map(item => ({
                name: item.region,
                Applications: parseInt(item.count)
            }));
            setRegionChartData(regionData);

            // Format Pie Chart Data
            const pieData = res.data.statusBreakdown.map(item => ({
                name: item.status,
                value: parseInt(item.count)
            }));
            setPieChartData(pieData);
        } catch (err) {
            console.error(err);
        }
    };

    const loadAdmins = async () => {
        try {
            const res = await api.get('/supervisor/admins');
            setAdmins(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadAdminRequests = async () => {
        try {
            const res = await api.get('/supervisor/admin-requests');
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const openDocumentsDialog = (app) => {
        setSelectedAppRef(app.application_number || app.id);
        setSelectedAppDocuments(app.uploaded_documents || []);
        setDocumentsDialogOpen(true);
    };

    const loadApplications = async () => {
        try {
            const queryParams = new URLSearchParams({
                region: appRegion,
                district: appDistrict,
                status: appStatus,
                search: appSearch
            }).toString();
            const res = await api.get(`/supervisor/applications?${queryParams}`);
            setApplications(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadAuditLogs = async () => {
        try {
            const res = await api.get('/supervisor/audit-logs');
            setAuditLogs(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateOrEditAdmin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (editAdminMode) {
                await api.put(`/supervisor/admins/${selectedAdminId}`, {
                    name: adminName,
                    region: adminRegion,
                    district: adminDistrict
                });
                setSuccessMsg("Admin updated successfully.");
                loadAdmins();
                setAdminDialogOpen(false);
            } else {
                const res = await api.post('/supervisor/admins', {
                    name: adminName,
                    email: adminEmail,
                    region: adminRegion,
                    district: adminDistrict
                });
                setTempCredentials(res.data.credentials);
                setSuccessMsg(res.data.message);
                loadAdmins();
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Operation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdminCreate = () => {
        setEditAdminMode(false);
        setAdminName('');
        setAdminEmail('');
        setAdminRegion('');
        setAdminDistrict('');
        setTempCredentials(null);
        setErrorMsg('');
        setSuccessMsg('');
        setAdminDialogOpen(true);
    };

    const handleOpenAdminEdit = (adminUser) => {
        setEditAdminMode(true);
        setSelectedAdminId(adminUser.id);
        setAdminName(adminUser.name);
        setAdminEmail(adminUser.email);
        setAdminRegion(adminUser.region);
        setAdminDistrict(adminUser.district);
        setTempCredentials(null);
        setErrorMsg('');
        setSuccessMsg('');
        setAdminDialogOpen(true);
    };

    const handleSuspendAdmin = async (id) => {
        try {
            await api.put(`/supervisor/admins/${id}/suspend`);
            loadAdmins();
        } catch (err) {
            console.error(err);
        }
    };

    const handleActivateAdmin = async (id) => {
        try {
            await api.put(`/supervisor/admins/${id}/activate`);
            loadAdmins();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (window.confirm("Are you sure you want to delete this admin account?")) {
            try {
                await api.delete(`/supervisor/admins/${id}`);
                loadAdmins();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleRequestAction = async (id, action) => {
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await api.post(`/supervisor/admin-requests/${id}/action`, { action });
            if (action === 'Approve') {
                setTempCredentials(res.data.credentials);
                setSuccessMsg("Admin Request Approved. Credentials generated.");
            } else {
                setSuccessMsg("Access request rejected.");
            }
            loadAdminRequests();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to process request.");
        }
    };

    const handleExport = (type, format) => {
        const token = getToken('Supervisor');
        const url = `http://localhost:5000/api/reports/export?type=${type}&format=${format}&token=${token}`;
        window.open(url, '_blank');
    };

    const getStatusChip = (status) => {
        switch (status) {
            case 'Approved':
                return <Chip label="Approved" color="success" size="small" sx={{ fontWeight: 600 }} />;
            case 'Rejected':
                return <Chip label="Rejected" color="error" size="small" sx={{ fontWeight: 600 }} />;
            case 'Hold':
                return <Chip label="Hold" color="warning" size="small" sx={{ fontWeight: 600 }} />;
            case 'In Progress':
            default:
                return <Chip label="In Progress" color="info" size="small" sx={{ fontWeight: 600 }} />;
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f4f7fa', pb: 6 }}>
            {/* Header */}
            <AppBar position="static" color="inherit" elevation={1} sx={{ borderBottom: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Container maxWidth="xl">
                    <Toolbar sx={{ justifyContent: 'space-between', px: '0px !important' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <SupervisorAccountIcon sx={{ color: '#0b2a5c', fontSize: 32 }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0b2a5c', lineHeight: 1.1 }}>
                                    Supervisor Console
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#627d98', display: 'block' }}>
                                    EduVerify Registry
                                </Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Button 
                                variant="outlined" 
                                color="primary" 
                                size="small" 
                                onClick={() => navigate('/fees')}
                            >
                                Fee Database
                            </Button>
                            <Button 
                                variant="outlined" 
                                color="error" 
                                size="small" 
                                startIcon={<LogoutIcon />} 
                                onClick={handleLogout}
                            >
                                Log Out
                            </Button>
                            <Avatar sx={{ bgcolor: '#0b2a5c', width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                                {supervisor?.name?.slice(0, 2).toUpperCase()}
                            </Avatar>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>
            {/* Main Tabs Container */}
            <Container maxWidth="xl" sx={{ mt: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} textColor="primary" indicatorColor="primary">
                        <Tab label="Dashboard Analytics" sx={{ fontWeight: 700 }} />
                        <Tab label="Admin Accounts" sx={{ fontWeight: 700 }} />
                        <Tab label="Access Requests" sx={{ fontWeight: 700 }} />
                        <Tab label="Application Monitor" sx={{ fontWeight: 700 }} />
                        <Tab label="System Audit Logs" sx={{ fontWeight: 700 }} />
                    </Tabs>
                </Box>

                {/* TAB 0: DASHBOARD STATS */}
                {activeTab === 0 && (
                    <Box>
                        {/* Metrics Cards */}
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            {['Total Applications', 'Approved', 'Rejected', 'Hold', 'Pending Review'].map((label, idx) => {
                                const vals = [metrics.total, metrics.approved, metrics.rejected, metrics.hold, metrics.pending];
                                return (
                                    <Grid
                                        key={label}
                                        size={{
                                            xs: 6,
                                            md: 2.4
                                        }}>
                                        <Card sx={{ borderLeft: `4px solid ${COLORS[idx]}` }}>
                                            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                                <Typography variant="caption" sx={{ color: '#627d98', fontWeight: 600 }}>{label}</Typography>
                                                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>{vals[idx] || 0}</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        {/* Charts Section */}
                        <Grid container spacing={3}>
                            {/* Region wise bar chart */}
                            <Grid
                                size={{
                                    xs: 12,
                                    md: 7
                                }}>
                                <Card sx={{ height: 400, border: '1px solid #e2e8f0' }}>
                                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                            Region-Wise Applications Allocation
                                        </Typography>
                                        <Box sx={{ flexGrow: 1, width: '100%', height: 300 }}>
                                            {regionChartData.length === 0 ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                                                    No regional data available
                                                </Box>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={regionChartData}>
                                                        <XAxis dataKey="name" stroke="#627d98" fontSize={12} />
                                                        <YAxis stroke="#627d98" fontSize={12} />
                                                        <Tooltip />
                                                        <Bar dataKey="Applications" fill="#0b2a5c" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Status distribution pie chart */}
                            <Grid
                                size={{
                                    xs: 12,
                                    md: 5
                                }}>
                                <Card sx={{ height: 400, border: '1px solid #e2e8f0' }}>
                                    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                            Approval Statistics Breakdown
                                        </Typography>
                                        <Box sx={{ flexGrow: 1, width: '100%', height: 300 }}>
                                            {pieChartData.length === 0 ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
                                                    No status data available
                                                </Box>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieChartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {pieChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend verticalAlign="bottom" height={36} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* TAB 1: ADMIN ACCOUNTS */}
                {activeTab === 1 && (
                    <Box>
                        {/* Actions Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f1e36' }}>
                                Admin User Directories
                            </Typography>
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />} 
                                onClick={handleOpenAdminCreate}
                                sx={{ bgcolor: '#0b2a5c' }}
                            >
                                Register New Admin
                            </Button>
                        </Box>

                        {/* Admin Table */}
                        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f8fafd' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Assigned Region</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Assigned District</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Date Created</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {admins.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#627d98' }}>
                                                No administrative accounts registered yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        admins.map((adm) => (
                                            <TableRow key={adm.id}>
                                                <TableCell sx={{ fontWeight: 600 }}>{adm.name}</TableCell>
                                                <TableCell>{adm.email}</TableCell>
                                                <TableCell><Chip label={adm.region} size="small" variant="outlined" /></TableCell>
                                                <TableCell><Chip label={adm.district} size="small" variant="outlined" /></TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={adm.status} 
                                                        size="small" 
                                                        color={adm.status === 'Active' ? 'success' : 'error'}
                                                        sx={{ fontWeight: 600, borderRadius: 1 }}
                                                    />
                                                </TableCell>
                                                <TableCell>{new Date(adm.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell align="right">
                                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                        <IconButton color="primary" onClick={() => handleOpenAdminEdit(adm)} size="small">
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        {adm.status === 'Active' ? (
                                                            <IconButton color="warning" onClick={() => handleSuspendAdmin(adm.id)} title="Suspend Admin" size="small">
                                                                <BlockIcon fontSize="small" />
                                                            </IconButton>
                                                        ) : (
                                                            <IconButton color="success" onClick={() => handleActivateAdmin(adm.id)} title="Activate Admin" size="small">
                                                                <CheckCircleIcon fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                        <IconButton color="error" onClick={() => handleDeleteAdmin(adm.id)} size="small">
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 2: ACCESS REQUESTS */}
                {activeTab === 2 && (
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#0f1e36' }}>
                            Administrative Access Requests
                        </Typography>

                        {successMsg && tempCredentials && (
                            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setTempCredentials(null)}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    Admin Account Created Successfully!
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    Please provide these temporary credentials to the employee:
                                </Typography>
                                <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f4f7fa', borderRadius: 1, fontFamily: 'monospace' }}>
                                    <strong>Email:</strong> {tempCredentials.email}<br />
                                    <strong>Temporary Password:</strong> {tempCredentials.password}
                                </Box>
                            </Alert>
                        )}

                        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f8fafd' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Employee Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Employee ID</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Designation</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Mobile</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Requested Region</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Requested District</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {requests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 3, color: '#627d98' }}>
                                                No admin access requests submitted yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        requests.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell sx={{ fontWeight: 600 }}>{req.employee_name}</TableCell>
                                                <TableCell>{req.employee_id}</TableCell>
                                                <TableCell>{req.designation}</TableCell>
                                                <TableCell>{req.email}</TableCell>
                                                <TableCell>{req.mobile}</TableCell>
                                                <TableCell><Chip label={req.region} size="small" variant="outlined" /></TableCell>
                                                <TableCell><Chip label={req.district} size="small" variant="outlined" /></TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={req.status} 
                                                        size="small" 
                                                        color={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'error' : 'warning'}
                                                        sx={{ fontWeight: 600, borderRadius: 1 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {req.status === 'Pending' ? (
                                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                            <Button 
                                                                variant="contained" 
                                                                size="small" 
                                                                color="success" 
                                                                startIcon={<CheckIcon />}
                                                                onClick={() => handleRequestAction(req.id, 'Approve')}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button 
                                                                variant="outlined" 
                                                                size="small" 
                                                                color="error" 
                                                                startIcon={<CloseIcon />}
                                                                onClick={() => handleRequestAction(req.id, 'Reject')}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                                            Processed
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 3: APPLICATION MONITORING */}
                {activeTab === 3 && (
                    <Box>
                        {/* Filters Card */}
                        <Card sx={{ mb: 3, border: '1px solid #e2e8f0' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 3
                                        }}>
                                        <TextField
                                            fullWidth
                                            placeholder="Search by student, ID, app no..."
                                            value={appSearch}
                                            onChange={(e) => setAppSearch(e.target.value)}
                                            slotProps={{
                                                input: {
                                                    startAdornment: <SearchIcon sx={{ color: '#94a3b8', mr: 1 }} />,
                                                },
                                            }}
                                        />
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 2
                                        }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Region</InputLabel>
                                            <Select
                                                label="Region"
                                                value={appRegion}
                                                onChange={(e) => {
                                                    setAppRegion(e.target.value);
                                                    setAppDistrict('');
                                                }}
                                            >
                                                <MenuItem value="">All Regions</MenuItem>
                                                {Object.keys(REGIONS_AND_DISTRICTS).map(r => (
                                                    <MenuItem key={r} value={r}>{r}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 2
                                        }}>
                                        <FormControl fullWidth size="small" disabled={!appRegion}>
                                            <InputLabel>District</InputLabel>
                                            <Select
                                                label="District"
                                                value={appDistrict}
                                                onChange={(e) => setAppDistrict(e.target.value)}
                                            >
                                                <MenuItem value="">All Districts</MenuItem>
                                                {appRegion && REGIONS_AND_DISTRICTS[appRegion].map(d => (
                                                    <MenuItem key={d} value={d}>{d}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid
                                        size={{
                                            xs: 12,
                                            sm: 2
                                        }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Status</InputLabel>
                                            <Select
                                                label="Status"
                                                value={appStatus}
                                                onChange={(e) => setAppStatus(e.target.value)}
                                            >
                                                <MenuItem value="">All Statuses</MenuItem>
                                                <MenuItem value="In Progress">In Progress</MenuItem>
                                                <MenuItem value="Approved">Approved</MenuItem>
                                                <MenuItem value="Rejected">Rejected</MenuItem>
                                                <MenuItem value="Hold">Hold</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid
                                        sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
                                        size={{
                                            xs: 12,
                                            sm: 3
                                        }}>
                                        <Button variant="contained" size="small" sx={{ bgcolor: '#0b2a5c' }} onClick={loadApplications}>
                                            Apply Filters
                                        </Button>
                                        <Button 
                                            variant="outlined" 
                                            size="small" 
                                            startIcon={<FileDownloadIcon />}
                                            onClick={() => handleExport(appStatus.toLowerCase() || 'applied', 'csv')}
                                        >
                                            Export CSV
                                        </Button>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Monitoring Table */}
                        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f8fafd' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>App Ref</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Student Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Student ID/Roll</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>School / Institution</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Documents</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Jurisdiction</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Auto eligibility</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Final Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Submitted Date</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {applications.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 3, color: '#627d98' }}>
                                                No student applications match your query.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        applications.map((app) => (
                                            <TableRow key={app.id}>
                                                <TableCell sx={{ fontWeight: 600 }}>{app.application_number}</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{app.student_name}</TableCell>
                                                <TableCell>{app.student_roll_number}</TableCell>
                                                <TableCell>{app.college_name} ({app.grade})</TableCell>
                                                <TableCell>
                                                    {app.document_count > 0 ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => openDocumentsDialog(app)}
                                                            sx={{ textTransform: 'none', fontWeight: 600 }}
                                                        >
                                                            {app.document_count} file{app.document_count === 1 ? '' : 's'}
                                                        </Button>
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>None</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>{app.district}, {app.region}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={app.auto_eligibility_status} 
                                                        size="small" 
                                                        color={app.auto_eligibility_status === 'Eligible' ? 'success' : 'error'}
                                                        sx={{ fontWeight: 600, borderRadius: 1 }} 
                                                    />
                                                </TableCell>
                                                <TableCell>{getStatusChip(app.status)}</TableCell>
                                                <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 4: SYSTEM AUDIT LOGS */}
                {activeTab === 4 && (
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#0f1e36' }}>
                            Security Audit Log Records
                        </Typography>

                        <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: '#f8fafd' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Remarks & Verification Notes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {auditLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#627d98' }}>
                                                No system audit logs recorded.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell sx={{ color: '#627d98' }}>
                                                    {new Date(log.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>{log.actor_name || 'System'}</TableCell>
                                                <TableCell>
                                                    <Chip label={log.actor_role} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: '#0b2a5c' }}>
                                                    {log.action}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: 13 }}>{log.remarks}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

            </Container>
            {/* Register / Edit Admin Dialog Form */}
            <Dialog open={adminDialogOpen} onClose={() => setAdminDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 850, color: '#0b2a5c' }}>
                    {editAdminMode ? "Edit Admin Office Jurisdiction" : "Register New Admin User"}
                </DialogTitle>
                <DialogContent dividers>
                    {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
                    {successMsg && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {successMsg}
                            {tempCredentials && (
                                <Box sx={{ mt: 1, p: 1, bgcolor: '#f4f7fa', borderRadius: 1, fontFamily: 'monospace', fontSize: 12 }}>
                                    <strong>Password:</strong> {tempCredentials.password}
                                </Box>
                            )}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleCreateOrEditAdmin}>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Name *</Typography>
                            <TextField
                                fullWidth
                                placeholder="Enter full name"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                required
                            />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Email Address *</Typography>
                            <TextField
                                fullWidth
                                type="email"
                                placeholder="admin@scholarship.gov.in"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                disabled={editAdminMode}
                                required
                            />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Jurisdiction Region *</Typography>
                            <TextField
                                fullWidth
                                select
                                value={adminRegion}
                                onChange={(e) => {
                                    setAdminRegion(e.target.value);
                                    setAdminDistrict('');
                                }}
                                required
                            >
                                {Object.keys(REGIONS_AND_DISTRICTS).map((reg) => (
                                    <MenuItem key={reg} value={reg}>{reg}</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Jurisdiction District *</Typography>
                            <TextField
                                fullWidth
                                select
                                value={adminDistrict}
                                onChange={(e) => setAdminDistrict(e.target.value)}
                                disabled={!adminRegion}
                                required
                            >
                                {adminRegion && REGIONS_AND_DISTRICTS[adminRegion].map((dist) => (
                                    <MenuItem key={dist} value={dist}>{dist}</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <DialogActions sx={{ px: 0, pt: 2 }}>
                            <Button onClick={() => setAdminDialogOpen(false)} color="primary">Cancel</Button>
                            <Button type="submit" variant="contained" disabled={loading} sx={{ bgcolor: '#0b2a5c' }}>
                                {editAdminMode ? "Save Changes" : "Create Account"}
                            </Button>
                        </DialogActions>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={documentsDialogOpen} onClose={() => setDocumentsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Uploaded Documents — {selectedAppRef}
                </DialogTitle>
                <DialogContent dividers>
                    {selectedAppDocuments.length === 0 ? (
                        <Typography sx={{ color: '#627d98' }}>No documents uploaded for this application.</Typography>
                    ) : (
                        selectedAppDocuments.map((doc) => (
                            <Box
                                key={doc.id}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    py: 1.25,
                                    borderBottom: '1px solid #e2e8f0',
                                }}
                            >
                                <Box>
                                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{doc.file_name}</Typography>
                                    <Typography variant="caption" sx={{ color: '#627d98' }}>
                                        {doc.category || 'Document'}
                                        {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                                    </Typography>
                                </Box>
                            </Box>
                        ))
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDocumentsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
