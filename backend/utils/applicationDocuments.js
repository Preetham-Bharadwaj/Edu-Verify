import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import {
    getApplicationDocumentsFallback,
    saveApplicationDocumentsFallback,
} from '../services/documentStorage.js';

export function isMissingTableError(error) {
    return error?.code === 'PGRST205';
}

export async function saveApplicationDocuments(applicationId, userId, documents = []) {
    const validDocs = (documents || []).filter((doc) => doc?.fileName && doc?.fileDataBase64);
    if (!validDocs.length) {
        return [];
    }

    const payload = validDocs.map((doc) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        application_id: applicationId,
        category: doc.category,
        file_name: doc.fileName,
        mime_type: doc.mimeType,
        file_size: doc.fileSize || 0,
        file_data_base64: doc.fileDataBase64,
    }));

    const { error } = await supabase.from('student_documents').insert(payload);
    if (!error) {
        return payload;
    }
    if (isMissingTableError(error)) {
        return saveApplicationDocumentsFallback(applicationId, userId, validDocs);
    }
    throw error;
}

function mergeDocumentContent(primaryDocs, fallbackDocs) {
    const fallbackById = new Map((fallbackDocs || []).map((doc) => [doc.id, doc]));
    const fallbackByCategory = new Map((fallbackDocs || []).map((doc) => [doc.category, doc]));
    const merged = (primaryDocs || []).map((doc) => {
        const fallback = fallbackById.get(doc.id) || fallbackByCategory.get(doc.category);
        if (!doc.file_data_base64 && fallback?.file_data_base64) {
            return { ...doc, file_data_base64: fallback.file_data_base64 };
        }
        return doc;
    });

    const mergedKeys = new Set(
        merged.map((doc) => `${doc.category || ''}:${doc.file_name || ''}`)
    );
    for (const fallbackDoc of fallbackDocs || []) {
        const key = `${fallbackDoc.category || ''}:${fallbackDoc.file_name || ''}`;
        if (!mergedKeys.has(key)) {
            merged.push(fallbackDoc);
        }
    }

    return merged.sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
}

export async function getApplicationDocuments(applicationId, { includeContent = true } = {}) {
    const columns = includeContent
        ? '*'
        : 'id, application_id, category, file_name, mime_type, file_size, created_at, updated_at';

    const { data, error } = await supabase
        .from('student_documents')
        .select(columns)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

    const fallbackDocs = includeContent
        ? await getApplicationDocumentsFallback(applicationId)
        : [];

    if (!error && data?.length) {
        return includeContent ? mergeDocumentContent(data, fallbackDocs) : data;
    }
    if (error && !isMissingTableError(error)) {
        throw error;
    }

    return fallbackDocs;
}
