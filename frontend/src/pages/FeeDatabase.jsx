import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
    AppBar,
    Toolbar,
    IconButton,
    Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LanguageIcon from '@mui/icons-material/Language';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';

export default function FeeDatabase() {
    const navigate = useNavigate();
    const { user, logout: handleLogout } = usePortalUser(['Admin', 'Supervisor'], '/portals');
    const [dbRecords, setDbRecords] = useState([]);
    const [search, setSearch] = useState('');
    const [targetUrl, setTargetUrl] = useState('');
    
    // Scraper status states
    const [scraping, setScraping] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (user) fetchFeeDatabase();
    }, [user]);

    useAutoRefresh(() => fetchFeeDatabase(true), [user]);

    const fetchFeeDatabase = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/fees/database');
            setDbRecords(res.data);
        } catch (err) {
            console.error("Error loading fee database:", err);
            setErrorMsg("Failed to load institution fee structures.");
        } finally {
            setLoading(false);
        }
    };

    const handleScrape = async (e) => {
        e.preventDefault();
        if (!targetUrl) return;

        setScraping(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await api.post('/fees/scrape', { url: targetUrl });
            setSuccessMsg(res.data.message);
            setTargetUrl('');
            fetchFeeDatabase();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to trigger crawler on website.");
        } finally {
            setScraping(false);
        }
    };

    // Filter database rows
    const filteredRecords = dbRecords.filter(rec => {
        const query = search.toLowerCase();
        return (
            rec.institution_name.toLowerCase().includes(query) ||
            rec.course_grade.toLowerCase().includes(query) ||
            rec.institution_type.toLowerCase().includes(query)
        );
    });

    const handleBack = () => {
        if (user?.role === 'Supervisor') {
            navigate('/supervisor/dashboard');
        } else {
            navigate('/admin/dashboard');
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f4f7fa', pb: 6 }}>
            {/* Header */}
            <AppBar position="static" color="inherit" elevation={1} sx={{ borderBottom: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Container maxWidth="xl">
                    <Toolbar sx={{ justifyContent: 'space-between', px: '0px !important' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <IconButton onClick={handleBack} color="primary" size="small">
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0b2a5c', lineHeight: 1.1 }}>
                                    Fee Registry Database
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#627d98', display: 'block' }}>
                                    Web-Scraped Tuition and Annual Fee Structures
                                </Typography>
                            </Box>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            <Container maxWidth="xl" sx={{ mt: 4 }}>
                
                {/* Control Panel: Web Crawler Scraper */}
                <Card sx={{ mb: 4, border: '1px solid #e2e8f0' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: '#0b2a5c', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TravelExploreIcon />
                            Trigger Web Scraper Module
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#627d98', mb: 3 }}>
                            Input a school or college website url. The scraper module will read the public tuition rates table and cache them for verification.
                        </Typography>

                        {successMsg && <Alert severity="success" sx={{ mb: 2.5 }}>{successMsg}</Alert>}
                        {errorMsg && <Alert severity="error" sx={{ mb: 2.5 }}>{errorMsg}</Alert>}

                        <Box component="form" onSubmit={handleScrape} sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                            <TextField
                                fullWidth
                                placeholder="E.g., http://example.edu/tuition-fees"
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                disabled={scraping}
                            />
                            <Button 
                                type="submit" 
                                variant="contained" 
                                disabled={scraping}
                                sx={{ bgcolor: '#0b2a5c', minWidth: 160 }}
                            >
                                {scraping ? <CircularProgress size={24} color="inherit" /> : "Run Web Scraper"}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                {/* Filter and Search Box */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f1e36' }}>
                        Cached Fee Structures ({filteredRecords.length})
                    </Typography>
                    <TextField
                        placeholder="Search institutions..."
                        size="small"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <SearchIcon sx={{ color: '#94a3b8', mr: 1 }} />,
                            },
                        }}
                        sx={{ bgcolor: 'white', width: 300 }}
                    />
                </Box>

                {/* Database Table */}
                <TableContainer component={Paper} sx={{ border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8fafd' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Institution Name</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Course / Grade</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Annual Fee (₹)</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Source URL</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Last Updated</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={30} />
                                    </TableCell>
                                </TableRow>
                            ) : filteredRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#627d98' }}>
                                        No fee records found in the database.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecords.map((rec) => (
                                    <TableRow key={rec.id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{rec.institution_name}</TableCell>
                                        <TableCell>
                                            <Chip label={rec.institution_type} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>{rec.course_grade}</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#2e7d32' }}>
                                            ₹ {parseFloat(rec.annual_fee).toLocaleString()}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <a href={rec.source_url} target="_blank" rel="noreferrer" style={{ color: '#0b2a5c', textDecoration: 'none' }}>
                                                {rec.source_url}
                                            </a>
                                        </TableCell>
                                        <TableCell>{new Date(rec.last_updated).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>
        </Box>
    );
}
