import axios from 'axios';
import {
    clearSession,
    getLoginPathForLocation,
    getRoleFromPath,
    getToken,
    getTokenForRoles,
    isTokenExpired,
    refreshSession,
} from './utils/auth';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

let isHandlingUnauthorized = false;
const refreshPromises = new Map();

function resolveRequestRole() {
    const pathRole = getRoleFromPath();
    if (pathRole) return pathRole;
    if (window.location.pathname === '/fees') {
        return getTokenForRoles(['Admin', 'Supervisor']) ? getRoleFromPath('/fees') : null;
    }
    return null;
}

function getRefreshPromise(role) {
    const key = role || 'default';
    if (!refreshPromises.has(key)) {
        refreshPromises.set(
            key,
            refreshSession(role).finally(() => {
                refreshPromises.delete(key);
            })
        );
    }
    return refreshPromises.get(key);
}

api.interceptors.request.use((config) => {
    const requestUrl = config.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login')
        || requestUrl.includes('/auth/student/signup')
        || requestUrl.includes('/auth/demo-login');

    if (isAuthRequest) {
        return config;
    }

    const role = resolveRequestRole();
    const token = role ? getToken(role) : getTokenForRoles(['Admin', 'Supervisor', 'Student']);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        config._authRole = role;
    }
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const originalRequest = error.config || {};
        const requestUrl = originalRequest.url || '';
        const authRole = originalRequest._authRole || resolveRequestRole();
        const isAuthRequest = requestUrl.includes('/auth/login')
            || requestUrl.includes('/auth/student/signup')
            || requestUrl.includes('/auth/me')
            || requestUrl.includes('/auth/demo-login');
        const hadAuthHeader = Boolean(originalRequest.headers?.Authorization);

        if (
            status === 401 &&
            hadAuthHeader &&
            !isAuthRequest &&
            !originalRequest._retry
        ) {
            originalRequest._retry = true;
            const refreshed = await getRefreshPromise(authRole);

            if (refreshed) {
                const token = authRole ? getToken(authRole) : getTokenForRoles(['Admin', 'Supervisor', 'Student']);
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            }
        }

        const token = authRole ? getToken(authRole) : null;
        const shouldLogout = status === 401
            && hadAuthHeader
            && !isAuthRequest
            && originalRequest._retry
            && authRole
            && (!token || isTokenExpired(token));

        if (shouldLogout && !isHandlingUnauthorized) {
            isHandlingUnauthorized = true;
            clearSession(authRole);

            const loginPath = getLoginPathForLocation();
            const onProtectedPage = !window.location.pathname.includes('/login')
                && window.location.pathname !== '/'
                && window.location.pathname !== '/portals';

            if (onProtectedPage && window.location.pathname !== loginPath) {
                window.location.replace(loginPath);
            }

            setTimeout(() => {
                isHandlingUnauthorized = false;
            }, 1000);
        }

        return Promise.reject(error);
    }
);

export default api;
