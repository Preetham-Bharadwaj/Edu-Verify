const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/LandingPage.jsx', 'utf8');

// 1. Add SchoolIcon import after SchoolRoundedIcon import
content = content.replace(
  `import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';`,
  `import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';\nimport SchoolIcon from '@mui/icons-material/School';`
);

// 2. Replace nav header logo (ShieldRoundedIcon box → SchoolIcon + teal text)
content = content.replace(
  `                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '14px',
                            background: \`linear-gradient(135deg, \${BLUE} 0%, \${BLUE_DARK} 100%)\`,
                            display: 'grid',
                            placeItems: 'center',
                            boxShadow: '0 12px 26px rgba(37, 99, 235, 0.22)',
                        }}
                    >
                        <ShieldRoundedIcon sx={{ color: 'white', fontSize: 22 }} />
                    </Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: TEXT }}>
                        EduVerify
                    </Typography>
                </Box>`,
  `                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <SchoolIcon sx={{ color: '#004d61', fontSize: 30 }} />
                    <Typography sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#004d61' }}>
                        EduVerify
                    </Typography>
                </Box>`
);

// 3. Replace login card icon (SecurityRoundedIcon box → SchoolIcon + teal logo)
content = content.replace(
  `                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0.8 }}>
                                <Box
                                    sx={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: '18px',
                                        background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(37,99,235,0.06))',
                                        display: 'grid',
                                        placeItems: 'center',
                                        border: '1px solid rgba(37,99,235,0.10)',
                                    }}
                                >
                                    <SecurityRoundedIcon sx={{ color: BLUE, fontSize: 26 }} />
                                </Box>

                                <Box>
                                    <Typography sx={{ fontSize: { xs: 24, md: 28 }, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.03em', color: TEXT }}>
                                        Welcome to EduVerify
                                    </Typography>
                                    <Typography sx={{ mt: 0.5, fontSize: 13.5, color: MUTED }}>
                                        Login to access your account
                                    </Typography>
                                </Box>
                            </Box>`,
  `                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0.8 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <SchoolIcon sx={{ color: '#004d61', fontSize: 32 }} />
                                    <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#004d61' }}>
                                        EduVerify
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography sx={{ fontSize: { xs: 20, md: 24 }, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.03em', color: TEXT }}>
                                        Welcome Back
                                    </Typography>
                                    <Typography sx={{ mt: 0.5, fontSize: 13.5, color: MUTED }}>
                                        Login to access your account
                                    </Typography>
                                </Box>
                            </Box>`
);

fs.writeFileSync('frontend/src/pages/LandingPage.jsx', content, 'utf8');
console.log('LandingPage logo updated successfully.');
