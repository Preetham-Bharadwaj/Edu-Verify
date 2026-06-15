const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/StudentDashboard.jsx', 'utf8');

// 1. Remove Profile from sidebarItems
content = content.replace(
`    const sidebarItems = [
        { value: 'home', label: 'Dashboard', icon: <HomeIcon /> },
        { value: 'apply', label: 'Apply Scholarship', icon: <PostAddIcon /> },
        { value: 'status', label: 'Application Status', icon: <TrackChangesIcon /> },
        { value: 'profile', label: 'Profile', icon: <PersonIcon /> }
    ];`,
`    const sidebarItems = [
        { value: 'home', label: 'Dashboard', icon: <HomeIcon /> },
        { value: 'apply', label: 'Apply Scholarship', icon: <PostAddIcon /> },
        { value: 'status', label: 'Application Status', icon: <TrackChangesIcon /> }
    ];`
);

// 2. Remove View Profile and Upload Documents from quickActions
content = content.replace(
`    const quickActions = [
        { label: 'Apply for Scholarship', icon: <PostAddIcon />, tab: 'apply' },
        { label: 'Track Application', icon: <TrackChangesIcon />, tab: 'status' },
        { label: 'Upload Documents', icon: <DescriptionIcon />, tab: 'profile' },
        { label: 'View Profile', icon: <PersonIcon />, tab: 'profile' }
    ];`,
`    const quickActions = [
        { label: 'Apply for Scholarship', icon: <PostAddIcon />, tab: 'apply' },
        { label: 'Track Application', icon: <TrackChangesIcon />, tab: 'status' }
    ];`
);

// 3. Make Avatar Clickable
content = content.replace(
`<Avatar sx={{ width: 34, height: 34, bgcolor: '#0b2a5c', fontWeight: 700 }}>
                                {(student?.fullName || user?.name || 'ST').slice(0, 2).toUpperCase()}
                            </Avatar>`,
`<Avatar 
                                onClick={() => setCurrentTab('profile')} 
                                sx={{ width: 34, height: 34, bgcolor: '#0b2a5c', fontWeight: 700, cursor: 'pointer', transition: '0.2s', '&:hover': { opacity: 0.8 } }}
                            >
                                {(student?.fullName || user?.name || 'ST').slice(0, 2).toUpperCase()}
                            </Avatar>`
);

// 4. Update Quick Actions Grid Layout
content = content.replace(
`<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5 }}>
                                    {quickActions.map((action) => (`,
`<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
                                    {quickActions.map((action) => (`
);

fs.writeFileSync('frontend/src/pages/StudentDashboard.jsx', content, 'utf8');
console.log('Update complete.');
