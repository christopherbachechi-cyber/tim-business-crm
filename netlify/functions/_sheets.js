const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Read JSON from cell A1 of a sheet tab
async function sheetsRead(tabName) {
  try {
    const sheets = await getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1`,
    });
    const val = res.data.values?.[0]?.[0];
    return val || null;
  } catch (e) {
    console.error(`sheetsRead(${tabName}):`, e.message);
    return null;
  }
}

// Write JSON string to cell A1 of a sheet tab
async function sheetsWrite(tabName, content) {
  const sheets = await getSheets();
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[str]] },
  });
}

// ─── Tabular (row/column) storage for list-shaped tabs ────────────
// Each entry: [field, type, columnLabel]. type governs serialize/deserialize:
// 'string' | 'nullable' (''<->null) | 'number' | 'boolean' (Sì/No) | 'array' (comma-joined) | 'raw' (id fields, no coercion)
const SCHEMAS = {
  contacts: [
    ['id', 'raw', 'ID'],
    ['company', 'string', 'Azienda'],
    ['contact', 'string', 'Referente'],
    ['phone', 'string', 'Telefono'],
    ['email', 'string', 'Email'],
    ['city', 'string', 'Città'],
    ['province', 'string', 'Provincia'],
    ['sector', 'string', 'Settore'],
    ['status', 'string', 'Stato'],
    ['callbackDate', 'nullable', 'Ricontatto'],
    ['notes', 'string', 'Note'],
  ],
  calls: [
    ['id', 'raw', 'ID'],
    ['callSid', 'string', 'Call SID'],
    ['contactId', 'nullable', 'ID Contatto'],
    ['contactName', 'string', 'Azienda'],
    ['phone', 'string', 'Telefono'],
    ['startTime', 'nullable', 'Inizio'],
    ['endTime', 'nullable', 'Fine'],
    ['duration', 'number', 'Durata (s)'],
    ['outcome', 'nullable', 'Esito'],
    ['notes', 'string', 'Note'],
    ['status', 'string', 'Stato'],
    ['recordingSid', 'nullable', 'ID Registrazione'],
    ['recordingDuration', 'number', 'Durata Registrazione (s)'],
  ],
  appointments: [
    ['id', 'raw', 'ID'],
    ['company', 'string', 'Azienda'],
    ['contactName', 'string', 'Referente'],
    ['phone', 'string', 'Telefono'],
    ['date', 'string', 'Data'],
    ['time', 'string', 'Orario'],
    ['notes', 'string', 'Note'],
    ['callSid', 'string', 'Call SID'],
    ['createdAt', 'string', 'Creato il'],
    ['googleEventId', 'nullable', 'Google Event ID'],
    ['status', 'string', 'Stato'],
    ['clientId', 'raw', 'ID Cliente'],
    ['leadId', 'raw', 'ID Lead'],
  ],
  clients: [
    ['id', 'raw', 'ID'],
    ['name', 'string', 'Ragione sociale'],
    ['contact', 'string', 'Referente'],
    ['phone', 'string', 'Telefono'],
    ['contractStart', 'string', 'Stipula'],
    ['contractEnd', 'string', 'Scadenza'],
    ['notes', 'string', 'Note'],
    ['churnRisk', 'string', 'Rischio churn'],
    ['driveFolderId', 'raw', 'ID Cartella Drive'],
    ['convertedFromLead', 'boolean', 'Convertito da Lead'],
  ],
  services: [
    ['id', 'raw', 'ID'],
    ['clientId', 'raw', 'ID Cliente'],
    ['category', 'string', 'Categoria'],
    ['profile', 'string', 'Profilo'],
    ['phone', 'nullable', 'Numero'],
    ['saleDate', 'string', 'Data vendita'],
    ['activationDate', 'nullable', 'Data attivazione'],
    ['status', 'string', 'Stato'],
    ['notes', 'string', 'Note'],
    ['voceInternet', 'boolean', 'Voce+Internet'],
    ['soloInternet', 'boolean', 'Solo Internet'],
    ['backup', 'boolean', 'Backup'],
    ['casa', 'boolean', 'Casa'],
    ['voceDati', 'boolean', 'Voce+Dati'],
    ['soloDati', 'boolean', 'Solo Dati'],
    ['numeroVariabile', 'boolean', 'Numero Variabile'],
    ['axpo', 'boolean', 'Axpo'],
    ['pod', 'nullable', 'POD'],
    ['pdr', 'nullable', 'PDR'],
    ['price', 'nullable', 'Prezzo'],
  ],
  referenti: [
    ['id', 'raw', 'ID'],
    ['clientId', 'raw', 'ID Cliente'],
    ['name', 'string', 'Nome'],
    ['role', 'string', 'Ruolo'],
    ['phone', 'string', 'Telefono'],
    ['email', 'string', 'Email'],
    ['notes', 'string', 'Note'],
  ],
  timeline: [
    ['id', 'raw', 'ID'],
    ['clientId', 'raw', 'ID Cliente'],
    ['date', 'string', 'Data'],
    ['user', 'string', 'Utente'],
    ['type', 'string', 'Tipo'],
    ['text', 'string', 'Testo'],
  ],
  leads: [
    ['id', 'raw', 'ID'],
    ['company', 'string', 'Azienda'],
    ['contact', 'string', 'Referente'],
    ['phone', 'string', 'Telefono'],
    ['email', 'string', 'Email'],
    ['serviceInterest', 'string', 'Servizio di interesse'],
    ['callbackDate', 'nullable', 'Ricontatto'],
    ['callbackReason', 'string', 'Motivo ricontatto'],
    ['notes', 'string', 'Note'],
    ['status', 'string', 'Stato'],
  ],
  opportunita: [
    ['id', 'raw', 'ID'],
    ['clientId', 'raw', 'ID Cliente'],
    ['leadId', 'raw', 'ID Lead'],
    ['service', 'string', 'Servizio'],
    ['reason', 'string', 'Motivo'],
    ['dueDate', 'nullable', 'Data prevista'],
    ['status', 'string', 'Stato'],
    ['notes', 'string', 'Note'],
    ['createdAt', 'string', 'Creato il'],
  ],
  offerte: [
    ['id', 'raw', 'ID'],
    ['clientId', 'raw', 'ID Cliente'],
    ['leadId', 'raw', 'ID Lead'],
    ['status', 'string', 'Stato'],
    ['cart', 'string', 'Carrello (JSON)'],
    ['notes', 'string', 'Note interne'],
    ['createdAt', 'string', 'Creato il'],
    ['sentAt', 'nullable', 'Inviata il'],
    ['decidedAt', 'nullable', 'Decisa il'],
    ['situazioneText', 'string', 'Situazione attuale'],
    ['propostaText', 'string', 'Proposta commerciale'],
    ['economicheText', 'string', 'Condizioni economiche'],
    ['commercialiText', 'string', 'Condizioni commerciali'],
    ['validUntil', 'nullable', 'Valida fino al'],
    ['ricontattoDate', 'nullable', 'Ricontatto data'],
    ['ricontattoTime', 'string', 'Ricontatto ora'],
    ['ricontattoType', 'string', 'Ricontatto tipologia'],
    ['ricontattoNotes', 'string', 'Ricontatto note'],
  ],
};

function isListType(tabName) {
  return Object.prototype.hasOwnProperty.call(SCHEMAS, tabName);
}

// Leading apostrophe forces Sheets to store a value as plain text under USER_ENTERED, instead of
// auto-parsing it as a number/time/date. Without this, a numeric-looking string — a mobile profile
// name ("15.99"), a phone number, a POD/PDR code — gets silently reinterpreted (e.g. Sheets read
// "16.39" as 16:39 TIME) and reformatted a little differently on every subsequent rewrite, since
// sheetsWriteList rewrites the whole tab on every save. Applies to every plain-text field ('string'
// default and 'nullable'); 'number'/'boolean'/'raw' are intentionally real Sheets types.
function forceText(value) {
  return value === null || value === undefined || value === '' ? '' : `'${value}`;
}
function stripForcedText(v) {
  return v === '' ? '' : String(v).replace(/^'/, '');
}

function serializeCell(value, type) {
  switch (type) {
    case 'nullable': return forceText(value);
    case 'number': return typeof value === 'number' ? value : Number(value || 0);
    case 'boolean': return value ? 'Sì' : 'No';
    case 'array': return Array.isArray(value) ? value.join(', ') : (value || '');
    case 'raw': return value === null || value === undefined ? '' : value;
    default: return forceText(value);
  }
}

function deserializeCell(raw, type) {
  const v = raw === undefined ? '' : raw;
  switch (type) {
    case 'nullable': { const s = stripForcedText(v); return s === '' ? null : s; }
    case 'number': return v === '' ? 0 : Number(v);
    case 'boolean': return v === 'Sì' || v === true;
    case 'array': return v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean);
    case 'raw': return v === '' ? null : v;
    default: return stripForcedText(v);
  }
}

function colLetter(index) {
  let n = index + 1, s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Read a whole list-shaped tab as an array of JS objects (header row + data rows)
async function sheetsReadList(tabName) {
  const schema = SCHEMAS[tabName];
  if (!schema) throw new Error(`No schema defined for list tab "${tabName}"`);
  try {
    const sheets = await getSheets();
    const lastCol = colLetter(schema.length - 1);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A:${lastCol}`,
    });
    const rows = res.data.values || [];
    if (rows.length < 2) return [];
    const header = rows[0];
    // Match columns by label so a manually reordered header still reads correctly
    const cols = schema.map(([field, type, label], i) => {
      const idx = header.indexOf(label || field);
      return { field, type, idx: idx === -1 ? i : idx };
    });
    return rows.slice(1).map((row) => {
      const obj = {};
      for (const { field, type, idx } of cols) obj[field] = deserializeCell(row[idx], type);
      return obj;
    });
  } catch (e) {
    console.error(`sheetsReadList(${tabName}):`, e.message);
    return [];
  }
}

// Write an array of JS objects to a list-shaped tab as header row + one row per record
async function sheetsWriteList(tabName, list) {
  const schema = SCHEMAS[tabName];
  if (!schema) throw new Error(`No schema defined for list tab "${tabName}"`);
  const sheets = await getSheets();
  const lastCol = colLetter(schema.length - 1);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:${lastCol}`,
  });

  const header = schema.map(([field, , label]) => label || field);
  const rows = (list || []).map((item) => schema.map(([field, type]) => serializeCell(item[field], type)));

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...rows] },
  });
}

module.exports = { sheetsRead, sheetsWrite, sheetsReadList, sheetsWriteList, isListType };
