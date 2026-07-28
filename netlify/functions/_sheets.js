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
  ],
  clients: [
    ['id', 'raw', 'ID'],
    ['name', 'string', 'Ragione sociale'],
    ['contact', 'string', 'Referente'],
    ['phone', 'string', 'Telefono'],
    ['products', 'array', 'Prodotti'],
    ['contractStart', 'string', 'Stipula'],
    ['contractEnd', 'string', 'Scadenza'],
    ['retiFisse', 'number', 'Reti fisse'],
    ['retiMobili', 'number', 'Reti mobili'],
    ['centralino', 'boolean', 'Centralino'],
    ['trunk', 'boolean', 'Trunk'],
    ['notes', 'string', 'Note'],
    ['churnRisk', 'string', 'Rischio churn'],
  ],
};

function isListType(tabName) {
  return Object.prototype.hasOwnProperty.call(SCHEMAS, tabName);
}

function serializeCell(value, type) {
  switch (type) {
    case 'nullable': return value === null || value === undefined ? '' : value;
    case 'number': return typeof value === 'number' ? value : Number(value || 0);
    case 'boolean': return value ? 'Sì' : 'No';
    case 'array': return Array.isArray(value) ? value.join(', ') : (value || '');
    case 'raw': return value === null || value === undefined ? '' : value;
    default: return value === null || value === undefined ? '' : value;
  }
}

function deserializeCell(raw, type) {
  const v = raw === undefined ? '' : raw;
  switch (type) {
    case 'nullable': return v === '' ? null : v;
    case 'number': return v === '' ? 0 : Number(v);
    case 'boolean': return v === 'Sì' || v === true;
    case 'array': return v === '' ? [] : String(v).split(',').map((s) => s.trim()).filter(Boolean);
    case 'raw': return v === '' ? null : v;
    default: return v;
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
