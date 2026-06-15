import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#0b2a5c', // Deep Navy Blue
            light: '#254a84',
            dark: '#051838',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#004d61', // Dark Teal
            light: '#0a6d85',
            dark: '#003340',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f4f7fa', // Very light greyish blue
            paper: '#ffffff',
        },
        text: {
            primary: '#0f1e36',
            secondary: '#627d98',
        },
        success: {
            main: '#2e7d32', // Accept/Approve Green
            light: '#e8f5e9',
            dark: '#1b5e20',
        },
        error: {
            main: '#d32f2f', // Reject Red
            light: '#ffebee',
            dark: '#c62828',
        },
        warning: {
            main: '#ed6c02', // Hold Orange
            light: '#fff3e0',
            dark: '#e65100',
        },
        info: {
            main: '#0288d1', // Pending Blue
            light: '#e1f5fe',
            dark: '#01579b',
        },
    },
    typography: {
        fontFamily: [
            'Manrope',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'sans-serif',
        ].join(','),
        h4: {
            fontWeight: 700,
            color: '#0b2a5c',
        },
        h5: {
            fontWeight: 600,
            color: '#0b2a5c',
        },
        h6: {
            fontWeight: 600,
            color: '#0b2a5c',
        },
        subtitle1: {
            fontWeight: 500,
            color: '#627d98',
        },
        body1: {
            color: '#0f1e36',
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 20px',
                    fontWeight: 600,
                },
                containedPrimary: {
                    backgroundColor: '#0b2a5c',
                    '&:hover': {
                        backgroundColor: '#051838',
                    },
                },
                containedSecondary: {
                    backgroundColor: '#004d61',
                    '&:hover': {
                        backgroundColor: '#003340',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e2e8f0',
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: 'small',
            },
        },
    },
});

export default theme;
