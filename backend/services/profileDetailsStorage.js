import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.join(__dirname, '..', 'data', 'student-profile-details');

async function ensureDir() {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });
}

export async function saveProfileDetailsFallback(userId, payload = {}) {
    if (!userId) return null;

    await ensureDir();
    const record = {
        user_id: userId,
        ...payload,
        updated_at: new Date().toISOString(),
    };

    await fs.writeFile(
        path.join(STORAGE_ROOT, `${userId}.json`),
        JSON.stringify(record),
        'utf8'
    );
    return record;
}

export async function getProfileDetailsFallback(userId) {
    if (!userId) return null;

    try {
        const raw = await fs.readFile(path.join(STORAGE_ROOT, `${userId}.json`), 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}
