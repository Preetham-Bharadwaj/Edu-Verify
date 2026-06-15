import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!@#';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function issueAuthToken(user) {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            region: user.region,
            district: user.district
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

export function toAuthUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        region: user.region,
        district: user.district,
        status: user.status
    };
}

export async function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: "Access denied. Invalid token format." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        if (!req.user.role && req.user.id) {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, name, email, role, region, district, status')
                .eq('id', req.user.id)
                .limit(1);

            if (!error && users?.[0]) {
                req.user = {
                    ...req.user,
                    name: users[0].name,
                    email: users[0].email,
                    role: users[0].role,
                    region: users[0].region,
                    district: users[0].district,
                    status: users[0].status,
                };
            }
        }

        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
}

export function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized." });
        }
        
        if (!req.user.role) {
            return res.status(401).json({ message: "Invalid token. Please log in again." });
        }

        const userRole = String(req.user.role || '').trim().toLowerCase();
        const allowedRoles = (Array.isArray(roles) ? roles : [roles])
            .map((role) => String(role).trim().toLowerCase());
        const hasRole = allowedRoles.includes(userRole);
            
        if (!hasRole) {
            return res.status(403).json({ message: "Forbidden. Insufficient permissions." });
        }
        next();
    };
}
