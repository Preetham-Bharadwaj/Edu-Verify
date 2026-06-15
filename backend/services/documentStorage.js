import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.join(__dirname, '..', 'data', 'application-documents');

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

export async function saveApplicationDocumentsFallback(applicationId, userId, documents = []) {
    if (!applicationId || !documents.length) {
        return [];
    }

    const appDir = path.join(STORAGE_ROOT, applicationId);
    await ensureDir(appDir);

    const saved = [];
    for (const doc of documents) {
        if (!doc?.fileName || !doc?.fileDataBase64) continue;

        const id = crypto.randomUUID();
        const record = {
            id,
            user_id: userId,
            application_id: applicationId,
            category: doc.category || 'Document',
            file_name: doc.fileName,
            mime_type: doc.mimeType || 'application/octet-stream',
            file_size: doc.fileSize || 0,
            file_data_base64: doc.fileDataBase64,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await fs.writeFile(
            path.join(appDir, `${id}.json`),
            JSON.stringify(record),
            'utf8'
        );
        saved.push(record);
    }

    return saved;
}

export async function getApplicationDocumentsFallback(applicationId) {
    if (!applicationId) return [];

    const appDir = path.join(STORAGE_ROOT, applicationId);
    try {
        const files = await fs.readdir(appDir);
        const records = await Promise.all(
            files
                .filter((name) => name.endsWith('.json'))
                .map(async (name) => {
                    const raw = await fs.readFile(path.join(appDir, name), 'utf8');
                    return JSON.parse(raw);
                })
        );
        return records.sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        );
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}
