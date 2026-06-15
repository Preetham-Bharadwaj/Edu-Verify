const SESSIONS_KEY = 'eduverify_sessions';
const LEGACY_SESSION_KEY = 'eduverify_session';
const API_BASE = 'http://localhost:5000/api';
const PORTAL_ROLES = ['Student', 'Admin', 'Supervisor'];

function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

function getPayloadIdentity(payload) {
    if (!payload) return { id: null, role: null };
    return {
        id: payload.id ?? payload.userId ?? payload.sub ?? null,
        role: payload.role ?? null,
        name: payload.name ?? null,
        email: payload.email ?? null,
        region: payload.region ?? null,
        district: payload.district ?? null,
    };
}

function getTokenExpiry(token) {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return null;
    return payload.exp * 1000;
}

function isTokenExpired(token, bufferMs = 60_000) {
    if (!token) return true;
    const expiry = getTokenExpiry(token);
    if (!expiry) return false;
    return Date.now() >= expiry - bufferMs;
}

function normalizeRole(role) {
    if (!role) return null;
    const match = PORTAL_ROLES.find((r) => r.toLowerCase() === String(role).toLowerCase());
    return match || null;
}

function getRoleFromPath(pathname = window.location.pathname) {
    if (pathname.startsWith('/student')) return 'Student';
    if (pathname.startsWith('/admin')) return 'Admin';
    if (pathname.startsWith('/supervisor')) return 'Supervisor';
    if (pathname === '/fees') {
        const sessions = readAllSessions();
        if (sessions.Admin?.token && !isTokenExpired(sessions.Admin.token)) return 'Admin';
        if (sessions.Supervisor?.token && !isTokenExpired(sessions.Supervisor.token)) return 'Supervisor';
    }
    return null;
}

function migrateLegacySessions(all) {
    const next = { ...all };

    try {
        const legacyRaw = localStorage.getItem(LEGACY_SESSION_KEY);
        if (legacyRaw) {
            const parsed = JSON.parse(legacyRaw);
            const role = normalizeRole(parsed?.user?.role);
            if (role && parsed?.token && parsed?.user && !next[role]) {
                next[role] = {
                    token: parsed.token,
                    user: parsed.user,
                    profile: parsed.profile ?? null,
                };
            }
            localStorage.removeItem(LEGACY_SESSION_KEY);
        }
    } catch {
        // ignore
    }

    const legacyToken = localStorage.getItem('token');
    const legacyUser = localStorage.getItem('user');
    if (legacyToken && legacyUser) {
        try {
            const user = JSON.parse(legacyUser);
            const role = normalizeRole(user?.role);
            if (role && !next[role]) {
                const profileRaw = localStorage.getItem('profile');
                next[role] = {
                    token: legacyToken,
                    user,
                    profile: profileRaw ? JSON.parse(profileRaw) : null,
                };
            }
        } catch {
            // ignore
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
    }

    return next;
}

function readAllSessions() {
    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        if (raw) {
            return migrateLegacySessions(JSON.parse(raw));
        }
    } catch {
        // ignore
    }
    return migrateLegacySessions({});
}

function persistAllSessions(all) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
}

function syncSessionUser(session) {
    if (!session?.token || !session?.user) return session;
    const identity = getPayloadIdentity(decodeJwtPayload(session.token));
    if (identity.id && identity.role) {
        if (identity.id !== session.user.id || identity.role !== session.user.role) {
            session.user = {
                ...session.user,
                id: identity.id,
                role: identity.role,
                name: identity.name ?? session.user.name,
                email: identity.email ?? session.user.email,
                region: identity.region ?? session.user.region,
                district: identity.district ?? session.user.district,
            };
        }
    }
    return session;
}

function readSession(role = getRoleFromPath()) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) return null;
    const all = readAllSessions();
    const session = all[normalizedRole];
    if (!session?.token || !session?.user) return null;
    return syncSessionUser(session);
}

function writeSession({ token, user, profile = null, role = user?.role }) {
    const normalizedRole = normalizeRole(role ?? user?.role);
    if (!normalizedRole || !token || !user) return;

    const all = readAllSessions();
    all[normalizedRole] = { token, user, profile: profile ?? all[normalizedRole]?.profile ?? null };
    persistAllSessions(all);
}

