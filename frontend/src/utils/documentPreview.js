function getDocumentBase64(doc) {
    return doc?.file_data_base64 || doc?.file_data || '';
}

function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
}

export function openDocumentPreview(doc) {
    const base64 = getDocumentBase64(doc);
    if (!base64) {
        return 'Document preview is not available.';
    }

    const mimeType = doc.mime_type || 'application/octet-stream';
    const fileName = doc.file_name || 'document';
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
        return 'Allow pop-ups to preview documents.';
    }

    const blob = base64ToBlob(base64, mimeType);
    const blobUrl = URL.createObjectURL(blob);
    previewWindow.document.title = fileName;

    if (mimeType.startsWith('image/')) {
        previewWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${fileName}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; justify-content: center; align-items: center; background: #0f172a; }
      img { max-width: 100%; max-height: 100vh; object-fit: contain; }
    </style>
  </head>
  <body>
    <img src="${blobUrl}" alt="${fileName}" />
  </body>
</html>`);
    } else if (mimeType === 'application/pdf') {
        previewWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${fileName}</title>
    <style>html, body { margin: 0; height: 100%; }</style>
  </head>
  <body>
    <iframe src="${blobUrl}" width="100%" height="100%" style="border:none;"></iframe>
  </body>
</html>`);
    } else {
        previewWindow.location.href = blobUrl;
    }

    previewWindow.document.close();
    previewWindow.addEventListener('beforeunload', () => URL.revokeObjectURL(blobUrl));
    return null;
}

export function downloadDocumentFile(doc) {
    const base64 = getDocumentBase64(doc);
    if (!base64) {
        return 'Document download is not available.';
    }

    const mimeType = doc.mime_type || 'application/octet-stream';
    const blob = base64ToBlob(base64, mimeType);
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = doc.file_name || 'document';
    anchor.click();
    URL.revokeObjectURL(blobUrl);
    return null;
}
