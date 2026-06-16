import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    LinearProgress,
    MenuItem,
    Stack,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import api from '../api';
import {
    PARENT_OCCUPATIONS,
    formatParentIncomeDisplay,
    getDisabledIncomeLabel,
    isIncomeDisabled,
    isIncomeRequired,
    resolveStoredParentIncome,
    validateParentIncome,
} from '../utils/parentIncome';
import { updateSessionToken } from '../utils/auth';

const STEPS = [
    'Student Information',
    'Parent Information',
    'Document Upload',
    'Review Information',
    'Submit Application'
];

const DOCUMENT_FIELDS = ['Student ID', 'Income Certificate', 'Fee Receipt', 'Aadhaar Documents'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const DEFAULT_STATE_OPTIONS = ['State A', 'State B', 'State C', 'State D'];

function ParentIncomeField({ label, occupation, value, onChange }) {
    const incomeLocked = isIncomeDisabled(occupation);
    const waitingForOccupation = !occupation;
    const disabled = waitingForOccupation || incomeLocked;
    const displayValue = incomeLocked ? getDisabledIncomeLabel(occupation) : value;

    return (
        <TextField
            label={label}
            type={incomeLocked ? 'text' : 'number'}
            value={displayValue}
            onChange={(e) => {
                if (!disabled) {
                    onChange(e.target.value);
                }
            }}
            fullWidth
            required={isIncomeRequired(occupation)}
            disabled={disabled}
            placeholder={waitingForOccupation ? 'Select occupation first' : 'Enter annual income'}
            slotProps={{
                htmlInput: incomeLocked
                    ? { readOnly: true }
                    : { min: 0, inputMode: 'numeric' },
                inputLabel: { shrink: true },
            }}
            helperText={
                waitingForOccupation
                    ? 'Select occupation first'
                    : occupation === 'Retired'
                        ? 'Enter pension income if applicable'
                        : (incomeLocked ? getDisabledIncomeLabel(occupation) : 'Enter total annual income in rupees')
            }
        />
    );
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export default function ScholarshipForm({ onComplete, profile: profileProp, referenceData }) {
    const [loadingProfile, setLoadingProfile] = useState(!profileProp);
    const [profile, setProfile] = useState(profileProp || null);
    const [activeStep, setActiveStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const [studentInfo, setStudentInfo] = useState({
        fullName: '',
        studentId: '',
        institutionType: 'School',
        schoolCollegeName: '',
        currentGrade: '',
        academicYear: '',
        semester: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        district: '',
        state: ''
    });
    const [parentInfo, setParentInfo] = useState({
        fatherName: '',
        fatherAadhaar: '',
        fatherOccupation: '',
        fatherAnnualIncome: '',
        motherName: '',
        motherAadhaar: '',
        motherOccupation: '',
        motherAnnualIncome: ''
    });
    const [documents, setDocuments] = useState({});
    const profileHydratedRef = useRef(false);

    useEffect(() => {
        let ignore = false;

        async function loadProfile() {
            if (profileProp) {
                if (!ignore) {
                    setProfile(profileProp);
                    setLoadingProfile(false);
                }
                return;
            }

            try {
                const res = await api.get('/student/profile');
                if (!ignore) setProfile(res.data.profileView);
            } catch (err) {
                if (!ignore) setError(err.response?.data?.message || 'Failed to load profile information.');
            } finally {
                if (!ignore) setLoadingProfile(false);
            }
        }

        loadProfile();
        return () => {
            ignore = true;
        };
    }, [profileProp]);

    useEffect(() => {
        if (!profile || profileHydratedRef.current) return;

        profileHydratedRef.current = true;
        setStudentInfo({
            fullName: profile.fullName || '',
            studentId: profile.studentId || '',
            institutionType: profile.academicInformation?.institutionType || 'School',
            schoolCollegeName: profile.academicInformation?.institutionName || '',
            currentGrade: profile.academicInformation?.courseGrade || '',
            academicYear: profile.academicInformation?.academicYear || '',
            semester: profile.academicInformation?.semester || '',
            phone: profile.phone || '',
            dateOfBirth: profile.personalInformation?.dateOfBirth || '',
            gender: profile.personalInformation?.gender || '',
            address: profile.personalInformation?.address || '',
            district: profile.personalInformation?.district || '',
            state: profile.personalInformation?.region || ''
        });
        setParentInfo({
            fatherName: profile.parentInformation?.fatherName || '',
            fatherAadhaar: profile.parentInformation?.fatherAadhaar || '',
            fatherOccupation: profile.parentInformation?.fatherOccupation || '',
            fatherAnnualIncome: profile.parentInformation?.fatherAnnualIncome ?? '',
            motherName: profile.parentInformation?.motherName || '',
            motherAadhaar: profile.parentInformation?.motherAadhaar || '',
            motherOccupation: profile.parentInformation?.motherOccupation || '',
            motherAnnualIncome: profile.parentInformation?.motherAnnualIncome ?? ''
        });
    }, [profile]);

    const states = referenceData?.regionsAndDistricts ? Object.keys(referenceData.regionsAndDistricts) : DEFAULT_STATE_OPTIONS;
    const districts = referenceData?.regionsAndDistricts?.[studentInfo.state] || [];
    const applicationProgress = ((activeStep + 1) / STEPS.length) * 100;

    const requiredDocuments = DOCUMENT_FIELDS.filter((field) => !documents[field]);

    const handleFieldChange = (setter, field, value) => {
        setter((prev) => ({ ...prev, [field]: value }));
    };

    const handleParentOccupationChange = (role, occupation) => {
        if (role === 'father') {
            setParentInfo((prev) => ({
                ...prev,
                fatherOccupation: occupation,
                fatherAnnualIncome: isIncomeDisabled(occupation)
                    ? '0'
                    : (isIncomeDisabled(prev.fatherOccupation) ? '' : prev.fatherAnnualIncome),
            }));
            return;
        }

        setParentInfo((prev) => ({
            ...prev,
            motherOccupation: occupation,
            motherAnnualIncome: isIncomeDisabled(occupation)
                ? '0'
                : (isIncomeDisabled(prev.motherOccupation) ? '' : prev.motherAnnualIncome),
        }));
    };

    const validateStudentStep = () => {
        const required = [
            'fullName', 'studentId', 'institutionType', 'schoolCollegeName',
            'currentGrade', 'academicYear', 'phone', 'dateOfBirth', 'gender',
            'address', 'district', 'state'
        ];
        if (required.some((field) => !String(studentInfo[field] || '').trim())) {
            return 'All student information fields are required.';
        }
        return '';
    };

    const validateParentStep = () => {
        const required = [
            'fatherName', 'fatherAadhaar', 'fatherOccupation',
            'motherName', 'motherAadhaar', 'motherOccupation'
        ];
        if (required.some((field) => !String(parentInfo[field] || '').trim())) {
            return 'All parent information fields are required.';
        }
        if (
            parentInfo.fatherAadhaar.length !== 12 ||
            parentInfo.motherAadhaar.length !== 12 ||
            !/^\d{12}$/.test(parentInfo.fatherAadhaar) ||
            !/^\d{12}$/.test(parentInfo.motherAadhaar)
        ) {
            return 'Aadhaar numbers must be exactly 12 digits.';
        }
        const fatherIncomeError = validateParentIncome(
            parentInfo.fatherOccupation,
            parentInfo.fatherAnnualIncome,
            'Father'
        );
        const motherIncomeError = validateParentIncome(
            parentInfo.motherOccupation,
            parentInfo.motherAnnualIncome,
            'Mother'
        );
        if (fatherIncomeError || motherIncomeError) {
            return fatherIncomeError || motherIncomeError;
        }
        return '';
    };

    const validateDocumentsStep = () => {
        if (requiredDocuments.length > 0) {
            return `Please upload: ${requiredDocuments.join(', ')}.`;
        }
        return '';
    };

    const validateStep = () => {
        if (activeStep === 0) return validateStudentStep();
        if (activeStep === 1) return validateParentStep();
        if (activeStep === 2) return validateDocumentsStep();
        return '';
    };

    const validateApplication = () => (
        validateStudentStep()
        || validateParentStep()
        || validateDocumentsStep()
    );

    const handleNext = () => {
        const validationError = validateStep();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    };

    const handleBack = () => {
        setError('');
        setActiveStep((prev) => Math.max(prev - 1, 0));
    };

    const addDocument = async (field, file) => {
        if (!file) return;
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setError(`${field} must be 5 MB or smaller.`);
            return;
        }
        const fileDataBase64 = await fileToBase64(file);
        setDocuments((prev) => ({
            ...prev,
            [field]: {
                category: field,
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileSize: file.size,
                fileDataBase64
            }
        }));
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        const targetField = requiredDocuments[0] || DOCUMENT_FIELDS[0];
        await addDocument(targetField, file);
    };

    const handleSubmit = async () => {
        const validationError = validateApplication();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const fatherAnnualIncome = resolveStoredParentIncome(
                parentInfo.fatherOccupation,
                parentInfo.fatherAnnualIncome
            );
            const motherAnnualIncome = resolveStoredParentIncome(
                parentInfo.motherOccupation,
                parentInfo.motherAnnualIncome
            );

            const payload = {
                studentInformation: {
                    studentName: studentInfo.fullName,
                    studentId: studentInfo.studentId,
                    institutionType: studentInfo.institutionType,
                    schoolCollegeName: studentInfo.schoolCollegeName,
                    classGrade: studentInfo.currentGrade,
                    district: studentInfo.district,
                    region: studentInfo.state
                },
                personalInformation: {
                    phone: studentInfo.phone,
                    dateOfBirth: studentInfo.dateOfBirth,
                    gender: studentInfo.gender,
                    address: studentInfo.address
                },
                parentInformation: {
                    fatherName: parentInfo.fatherName,
                    fatherAadhaar: parentInfo.fatherAadhaar,
                    fatherOccupation: parentInfo.fatherOccupation,
                    fatherAnnualIncome: fatherAnnualIncome,
                    motherName: parentInfo.motherName,
                    motherAadhaar: parentInfo.motherAadhaar,
                    motherOccupation: parentInfo.motherOccupation,
                    motherAnnualIncome: motherAnnualIncome
                },
                academicInformation: {
                    currentClass: studentInfo.currentGrade,
                    institutionName: studentInfo.schoolCollegeName,
                    academicYear: studentInfo.academicYear,
                    semester: studentInfo.semester
                },
                documents: Object.values(documents),
                fatherName: parentInfo.fatherName,
                motherName: parentInfo.motherName,
                fatherAadhaar: parentInfo.fatherAadhaar,
                motherAadhaar: parentInfo.motherAadhaar,
                collegeName: studentInfo.schoolCollegeName,
                grade: studentInfo.currentGrade
            };

            const res = await api.post('/student/apply', payload);
            if (res.data?.token && res.data?.user) {
                updateSessionToken(res.data.token, res.data.user, 'Student');
            }
            setSuccess(res.data.message || 'Application submitted successfully.');
            onComplete?.();
        } catch (err) {
            if (err.response?.status === 413) {
                setError('Upload too large. Please use files under 5 MB each and try again.');
            } else if (err.response?.status === 403) {
                setError('Permission denied. Please log out and sign in again from the Student portal.');
            } else if (err.response?.status === 401) {
                setError('Your session expired. Please log in again and resubmit your application.');
            } else {
                setError(err.response?.data?.message || 'Failed to submit scholarship application.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingProfile) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Card sx={{ borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f1e36', mb: 0.5 }}>
                    Apply Scholarship
                </Typography>
                <Typography variant="body2" sx={{ color: '#627d98', mb: 3 }}>
                    For school students (Class 1–12) and college/university students. Complete all steps to apply for a scholarship.
                </Typography>

                <LinearProgress variant="determinate" value={applicationProgress} sx={{ height: 10, borderRadius: 999, mb: 3, bgcolor: '#e2e8f0' }} />

                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                {activeStep === 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
                        <TextField label="Full Name" value={studentInfo.fullName} onChange={(e) => handleFieldChange(setStudentInfo, 'fullName', e.target.value)} fullWidth />
                        <TextField label="Student ID / Roll Number" value={studentInfo.studentId} onChange={(e) => handleFieldChange(setStudentInfo, 'studentId', e.target.value)} fullWidth />
                        <TextField select label="Institution Type" value={studentInfo.institutionType} onChange={(e) => handleFieldChange(setStudentInfo, 'institutionType', e.target.value)} fullWidth>
                            <MenuItem value="School">School</MenuItem>
                            <MenuItem value="College">College / University</MenuItem>
                        </TextField>
                        <TextField label="School / Institution Name" value={studentInfo.schoolCollegeName} onChange={(e) => handleFieldChange(setStudentInfo, 'schoolCollegeName', e.target.value)} fullWidth />
                        <TextField label="Class / Grade / Year" placeholder="e.g. Class 10, Year 2, B.Tech 3rd Year" value={studentInfo.currentGrade} onChange={(e) => handleFieldChange(setStudentInfo, 'currentGrade', e.target.value)} fullWidth />
                        <TextField label="Academic Year" placeholder="e.g. 2025-26" value={studentInfo.academicYear} onChange={(e) => handleFieldChange(setStudentInfo, 'academicYear', e.target.value)} fullWidth />
                        <TextField
                            select
                            label="Semester (optional)"
                            value={studentInfo.semester}
                            onChange={(e) => handleFieldChange(setStudentInfo, 'semester', e.target.value)}
                            fullWidth
                            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                        >
                            <MenuItem value=""><em>Not Applicable</em></MenuItem>
                            {[1,2,3,4,5,6,7,8].map((s) => (
                                <MenuItem key={s} value={String(s)}>Semester {s}</MenuItem>
                            ))}
                        </TextField>
                        <TextField label="Phone Number" value={studentInfo.phone} onChange={(e) => handleFieldChange(setStudentInfo, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))} fullWidth />
                        <TextField label="Date of Birth" type="date" value={studentInfo.dateOfBirth} onChange={(e) => handleFieldChange(setStudentInfo, 'dateOfBirth', e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField select label="Gender" value={studentInfo.gender} onChange={(e) => handleFieldChange(setStudentInfo, 'gender', e.target.value)} fullWidth>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </TextField>
                        <TextField label="Address" value={studentInfo.address} onChange={(e) => handleFieldChange(setStudentInfo, 'address', e.target.value)} fullWidth multiline minRows={2} sx={{ gridColumn: { md: '1 / span 2' } }} />
                        <TextField select label="Region" value={studentInfo.state} onChange={(e) => {
                            handleFieldChange(setStudentInfo, 'state', e.target.value);
                            handleFieldChange(setStudentInfo, 'district', '');
                        }} fullWidth>
                            {states.map((state) => <MenuItem key={state} value={state}>{state}</MenuItem>)}
                        </TextField>
                        <TextField select label="District" value={studentInfo.district} onChange={(e) => handleFieldChange(setStudentInfo, 'district', e.target.value)} fullWidth>
                            {districts.map((district) => <MenuItem key={district} value={district}>{district}</MenuItem>)}
                        </TextField>
                    </Box>
                )}

                {activeStep === 1 && (
                    <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: '#0f1e36' }}>
                                Parent Information
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
                                <Stack spacing={2.5}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                                        Father Details
                                    </Typography>
                                    <TextField label="Father Full Name" value={parentInfo.fatherName} onChange={(e) => handleFieldChange(setParentInfo, 'fatherName', e.target.value)} fullWidth required />
                                    <TextField label="Father Aadhaar Number" value={parentInfo.fatherAadhaar} onChange={(e) => handleFieldChange(setParentInfo, 'fatherAadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} fullWidth required slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 12 } }} helperText="12-digit number only" />
                                    <TextField select label="Father Occupation" value={parentInfo.fatherOccupation} onChange={(e) => handleParentOccupationChange('father', e.target.value)} fullWidth required slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                                        <MenuItem disabled value="">
                                            <em>Select occupation</em>
                                        </MenuItem>
                                        {PARENT_OCCUPATIONS.map((option) => (
                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                        ))}
                                    </TextField>
                                    <ParentIncomeField
                                        label="Father Annual Income"
                                        occupation={parentInfo.fatherOccupation}
                                        value={parentInfo.fatherAnnualIncome}
                                        onChange={(value) => handleFieldChange(setParentInfo, 'fatherAnnualIncome', value)}
                                    />
                                </Stack>
                                <Stack spacing={2.5}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                                        Mother Details
                                    </Typography>
                                    <TextField label="Mother Full Name" value={parentInfo.motherName} onChange={(e) => handleFieldChange(setParentInfo, 'motherName', e.target.value)} fullWidth required />
                                    <TextField label="Mother Aadhaar Number" value={parentInfo.motherAadhaar} onChange={(e) => handleFieldChange(setParentInfo, 'motherAadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} fullWidth required slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 12 } }} helperText="12-digit number only" />
                                    <TextField select label="Mother Occupation" value={parentInfo.motherOccupation} onChange={(e) => handleParentOccupationChange('mother', e.target.value)} fullWidth required slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                                        <MenuItem disabled value="">
                                            <em>Select occupation</em>
                                        </MenuItem>
                                        {PARENT_OCCUPATIONS.map((option) => (
                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                        ))}
                                    </TextField>
                                    <ParentIncomeField
                                        label="Mother Annual Income"
                                        occupation={parentInfo.motherOccupation}
                                        value={parentInfo.motherAnnualIncome}
                                        onChange={(value) => handleFieldChange(setParentInfo, 'motherAnnualIncome', value)}
                                    />
                                </Stack>
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {activeStep === 2 && (
                    <Stack spacing={2.5}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f1e36' }}>
                            Upload Documents
                        </Typography>
                        <Box
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            sx={{
                                border: '1.5px dashed',
                                borderColor: isDragging ? '#0b2a5c' : '#cbd5e1',
                                bgcolor: isDragging ? '#f8fbff' : '#fafcff',
                                borderRadius: 3,
                                p: 3,
                                display: { xs: 'block', md: 'block' }
                            }}
                        >
                            <Typography variant="body2" sx={{ color: '#627d98', mb: 2 }}>
                                Drag and drop a document here on desktop, or use the upload buttons below. Maximum file size: 5 MB each.
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                                {DOCUMENT_FIELDS.map((field) => (
                                    <Card key={field} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                                {field}
                                            </Typography>
                                            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} fullWidth>
                                                Upload
                                                <input
                                                    hidden
                                                    type="file"
                                                    onChange={async (event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) {
                                                            await addDocument(field, file);
                                                        }
                                                    }}
                                                />
                                            </Button>
                                            <Typography variant="body2" sx={{ color: '#627d98', mt: 2 }}>
                                                {documents[field]?.fileName || 'No file uploaded'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        </Box>
                    </Stack>
                )}

                {activeStep === 3 && (
                    <Stack spacing={3}>
                        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Student Details</Typography>
                                <Typography variant="body2">{studentInfo.fullName} | {studentInfo.studentId}</Typography>
                                <Typography variant="body2">{studentInfo.institutionType}: {studentInfo.schoolCollegeName}</Typography>
                                <Typography variant="body2">{studentInfo.currentGrade}{studentInfo.semester ? ` | Semester ${studentInfo.semester}` : ''} | Academic Year: {studentInfo.academicYear}</Typography>
                                <Typography variant="body2">Phone: {studentInfo.phone} | DOB: {studentInfo.dateOfBirth}</Typography>
                                <Typography variant="body2">{studentInfo.gender} | {studentInfo.address}</Typography>
                                <Typography variant="body2">{studentInfo.district}, {studentInfo.state}</Typography>
                            </CardContent>
                        </Card>

                        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Parent Information</Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Father Details</Typography>
                                        <Typography variant="body2">Name: {parentInfo.fatherName}</Typography>
                                        <Typography variant="body2">Aadhaar: {parentInfo.fatherAadhaar}</Typography>
                                        <Typography variant="body2">Occupation: {parentInfo.fatherOccupation}</Typography>
                                        <Typography variant="body2">
                                            Annual Income: {formatParentIncomeDisplay(parentInfo.fatherOccupation, parentInfo.fatherAnnualIncome)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Mother Details</Typography>
                                        <Typography variant="body2">Name: {parentInfo.motherName}</Typography>
                                        <Typography variant="body2">Aadhaar: {parentInfo.motherAadhaar}</Typography>
                                        <Typography variant="body2">Occupation: {parentInfo.motherOccupation}</Typography>
                                        <Typography variant="body2">
                                            Annual Income: {formatParentIncomeDisplay(parentInfo.motherOccupation, parentInfo.motherAnnualIncome)}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
                                    Combined Family Income: {formatParentIncomeDisplay(
                                        null,
                                        resolveStoredParentIncome(parentInfo.fatherOccupation, parentInfo.fatherAnnualIncome)
                                        + resolveStoredParentIncome(parentInfo.motherOccupation, parentInfo.motherAnnualIncome)
                                    )}
                                </Typography>
                            </CardContent>
                        </Card>

                        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Documents</Typography>
                                <Stack spacing={1}>
                                    {Object.values(documents).map((doc) => (
                                        <Typography key={doc.category} variant="body2">
                                            {doc.category}: {doc.fileName}
                                        </Typography>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Alert severity="info" icon={<CheckCircleIcon />}>
                            Backend checks income tax records, school fee records, and eligibility rules automatically.
                        </Alert>
                    </Stack>
                )}

                {activeStep === 4 && (
                    <Stack spacing={3}>
                        <Alert severity="warning">
                            By submitting this application, you declare that all information and documents are true and complete.
                        </Alert>
                        <Card sx={{ border: '1px solid #e2e8f0', boxShadow: 'none', borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Review Information</Typography>
                                <Typography variant="body2">Student Details</Typography>
                                <Typography variant="body2">Parent Details</Typography>
                                <Typography variant="body2">Documents</Typography>
                                <Typography variant="body2">Declaration</Typography>
                            </CardContent>
                        </Card>
                    </Stack>
                )}

                <Divider sx={{ my: 4 }} />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack} disabled={activeStep === 0 || submitting}>
                        Previous
                    </Button>

                    {activeStep < STEPS.length - 1 ? (
                        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext} sx={{ bgcolor: '#0b2a5c' }}>
                            Next
                        </Button>
                    ) : (
                        <Button variant="contained" startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <TaskAltIcon />} onClick={handleSubmit} disabled={submitting} sx={{ bgcolor: '#0b2a5c' }}>
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}
