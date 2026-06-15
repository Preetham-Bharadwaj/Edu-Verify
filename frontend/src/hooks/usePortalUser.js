import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { clearSession, getUser, isAuthenticated, isAuthenticatedForRoles } from '../utils/auth';

export function usePortalUser(allowedRoles, loginPath = '/portals') {
    const navigate = useNavigate();
    const { ready } = useAuth();
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const primaryRole = roles.length === 1 ? roles[0] : null;

    const resolveUser = () => {
        if (primaryRole) return getUser(primaryRole);
        for (const role of roles) {
            const current = getUser(role);
            if (current) return current;
        }
        return null;
    };

    const resolveAuthenticated = () => {
        if (primaryRole) return isAuthenticated(primaryRole);
        return isAuthenticatedForRoles(roles);
    };

    const [user, setUser] = useState(() => {
        const current = resolveUser();
        return current && roles.includes(current.role) ? current : null;
    });

    useEffect(() => {
        if (!ready) return;

        const current = resolveUser();
        if (!resolveAuthenticated() || !current) {
            return;
        }
        if (!roles.includes(current.role)) {
            navigate('/portals', { replace: true });
            return;
        }
        setUser(current);
    }, [ready, navigate, loginPath, roles.join('|')]);

    const logout = useCallback(() => {
        if (user?.role) {
            clearSession(user.role);
        } else if (primaryRole) {
            clearSession(primaryRole);
        }
        navigate('/', { replace: true });
    }, [navigate, loginPath, primaryRole, user?.role]);

    return { user, logout, ready };
}
