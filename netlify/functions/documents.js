const { sheetsReadList, sheetsWriteList } = require('./_sheets');
const { getDrive, findOrCreateRootFolder } = require('./_drive');
const { Readable } = require('stream');

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB — il body delle Netlify Functions ha un tetto ~6MB e il base64 gonfia la dimensione di ~33%

// Crea la cartella del cliente al primo upload (non alla creazione del cliente) e la ricorda su Sheets
async function findOrCreateClientFolder(drive, client) {
  if (client.driveFolderId) return client.driveFolderId;
  const rootId = await findOrCreateRootFolder(drive);
  const res = await drive.files.create({
    requestBody: {
      name: `${client.name} (${client.id})`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootId],
    },
    fields: 'id',
  });
  const folderId = res.data.id;
  const clients = await sheetsReadList('clients');
  await sheetsWriteList('clients', clients.map((c) => (String(c.id) === String(client.id) ? { ...c, driveFolderId: folderId } : c)));
  return folderId;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };

  try {
    const drive = await getDrive();
    if (!drive) {
      return { statusCode: 500, headers: H, body: JSON.stringify({ code: 'drive_not_connected', error: 'Google Drive non è ancora collegato' }) };
    }

    if (event.httpMethod === 'GET') {
      const { clientId, serviceId } = event.queryStringParameters || {};
      if (!clientId) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'clientId obbligatorio' }) };
      const clients = await sheetsReadList('clients');
      const client = clients.find((c) => String(c.id) === String(clientId));
      if (!client || !client.driveFolderId) return { statusCode: 200, headers: H, body: JSON.stringify([]) };
      const res = await drive.files.list({
        q: `'${client.driveFolderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,size,createdTime,webViewLink,properties)',
        pageSize: 200,
      });
      const files = (res.data.files || []).filter((f) => (
        serviceId ? f.properties?.serviceId === String(serviceId) : !f.properties?.serviceId
      ));
      return { statusCode: 200, headers: H, body: JSON.stringify(files) };
    }

    if (event.httpMethod === 'POST') {
      const { clientId, serviceId, filename, mimeType, dataBase64 } = JSON.parse(event.body || '{}');
      if (!clientId || !filename || !dataBase64) {
        return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Dati mancanti (clientId, filename, dataBase64)' }) };
      }
      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.length > MAX_FILE_BYTES) {
        return { statusCode: 413, headers: H, body: JSON.stringify({ error: 'File troppo grande (massimo 4MB)' }) };
      }
      const clients = await sheetsReadList('clients');
      const client = clients.find((c) => String(c.id) === String(clientId));
      if (!client) return { statusCode: 404, headers: H, body: JSON.stringify({ error: 'Cliente non trovato' }) };

      const folderId = await findOrCreateClientFolder(drive, client);
      const res = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [folderId],
          properties: serviceId ? { clientId: String(clientId), serviceId: String(serviceId) } : { clientId: String(clientId) },
        },
        media: { mimeType: mimeType || 'application/octet-stream', body: Readable.from(buffer) },
        fields: 'id,name,mimeType,size,createdTime,webViewLink,properties',
      });
      return { statusCode: 200, headers: H, body: JSON.stringify(res.data) };
    }

    if (event.httpMethod === 'DELETE') {
      const { fileId } = event.queryStringParameters || {};
      if (!fileId) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'fileId obbligatorio' }) };
      // Cestina invece di eliminare in modo permanente — reversibile da Drive
      await drive.files.update({ fileId, requestBody: { trashed: true } });
      return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: H, body: JSON.stringify({ error: 'Metodo non supportato' }) };
  } catch (e) {
    console.error('documents.js:', e.message);
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};
