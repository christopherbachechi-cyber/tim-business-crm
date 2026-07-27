const BASE = process.env.CRM_API_BASE; // e.g. https://crm-tim.netlify.app

async function getData(type) {
  const res = await fetch(`${BASE}/api/data?type=${encodeURIComponent(type)}`);
  const text = await res.text();
  if (!text || text === 'null') return type === 'active' ? null : [];
  return JSON.parse(text);
}

async function postData(type, data) {
  await fetch(`${BASE}/api/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  });
}

module.exports = { getData, postData };
