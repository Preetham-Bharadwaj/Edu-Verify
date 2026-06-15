import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    TextField,
    Button,
    MenuItem,
    Alert
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import SendIcon from '@mui/icons-material/Send';
import InfoIcon from '@mui/icons-material/Info';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../api';

const REGIONS_AND_DISTRICTS = {
    "North": ["District A", "District B", "District C"],
    "South": ["District D", "District E"],
    "East": ["District F", "District G", "District H"],
    "West": ["District I", "District J"]
};

export default function AdminRequest() {
    const navigate = useNavigate();

    const [employeeName, setEmployeeName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [designation, setDesignation] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [region, setRegion] = useState('');
    const [district, setDistrict] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const res = await api.post('/auth/admin/request-access', {
                employeeName,
                employeeId,
                designation,
                email,
                mobile,
                region,
                district
            });
            setSuccessMsg(res.data.message);
            // Clear inputs
            setEmployeeName('');
            setEmployeeId('');
            setDesignation('');
            setEmail('');
            setMobile('');
            setRegion('');
            setDistrict('');
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to submit access request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafd', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, px: 2 }}>
            {/* Back to Home Header */}
            <Box sx={{ width: '100%', maxWidth: 800, mb: 2 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => navigate('/')}
                    sx={{ color: '#0b2a5c' }}
                >
                    Back to Portal
                </Button>
            </Box>
            {/* Header Title */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4, textAlign: 'center' }}>
                <ShieldIcon sx={{ fontSize: 48, color: '#0b2a5c', mb: 1.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0b2a5c', mb: 1 }}>
                    Admin Access Request
                </Typography>
                <Typography variant="body1" sx={{ color: '#627d98', maxWidth: 600 }}>
                    Please submit your credentials to request administrative privileges for EduVerify.
                </Typography>
            </Box>
            {/* Form Card */}
            <Card sx={{ width: '100%', maxWidth: 800, borderTop: '4px solid #0b2a5c', mb: 3 }}>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    {errorMsg && <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>}
                    {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}

                    <form onSubmit={handleSubmit}>
                        {/* Section 1: Employee Details */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f1e36', mb: 2 }}>
                            Employee Details
                        </Typography>
                        <Grid container spacing={2.5} sx={{ mb: 4 }}>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Employee Name *</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="Enter full name"
                                    value={employeeName}
                                    onChange={(e) => setEmployeeName(e.target.value)}
                                    required
                                />
                            </Grid>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Employee ID *</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="E.g., EMP-12345"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    required
                                />
                            </Grid>
                            <Grid size={12}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Designation *</Typography>
                                <TextField
                                    fullWidth
                                    placeholder="E.g., Senior Officer / Assistant Commissioner"
                                    value={designation}
                                    onChange={(e) => setDesignation(e.target.value)}
                                    required
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ height: '1px', bgcolor: '#e2e8f0', mb: 4 }} />

                        {/* Section 2: Contact Information */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f1e36', mb: 2 }}>
                            Contact Information
                        </Typography>
                        <Grid container spacing={2.5} sx={{ mb: 4 }}>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 6
                                }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>Official Email *</Typography>
                                <TextField
                                    fullWidth
                                    type="email"
                                    placeholder="employee@government.in"
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
                                    placeholder="+91 XXXXX XXXXX"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    required
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ height: '1px', bgcolor: '#e2e8f0', mb: 4 }} />

                        {/* Section 3: Jurisdiction */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f1e36', mb: 2 }}>
                            Jurisdiction
                        </Typography>
                        <Grid container spacing={2.5} sx={{ mb: 4 }}>
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
                        </Grid>

                        {/* Submit Button */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                                sx={{ py: 1.2, px: 4, bgcolor: '#0b2a5c' }}
                            >
                                {loading ? "Submitting..." : "Submit Request"}
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </Card>
            {/* Note banner under card */}
            <Box 
                sx={{ 
                    width: '100%', 
                    maxWidth: 800, 
                    bgcolor: '#e1f5fe', 
                    borderRadius: 2, 
                    border: '1px solid #b3e5fc', 
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2
                }}
            >
                <InfoIcon sx={{ color: '#0288d1', mt: 0.3 }} />
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#01579b' }}>
                            Request Workflow
                        </Typography>
                        <Box 
                            sx={{ 
                                bgcolor: '#b3e5fc', 
                                px: 1.5, 
                                py: 0.2, 
                                borderRadius: 10, 
                                fontSize: 11, 
                                fontWeight: 700, 
                                color: '#01579b' 
                            }}
                        >
                            Pending Approval
                        </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#0277bd', lineHeight: 1.5 }}>
                        Your request will be reviewed by the Regional Supervisor. You will receive an email notification upon approval or rejection. Access provisioning typically takes 1-2 business days.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
