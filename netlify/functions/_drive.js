const { google } = require('googleapis');

const ROOT_FOLDER_NAME = 'TIM Business CRM - Documenti';

// Drive con l'identità reale dell'utente (OAuth, scope drive.file), non il service account:
// un service account non ha quota per CREARE file su un Drive personale (solo su Drive condivisi,
// che richiedono Google Workspace). Sheets/Calendar restano invece sul service account, che opera
// su risorse già esistenti e non ha questo vincolo.
async function getDrive() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Trova (o crea, la prima volta) una cartella per nome dentro un genitore dato (o nella root del
// Drive se parentId è null) — nessun ID fisso da configurare, creata dall'app stessa sotto scope
// drive.file, quindi visibile solo a lei.
async function findOrCreateFolder(drive, name, parentId) {
  const q = [
    `name='${name}'`,
    "mimeType='application/vnd.google-apps.folder'",
    'trashed=false',
    ...(parentId ? [`'${parentId}' in parents`] : []),
  ].join(' and ');
  const found = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
  if (found.data.files && found.data.files.length > 0) return found.data.files[0].id;
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });
  return created.data.id;
}

async function findOrCreateRootFolder(drive) {
  return findOrCreateFolder(drive, ROOT_FOLDER_NAME, null);
}

module.exports = { getDrive, findOrCreateFolder, findOrCreateRootFolder, ROOT_FOLDER_NAME };
