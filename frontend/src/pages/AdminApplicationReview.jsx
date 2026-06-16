import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CircularProgress,
    Divider,
    Grid,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FileOpenOutlinedIcon from '@mui/icons-material/FileOpenOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import AdminShell from '../components/admin/AdminShell';
import api from '../api';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePortalUser } from '../hooks/usePortalUser';
import { downloadDocumentFile, openDocumentPreview } from '../utils/documentPreview';
import { formatParentIncomeDisplay } from '../utils/parentIncome';

function formatDate(v) {
    return v ? new Date(v).toLocaleDateString() : '-';
}

function formatCurrency(value) {
    if (value == null || value === '') return null;
    const amount = Number(value);
    if (Number.isNaN(amount)) return null;
    return `₹ ${amount.toLocaleString('en-IN')}`;
}

function Section({ title, children }) {
    return (
        <Card
            sx={{
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
        >
            <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{title}</Typography>
            </Box>
            <Box sx={{ p: 2.5 }}>{children}</Box>
        </Card>
    );
}

function KV({ label, value }) {
    return (
        <Box sx={{ py: 1 }}>
            <Typography
                sx={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.35,
                }}
            >
                {label}
            </Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>
                {value || '—'}
            </Typography>
        </Box>
    );
}

function ChecklistItem({ label, value, onChange }) {
    const options = [
        { opt: 'Verified', bg: '#DCFCE7', color: '#15803D', border: '#86EFAC' },
        { opt: 'Pending',  bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
        { opt: 'Rejected', bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
    ];
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                py: 1.25,
                borderBottom: '1px solid #F1F5F9',
                '&:last-child': { borderBottom: 'none' },
            }}
        >
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</Typography>
            <ToggleButtonGroup
                value={value}
                exclusive
                onChange={(_, v) => { if (v) onChange(v); }}
                size="small"
            >
                {options.map(({ opt, bg, color, border }) => (
                    <ToggleButton
                        key={opt}
                        value={opt}
                        sx={{
                            py: 0.4,
                            px: 1.25,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'none',
                            border: '1px solid #E2E8F0',
                            '&.Mui-selected': {
                                bgcolor: bg,
                                color: color,
                                borderColor: border,
                                '&:hover': { bgcolor: bg },
                            },
                        }}
                    >
                        {opt}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Box>
    );
}

function DecisionButton({ label, icon, activeColor, activeBg, activeBorder, onClick, selected }) {
    return (
        <Button
            fullWidth
            startIcon={icon}
            onClick={onClick}
            sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13,
                py: 1,
                borderRadius: '7px',
                justifyContent: 'flex-start',
                ...(selected
                    ? {
                          bgcolor: activeBg,
                          color: activeColor,
                          border: `1px solid ${activeBorder}`,
                          boxShadow: 'none',
                          '&:hover': { bgcolor: activeBg },
                      }
                    : {
                          bgcolor: 'transparent',
                          color: '#475569',
                          border: '1px solid #E2E8F0',
                          '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' },
                      }),
            }}
        >
            {label}
        </Button>
    );
}

