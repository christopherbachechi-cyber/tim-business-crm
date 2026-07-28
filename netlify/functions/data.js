const { sheetsRead, sheetsWrite, sheetsReadList, sheetsWriteList, isListType } = require('./_sheets');

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };

  const type = event.queryStringParameters?.type;

  try {
    if (event.httpMethod === 'GET') {
      if (!type) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Missing type' }) };
      if (isListType(type)) {
        const list = await sheetsReadList(type);
        return { statusCode: 200, headers: H, body: JSON.stringify(list) };
      }
      const raw = await sheetsRead(type);
      return { statusCode: 200, headers: H, body: raw ?? (type === 'active' ? 'null' : '[]') };
    }

    if (event.httpMethod === 'POST') {
      const { type: t, data } = JSON.parse(event.body || '{}');
      if (!t) return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Missing type' }) };
      if (isListType(t)) await sheetsWriteList(t, Array.isArray(data) ? data : []);
      else await sheetsWrite(t, JSON.stringify(data));
      return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: H, body: 'Method not allowed' };
  } catch (e) {
    console.error('data.js:', e.message);
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};
