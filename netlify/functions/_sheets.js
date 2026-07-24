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

module.exports = { sheetsRead, sheetsWrite };