export default function AdminApplicationReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: admin, logout: handleLogout } = usePortalUser('Admin', '/admin/login');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [bundle, setBundle] = useState(null);

    const [checklist, setChecklist] = useState({
        identity: 'Pending',
        income: 'Pending',
        fee: 'Pending',
        institution: 'Pending',
        documents: 'Pending',
    });
    const [decisionStatus, setDecisionStatus] = useState('');
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        if (admin) loadDetails();
    }, [id, admin]);

    useAutoRefresh(() => loadDetails(true), [id, admin]);

    const loadDetails = async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const res = await api.get(`/admin/applications/${id}`);
            setBundle(res.data);
            if (res.data?.application) {
                setDecisionStatus(res.data.application.status || '');
                setRemarks(
                    res.data.application.rejection_reason ||
                    res.data.application.hold_reason ||
                    ''
                );
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load application details.');
        } finally {
            setLoading(false);
        }
    };

    const handleChecklistChange = (field, value) =>
        setChecklist((prev) => ({ ...prev, [field]: value }));

    const handleConfirmDecision = async () => {
        if (!decisionStatus) {
            setError('Select a decision: Approve, Reject, or Request More Information.');
            return;
        }
        if (['Rejected', 'Hold'].includes(decisionStatus) && !remarks.trim()) {
            setError('Remarks are required for rejection or hold decisions.');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await api.put(`/admin/applications/${id}/decision`, {
                status: decisionStatus,
                reason: remarks.trim() || null,
            });
            setSuccess('Decision saved successfully.');
            setTimeout(() => navigate('/admin/applications'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit decision.');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenDocument = (doc) => {
        const message = openDocumentPreview(doc);
        if (message) setError(message);
    };

    const handleDownloadDocument = (doc) => {
        const message = downloadDocumentFile(doc);
        if (message) setError(message);
    };

    const handleNavigate = (path) => navigate(path);

    return (
        <AdminShell admin={admin} activePage="applications" onNavigate={handleNavigate} onLogout={handleLogout}>
            <Stack spacing={3}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Button
                        size="small"
                        startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                        onClick={() => navigate('/admin/applications')}
                        sx={{
                            textTransform: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#475569',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            py: 0.5,
                            px: 1.25,
                            '&:hover': { bgcolor: '#F8FAFC' },
                        }}
                    >
                        Back
                    </Button>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                        Application Review
                    </Typography>
                </Box>

                {error   && <Alert severity="error"   sx={{ borderRadius: '8px' }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ borderRadius: '8px' }}>{success}</Alert>}

                {loading ? (
                    <Box sx={{ py: 12, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={32} thickness={3} />
                    </Box>
                ) : !bundle ? null : (
                    <Grid container spacing={3}>
                        {/* ── Left Column ── */}
                        <Grid
                            size={{
                                xs: 12,
                                lg: 8
                            }}>
                            <Stack spacing={2.5}>
                                {/* Student Profile */}
                                <Card
                                    sx={{
                                        bgcolor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <Box sx={{ p: 3, display: 'flex', gap: 2.5, alignItems: 'center' }}>
                                        <Avatar
                                            sx={{
                                                width: 72,
                                                height: 72,
                                                bgcolor: '#1D4ED8',
                                                fontSize: 22,
                                                fontWeight: 800,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {(bundle.studentDetails?.name || 'S').slice(0, 2).toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
                                                {bundle.studentDetails?.name || '—'}
                                            </Typography>
                                            <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.25 }}>
                                                {bundle.studentDetails?.course || '-'} · {bundle.studentDetails?.college || '-'}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: '#94A3B8', mt: 0.5, fontFamily: 'monospace' }}>
                                                {bundle.application?.application_number}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                            <Typography sx={{ fontSize: 11.5, color: '#94A3B8', mb: 0.75 }}>
                                                Eligibility
                                            </Typography>
                                            {(() => {
                                                const ok = bundle.autoVerificationResults?.finalAutoEligibility === 'ELIGIBLE';
                                                return (
                                                    <Box
                                                        sx={{
                                                            display: 'inline-block',
                                                            px: 1.5,
                                                            py: 0.5,
                                                            borderRadius: '6px',
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            letterSpacing: '0.06em',
                                                            bgcolor: ok ? '#DCFCE7' : '#FEE2E2',
                                                            color: ok ? '#15803D' : '#B91C1C',
                                                        }}
                                                    >
                                                        {bundle.autoVerificationResults?.finalAutoEligibility || 'NOT ELIGIBLE'}
                                                    </Box>
                                                );
                                            })()}
                                        </Box>
                                    </Box>
                                </Card>

                                {/* Student Information */}
                                <Section title="Student Information">
                                    <Grid container spacing={2.5}>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Date of Birth" value={formatDate(bundle.studentDetails?.dateOfBirth)} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Aadhaar Number" value={bundle.application?.father_aadhaar ? 'Provided' : 'Not provided'} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Email Address" value={bundle.studentDetails?.email} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Phone Number" value={bundle.studentDetails?.phone} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Gender" value={bundle.studentDetails?.gender} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12
                                            }}>
                                            <KV label="Address" value={bundle.studentDetails?.address} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Institution Type" value={bundle.studentDetails?.institutionType || '—'} />
                                        </Grid>
                                    </Grid>
                                </Section>

                                {/* Parent Information */}
                                <Section title="Parent Information">
                                    <Grid container spacing={2.5}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#475569', mb: 1 }}>
                                                Father Details
                                            </Typography>
                                            <KV label="Father Name" value={bundle.fatherDetails?.name} />
                                            <KV label="Father Aadhaar Number" value={bundle.fatherDetails?.aadhaar} />
                                            <KV label="Father Occupation" value={bundle.fatherDetails?.occupation} />
                                            <KV
                                                label="Father Annual Income"
                                                value={formatParentIncomeDisplay(
                                                    bundle.fatherDetails?.occupation,
                                                    bundle.fatherDetails?.annualIncome
                                                )}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#475569', mb: 1 }}>
                                                Mother Details
                                            </Typography>
                                            <KV label="Mother Name" value={bundle.motherDetails?.name} />
                                            <KV label="Mother Aadhaar Number" value={bundle.motherDetails?.aadhaar} />
                                            <KV label="Mother Occupation" value={bundle.motherDetails?.occupation} />
                                            <KV
                                                label="Mother Annual Income"
                                                value={formatParentIncomeDisplay(
                                                    bundle.motherDetails?.occupation,
                                                    bundle.motherDetails?.annualIncome
                                                )}
                                            />
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ my: 2.5 }} />

                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#475569', mb: 1.5 }}>
                                        Income Verification
                                    </Typography>
                                    <Stack spacing={0.5} sx={{ mb: 2 }}>
                                        <Typography sx={{ fontSize: 13.5, color: '#0F172A' }}>
                                            Father: {bundle.fatherDetails?.occupation || '—'} — {formatParentIncomeDisplay(
                                                bundle.fatherDetails?.occupation,
                                                bundle.fatherDetails?.annualIncome
                                            )}
                                        </Typography>
                                        <Typography sx={{ fontSize: 13.5, color: '#0F172A' }}>
                                            Mother: {bundle.motherDetails?.occupation || '—'} — {formatParentIncomeDisplay(
                                                bundle.motherDetails?.occupation,
                                                bundle.motherDetails?.annualIncome
                                            )}
                                        </Typography>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', mt: 0.5 }}>
                                            Combined Family Income: {formatCurrency(bundle.parentVerification?.combinedFamilyIncome) || '—'}
                                        </Typography>
                                        <Typography sx={{ fontSize: 13.5, color: '#475569', mt: 0.5 }}>
                                            Income Verification Status: {bundle.parentVerification?.incomeVerificationStatus || '—'}
                                        </Typography>
                                        <Typography sx={{ fontSize: 13.5, color: '#475569' }}>
                                            Application Year: {bundle.parentVerification?.applicationYear || new Date().getFullYear()}
                                        </Typography>
                                    </Stack>

                                    {(() => {
                                        const passed = bundle.autoVerificationResults?.incomeEligibilityStatus === 'Income Eligibility Passed';
                                        return (
                                            <Box
                                                sx={{
                                                    display: 'inline-block',
                                                    px: 1.5,
                                                    py: 0.75,
                                                    borderRadius: '6px',
                                                    fontSize: 12.5,
                                                    fontWeight: 700,
                                                    bgcolor: passed ? '#DCFCE7' : '#FEE2E2',
                                                    color: passed ? '#15803D' : '#B91C1C',
                                                }}
                                            >
                                                Income Eligibility: {passed ? 'Passed' : 'Failed'}
                                            </Box>
                                        );
                                    })()}
                                </Section>

                                {/* Academic Information */}
                                <Section title="Academic Information">
                                    <Grid container spacing={2.5}>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Institution" value={bundle.studentDetails?.college} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV label="Course / Class" value={bundle.studentDetails?.course} />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV
                                                label="Student ID"
                                                value={
                                                    bundle.studentDetails?.studentId
                                                    || bundle.application?.student_roll_number
                                                }
                                            />
                                        </Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}>
                                            <KV
                                                label="Year / Semester"
                                                value={
                                                    bundle.studentDetails?.semester 
                                                    ? `${bundle.studentDetails?.year || '—'} / Semester ${bundle.studentDetails?.semester}`
                                                    : (bundle.application?.year_of_study || bundle.studentDetails?.year || bundle.application?.details?.academic_year || '—')
                                                }
                                            />
                                        </Grid>
                                    </Grid>
                                </Section>

                                {/* Uploaded Documents */}
                                <Section title="Uploaded Documents">
                                    {bundle.documents?.length ? (
                                        <Stack spacing={1.5}>
                                            {bundle.documents.map((doc) => (
                                                <Box
                                                    key={doc.id}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 2,
                                                        p: 1.75,
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '8px',
                                                        bgcolor: '#FAFAFA',
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                                        <Box
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                                borderRadius: '7px',
                                                                bgcolor: '#EFF6FF',
                                                                display: 'grid',
                                                                placeItems: 'center',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <DescriptionOutlinedIcon sx={{ fontSize: 18, color: '#1D4ED8' }} />
                                                        </Box>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 13,
                                                                    fontWeight: 700,
                                                                    color: '#0F172A',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                {doc.file_name}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: 11.5, color: '#94A3B8' }}>
                                                                {doc.category || 'Document'}
                                                                {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Stack direction="row" spacing={1} flexShrink={0}>
                                                        <Button
                                                            size="small"
                                                            startIcon={<FileOpenOutlinedIcon sx={{ fontSize: 13 }} />}
                                                            onClick={() => handleOpenDocument(doc)}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: '#1D4ED8',
                                                                border: '1px solid #BFDBFE',
                                                                borderRadius: '6px',
                                                                py: 0.4,
                                                                px: 1.25,
                                                                bgcolor: '#EFF6FF',
                                                                '&:hover': { bgcolor: '#DBEAFE' },
                                                            }}
                                                        >
                                                            Preview
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            startIcon={<DownloadOutlinedIcon sx={{ fontSize: 13 }} />}
                                                            onClick={() => handleDownloadDocument(doc)}
                                                            sx={{
                                                                textTransform: 'none',
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: '#475569',
                                                                border: '1px solid #E2E8F0',
                                                                borderRadius: '6px',
                                                                py: 0.4,
                                                                px: 1.25,
                                                                '&:hover': { bgcolor: '#F8FAFC' },
                                                            }}
                                                        >
                                                            Download
                                                        </Button>
                                                    </Stack>
                                                </Box>
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Typography sx={{ color: '#94A3B8', fontSize: 13, py: 2 }}>
                                            No documents uploaded.
                                        </Typography>
                                    )}
                                </Section>
                            </Stack>
                        </Grid>

                        {/* ── Right Column ── */}
                        <Grid
                            size={{
                                xs: 12,
                                lg: 4
                            }}>
                            <Stack spacing={2.5} sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
                                {/* Verification Checklist */}
                                <Card
                                    sx={{
                                        bgcolor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                                            Verification Checklist
                                        </Typography>
                                    </Box>
                                    <Box sx={{ px: 2.5, py: 1 }}>
                                        <ChecklistItem
                                            label="Identity Verified"
                                            value={checklist.identity}
                                            onChange={(v) => handleChecklistChange('identity', v)}
                                        />
                                        <ChecklistItem
                                            label="Income Verified"
                                            value={checklist.income}
                                            onChange={(v) => handleChecklistChange('income', v)}
                                        />
                                        <ChecklistItem
                                            label="Fee Verified"
                                            value={checklist.fee}
                                            onChange={(v) => handleChecklistChange('fee', v)}
                                        />
                                        <ChecklistItem
                                            label="Institution Verified"
                                            value={checklist.institution}
                                            onChange={(v) => handleChecklistChange('institution', v)}
                                        />
                                        <ChecklistItem
                                            label="Documents Valid"
                                            value={checklist.documents}
                                            onChange={(v) => handleChecklistChange('documents', v)}
                                        />
                                    </Box>
                                </Card>

                                {/* Final Decision Panel */}
                                <Card
                                    sx={{
                                        bgcolor: '#FFFFFF',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <Box sx={{ px: 2.5, pt: 2.25, pb: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                                            Final Decision
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2.5 }}>
                                        <Stack spacing={1.25}>
                                            <DecisionButton
                                                label="Approve Application"
                                                icon={<CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />}
                                                activeColor="#15803D"
                                                activeBg="#DCFCE7"
                                                activeBorder="#86EFAC"
                                                selected={decisionStatus === 'Approved'}
                                                onClick={() => setDecisionStatus('Approved')}
                                            />
                                            <DecisionButton
                                                label="Reject Application"
                                                icon={<CancelOutlinedIcon sx={{ fontSize: 16 }} />}
                                                activeColor="#B91C1C"
                                                activeBg="#FEE2E2"
                                                activeBorder="#FCA5A5"
                                                selected={decisionStatus === 'Rejected'}
                                                onClick={() => setDecisionStatus('Rejected')}
                                            />
                                            <DecisionButton
                                                label="Request More Information"
                                                icon={<HourglassEmptyIcon sx={{ fontSize: 16 }} />}
                                                activeColor="#92400E"
                                                activeBg="#FEF3C7"
                                                activeBorder="#FDE68A"
                                                selected={decisionStatus === 'Hold'}
                                                onClick={() => setDecisionStatus('Hold')}
                                            />
                                        </Stack>

                                        <Divider sx={{ my: 2 }} />

                                        <Typography
                                            sx={{
                                                fontSize: 11.5,
                                                fontWeight: 600,
                                                color: '#64748B',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em',
                                                mb: 0.75,
                                            }}
                                        >
                                            Remarks
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            minRows={3}
                                            placeholder="Enter evaluation remarks. Required for rejection or hold."
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            sx={{
                                                mb: 2,
                                                '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 },
                                            }}
                                        />
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={handleConfirmDecision}
                                            disabled={saving || !decisionStatus}
                                            sx={{
                                                bgcolor: '#0F172A',
                                                color: '#FFFFFF',
                                                textTransform: 'none',
                                                fontWeight: 700,
                                                fontSize: 13.5,
                                                py: 1.1,
                                                borderRadius: '7px',
                                                boxShadow: 'none',
                                                '&:hover': { bgcolor: '#1E293B', boxShadow: 'none' },
                                                '&:disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
                                            }}
                                        >
                                            {saving ? 'Saving…' : 'Confirm Decision'}
                                        </Button>
                                    </Box>
                                </Card>
                            </Stack>
                        </Grid>
                    </Grid>
                )}
            </Stack>
        </AdminShell>
    );
}
