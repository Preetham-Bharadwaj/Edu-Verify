import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { getLoginPathForRole, getUser, getUserForRoles, isAuthenticated, isAuthenticatedForRoles } from './utils/auth';
import LandingPage from './pages/LandingPage';
import PortalSelect from './pages/PortalSelect';
import LoginPage from './pages/LoginPage';
import StudentSignup from './pages/StudentSignup';
import AdminRequest from './pages/AdminRequest';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminApplications from './pages/AdminApplications';
import AdminReports from './pages/AdminReports';
import AdminProfile from './pages/AdminProfile';
import AdminVerifications from './pages/AdminVerifications';
import AdminStudents from './pages/AdminStudents';
import AdminStudentDetail from './pages/AdminStudentDetail';
import AdminSettings from './pages/AdminSettings';
import AdminApplicationReview from './pages/AdminApplicationReview';
import SupervisorDashboard from './pages/SupervisorDashboard';
import FeeDatabase from './pages/FeeDatabase';

// Role-Based Route Protection Guard
function ProtectedRoute({ children, allowedRoles }) {
    const location = useLocation();
    const { ready } = useAuth();
    const loginPath = getLoginPathForRole(allowedRoles[0]);
    const singleRole = allowedRoles.length === 1 ? allowedRoles[0] : null;

    if (!ready) {
        return null;
    }

    const authed = singleRole
        ? isAuthenticated(singleRole)
        : isAuthenticatedForRoles(allowedRoles);

    if (!authed) {
        return <Navigate to={loginPath} replace state={{ from: location }} />;
    }

    const user = singleRole ? getUser(singleRole) : getUserForRoles(allowedRoles);
    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to={loginPath} replace state={{ from: location }} />;
    }

    return children;
}

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <Router>
                <AuthProvider>
                    <Routes>
                    {/* Public Access Portals */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/portals" element={<PortalSelect />} />
                    
                    {/* Student Auth */}
                    <Route path="/student/login" element={<LoginPage role="Student" />} />
                    <Route path="/student/signup" element={<StudentSignup />} />
                    
                    {/* Admin Auth */}
                    <Route path="/admin/login" element={<LoginPage role="Admin" />} />
                    <Route path="/admin/request" element={<AdminRequest />} />
                    
                    {/* Supervisor Auth */}
                    <Route path="/supervisor/login" element={<LoginPage role="Supervisor" />} />

                    {/* Role-Protected Panels */}
                    <Route 
                        path="/student/dashboard" 
                        element={
                            <ProtectedRoute allowedRoles={['Student']}>
                                <StudentDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/admin/dashboard" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/admin/applications" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminApplications />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/admin/applications/:id" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminApplicationReview />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/admin/reports" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminReports />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/admin/profile" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminProfile />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/admin/settings" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminSettings />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/admin/students" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminStudents />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/admin/students/:id" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminStudentDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/admin/verifications" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <AdminVerifications />
                            </ProtectedRoute>
                        }
                    />
                    <Route 
                        path="/supervisor/dashboard" 
                        element={
                            <ProtectedRoute allowedRoles={['Supervisor']}>
                                <SupervisorDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/fees" 
                        element={
                            <ProtectedRoute allowedRoles={['Admin', 'Supervisor']}>
                                <FeeDatabase />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Redirect Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AuthProvider>
            </Router>
        </ThemeProvider>
    );
}
