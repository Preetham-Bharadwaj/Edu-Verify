import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import supervisorRoutes from './routes/supervisorRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import feeScraperRoutes from './routes/feeScraperRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import { ensureDemoAccounts } from './utils/demoAccounts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean)
        : '*'
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            message: 'Upload too large. Please use files under 5 MB each and try again.',
        });
    }
    next(err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/fees', feeScraperRoutes);
app.use('/api/stats', statsRoutes);

// Root Endpoint
app.get('/', (req, res) => {
    res.status(200).json({ message: "EduVerify Backend Running" });
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "EduVerify Backend",
        timestamp: new Date().toISOString()
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.toString() : 'Server Error'
    });
});

async function startServer() {
    if (process.env.NODE_ENV !== 'production' && process.env.AUTO_SEED_DEMO_ACCOUNTS !== 'false') {
        try {
            const result = await ensureDemoAccounts();
            if (!result?.skipped) {
                console.log(`Demo accounts ready. Seeded ${result.seeded || 0} account(s).`);
            }
        } catch (error) {
            console.error('Demo account seeding failed:', error);
        }
    }

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Using Supabase JS Data API directly via HTTP`);
    });
}

startServer();
