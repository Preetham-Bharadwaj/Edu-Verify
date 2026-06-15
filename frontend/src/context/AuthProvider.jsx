import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import {
    SESSIONS_KEY,
    bootstrapSession,
    getAuthStateForPath,
    getRoleFromPath,
    refreshSession,
} from '../utils/auth';

const AuthContext = createContext({ ready: false, user: null, authenticated: false, role: null });

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const location = useLocation();
    const [ready, setReady] = useState(false);
    const [authState, setAuthState] = useState(() => getAuthStateForPath(location.pathname));

    const syncAuthState = (pathname = location.pathname) => {
        setAuthState(getAuthStateForPath(pathname));
    };

    useEffect(() => {
        let active = true;

        (async () => {
            const role = getRoleFromPath(location.pathname);
            if (role) {
                await bootstrapSession(role);
            } else if (location.pathname === '/fees') {
                await Promise.allSettled([
                    bootstrapSession('Admin'),
                    bootstrapSession('Supervisor'),
                ]);
            }

            if (active) {
                syncAuthState(location.pathname);
                setReady(true);
            }
        })();

        return () => {
            active = false;
        };
    }, [location.pathname]);

    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === SESSIONS_KEY || event.key === null) {
                syncAuthState(location.pathname);
            }
        };

        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [location.pathname]);

    useEffect(() => {
        if (!ready || !authState.authenticated || !authState.role) return undefined;

        const id = setInterval(() => {
            refreshSession(authState.role).then((ok) => {
                if (ok) syncAuthState(location.pathname);
            });
        }, 10 * 60 * 1000);

        return () => clearInterval(id);
    }, [ready, authState.authenticated, authState.role, location.pathname]);

    if (!ready) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafd' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={{ ready, ...authState }}>
            {children}
        </AuthContext.Provider>
    );
}