function clearSession(role = getRoleFromPath()) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
        localStorage.removeItem(SESSIONS_KEY);
        localStorage.removeItem(LEGACY_SESSION_KEY);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        return;
    }

    const all = readAllSessions();
    delete all[normalizedRole];
    persistAllSessions(all);
}

function getToken(role = getRoleFromPath()) {
    return readSession(role)?.token || null;
}

function getUser(role = getRoleFromPath()) {
    return readSession(role)?.user || null;
}

function isAuthenticated(role = getRoleFromPath()) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) return false;
    const session = readSession(normalizedRole);
    if (!session?.token || !session?.user) return false;
    return !isTokenExpired(session.token);
}

function isAuthenticatedForRoles(roles = []) {
    return roles.some((role) => isAuthenticated(role));
}

function getUserForRoles(roles = []) {
    for (const role of roles) {
        const user = getUser(role);
        if (user) return user;
    }
    return null;
}

function getTokenForRoles(roles = []) {
    for (const role of roles) {
        const token = getToken(role);
        if (token && !isTokenExpired(token)) return token;
    }
    return null;
}

function getLoginPathForRole(role) {
    if (role === 'Student') return '/';
    if (role === 'Admin') return '/';
    if (role === 'Supervisor') return '/';
    return '/';
}

function getLoginPathForLocation(pathname = window.location.pathname) {
    if (pathname.startsWith('/student')) return '/';
    if (pathname.startsWith('/admin')) return '/';
    if (pathname.startsWith('/supervisor')) return '/';
    return '/';
}

function updateSessionUser(user, role = user?.role ?? getRoleFromPath()) {
    const normalizedRole = normalizeRole(role);
    const session = readSession(normalizedRole);
    if (!session?.token || !normalizedRole) return;
    writeSession({ ...session, user, role: normalizedRole });
}

function updateSessionToken(token, user, role = user?.role ?? getRoleFromPath()) {
    if (!token || !user) return;
    const normalizedRole = normalizeRole(role ?? user.role);
    const session = readSession(normalizedRole);
    writeSession({
        token,
        user,
        role: normalizedRole,
        profile: session?.profile ?? null,
    });
}

async function refreshSession(role = getRoleFromPath()) {
    const normalizedRole = normalizeRole(role);
    const token = getToken(normalizedRole);
    if (!normalizedRole || !token) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            if (res.status === 401) {
                try {
                    const err = await res.json();
                    if (String(err?.message || '').toLowerCase().includes('invalid or expired')) {
                        clearSession(normalizedRole);
                    }
                } catch {
                    // ignore parse errors
                }
            }
            return false;
        }

        const data = await res.json();
        if (!data?.token || !data?.user) return false;

        const session = readSession(normalizedRole);
        writeSession({
            token: data.token,
            user: data.user,
            role: normalizedRole,
            profile: data.profile ?? session?.profile ?? null,
        });
        return true;
    } catch {
        return false;
    }
}

async function bootstrapSession(role = getRoleFromPath()) {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole || !getToken(normalizedRole) || !getUser(normalizedRole)) return false;

    const token = getToken(normalizedRole);
    if (!isTokenExpired(token, 5 * 60_000)) {
        refreshSession(normalizedRole).catch(() => {});
        return true;
    }

    const refreshed = await refreshSession(normalizedRole);
    if (refreshed) return true;

    return !isTokenExpired(token);
}

function getAuthStateForPath(pathname = window.location.pathname) {
    const role = getRoleFromPath(pathname);
    if (role) {
        return {
            role,
            user: getUser(role),
            authenticated: isAuthenticated(role),
        };
    }

    if (pathname === '/fees') {
        const roles = ['Admin', 'Supervisor'];
        return {
            role: null,
            user: getUserForRoles(roles),
            authenticated: isAuthenticatedForRoles(roles),
        };
    }

    return { role: null, user: null, authenticated: false };
}

export {
    SESSIONS_KEY,
    PORTAL_ROLES,
    readSession,
    writeSession,
    clearSession,
    getToken,
    getUser,
    isAuthenticated,
    isAuthenticatedForRoles,
    getUserForRoles,
    getTokenForRoles,
    isTokenExpired,
    getRoleFromPath,
    getLoginPathForRole,
    getLoginPathForLocation,
    updateSessionUser,
    updateSessionToken,
    refreshSession,
    bootstrapSession,
    getAuthStateForPath,
};
