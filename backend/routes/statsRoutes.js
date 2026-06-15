import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET /api/stats/applications
router.get('/applications', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error) {
        console.error("Error fetching applications count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/stats/approved
router.get('/approved', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Approved');

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error) {
        console.error("Error fetching approved count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/stats/regions
router.get('/regions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('region');

        if (error) throw error;
        
        const uniqueRegions = new Set(data.map(item => item.region).filter(Boolean));
        // Default to at least the standard regions if db is empty/unseeded
        const count = uniqueRegions.size > 0 ? uniqueRegions.size : 4;
        
        res.json({ count });
    } catch (error) {
        console.error("Error fetching regions count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/stats/students
router.get('/students', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Student');

        if (error) throw error;
        res.json({ count: count || 0 });
    } catch (error) {
        console.error("Error fetching students count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
