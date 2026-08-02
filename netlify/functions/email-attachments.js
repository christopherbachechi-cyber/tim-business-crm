const { getDrive, findOrCreateFolder, findOrCreateRootFolder } = require('./_drive');
const { Readable } = require('stream');

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_FILE_BYTES = 4 * 1024 * 1024; // stesso limite già usato per i Documenti cliente
const ATTACHMENTS_FOLDER_NAME = 'Allegati Email';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'Metodo non supportato' }) };

  try {
    const drive = await getDrive();
    if (!drive) {
      return { statusCode: 500, headers: H, body: JSON.stringify({ code: 'drive_not_connected', error: 'Google Drive non è ancora collegato' }) };
    }

    const { filename, mimeType, dataBase64 } = JSON.parse(event.body || '{}');
    if (!filename || !dataBase64) {
      return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Dati mancanti (filename, dataBase64)' }) };
    }
    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.length > MAX_FILE_BYTES) {
      return { statusCode: 413, headers: H, body: JSON.stringify({ error: 'File troppo grande (massimo 4MB)' }) };
    }

    const rootId = await findOrCreateRootFolder(drive);
    const folderId = await findOrCreateFolder(drive, ATTACHMENTS_FOLDER_NAME, rootId);

    const res = await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType: mimeType || 'application/octet-stream', body: Readable.from(buffer) },
      fields: 'id,name,mimeType,size',
    });
    return { statusCode: 200, headers: H, body: JSON.stringify(res.data) };
  } catch (e) {
    console.error('email-attachments.js:', e.message);
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};
