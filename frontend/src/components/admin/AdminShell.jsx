import React, { useState } from 'react';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

const DRAWER_WIDTH = 260;
const HEADER_HEIGHT = 64;

const SIDEBAR = {
    bg: '#081B33',
    text: '#FFFFFF',
    hoverBg: 'rgba(255,255,255,0.08)',
    activeGradient: 'linear-gradient(90deg, #1E40AF, #2563EB)',
};

const NAV_ITEMS = [
    { key: 'dashboard',   label: 'Dashboard',   icon: <DashboardOutlinedIcon fontSize="small" />,   path: '/admin/dashboard' },
    { key: 'applications',label: 'Applications',icon: <AssignmentOutlinedIcon fontSize="small" />,  path: '/admin/applications' },
    { key: 'reports',     label: 'Reports',     icon: <BarChartOutlinedIcon fontSize="small" />,   path: '/admin/reports' },
    { key: 'settings',    label: 'Settings',    icon: <SettingsOutlinedIcon fontSize="small" />,   path: '/admin/settings' },
    { key: 'logout',      label: 'Logout',      icon: <LogoutIcon fontSize="small" />,              action: 'logout' },
];

function NavItem({ item, active, onNavigate, onLogout }) {
    return (
        <ListItemButton
            onClick={() => (item.action === 'logout' ? onLogout() : onNavigate(item.path))}
            sx={{
                position: 'relative',
                height: 48,
                minHeight: 48,
                borderRadius: '12px',
                px: 1.5,
                color: SIDEBAR.text,
                bgcolor: 'transparent',
                background: active ? SIDEBAR.activeGradient : 'transparent',
                overflow: 'hidden',
                '&::before': active
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 10,
                        bottom: 10,
                        width: 4,
                        bgcolor: '#FFFFFF',
                        borderRadius: '0 4px 4px 0',
                    }
                    : {},
                '& .MuiListItemIcon-root': {
                    color: SIDEBAR.text,
                    minWidth: 40,
                    transition: 'color 0.2s ease',
                },
                '& .MuiListItemIcon-root .MuiSvgIcon-root': {
                    color: SIDEBAR.text,
                },
                '& .MuiListItemText-primary': {
                    color: `${SIDEBAR.text} !important`,
                },
                '&:hover': {
                    bgcolor: active ? 'transparent' : SIDEBAR.hoverBg,
                    background: active ? SIDEBAR.activeGradient : SIDEBAR.hoverBg,
                    color: SIDEBAR.text,
                    '& .MuiListItemIcon-root, & .MuiListItemIcon-root .MuiSvgIcon-root': {
                        color: SIDEBAR.text,
                    },
                    '& .MuiListItemText-primary': {
                        color: `${SIDEBAR.text} !important`,
                    },
                },
                transition: 'background 0.2s ease, color 0.2s ease',
            }}
        >
            <ListItemIcon>
                {item.icon}
            </ListItemIcon>
            <ListItemText
                primary={item.label}
                slotProps={{
                    primary: {
                        sx: {
                            fontSize: 15,
                            fontWeight: active ? 600 : 500,
                            letterSpacing: '-0.01em',
                            color: `${SIDEBAR.text} !important`,
                        },
                    },
                }}
            />
        </ListItemButton>
    );
}

export default function AdminShell({ admin, activePage, onNavigate, onLogout, children }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);

    const sidebar = (
        <Box sx={{ height: '100%', bgcolor: SIDEBAR.bg, color: SIDEBAR.text, display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    pt: 2,
                    px: 2.5,
                    pb: 1.75,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <Typography
                    sx={{
                        fontSize: 12,
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.65)',
                        fontWeight: 600,
                        lineHeight: 1.2,
                        mb: 0.5,
                    }}
                >
                    Admin Portal
                </Typography>
                <Typography
                    sx={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.25,
                    }}
                >
                    Scholarship Verification
                </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, pt: 1.5, pb: 2, px: 2 }}>
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {NAV_ITEMS.map((item) => (
                        <NavItem
                            key={item.key}
                            item={item}
                            active={activePage === item.key}
                            onNavigate={(path) => { setMobileOpen(false); onNavigate(path); }}
                            onLogout={() => { setMobileOpen(false); onLogout(); }}
                        />
                    ))}
                </List>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9' }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    height: HEADER_HEIGHT,
                    bgcolor: '#ffffff',
                    color: '#0f172a',
                    borderBottom: '1px solid #e2e8f0',
                    zIndex: (t) => t.zIndex.drawer + 1,
                }}
            >
                <Toolbar sx={{ minHeight: HEADER_HEIGHT, height: HEADER_HEIGHT, px: { xs: 2, md: 3 }, gap: 1.5 }}>
                    {isMobile && (
                        <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#334155', p: 0.75, mr: 0.5 }}>
                            <MenuIcon fontSize="small" />
                        </IconButton>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>
                            EV
                        </Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: '#0f172a' }}>
                            EduVerify
                        </Typography>
                    </Box>
                    <Tooltip title="Notifications" arrow>
                        <IconButton sx={{ color: '#64748b', p: 0.75 }} aria-label="Notifications">
                            <NotificationsNoneIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={admin?.name || 'Admin'} arrow>
                        <Avatar onClick={() => onNavigate('/admin/profile')} sx={{ bgcolor: '#1d4ed8', width: 32, height: 32, fontSize: 12, fontWeight: 800, cursor: 'pointer', ml: 0.5 }}>
                            {(admin?.name || 'A').slice(0, 2).toUpperCase()}
                        </Avatar>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none', bgcolor: SIDEBAR.bg, color: SIDEBAR.text } }}>
                {sidebar}
            </Drawer>

            <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none', top: HEADER_HEIGHT, height: `calc(100% - ${HEADER_HEIGHT}px)`, bgcolor: SIDEBAR.bg, color: SIDEBAR.text } }} open>
                {sidebar}
            </Drawer>

            <Box component="main" sx={{ ml: { md: `${DRAWER_WIDTH}px` }, pt: `${HEADER_HEIGHT + 24}px`, px: { xs: 2, sm: 3, md: 4 }, pb: 5, minHeight: '100vh' }}>
                {children}
            </Box>
        </Box>
    );
}