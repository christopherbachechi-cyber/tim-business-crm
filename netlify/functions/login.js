exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    const { MASTER_USER: masterUser, MASTER_PASSWORD: masterPass, AGENT_USER: agentUser, AGENT_PASSWORD: agentPass } = process.env;

    if (!masterUser || !masterPass || !agentUser || !agentPass) {
      console.error('login.js: credenziali non configurate su Netlify (MASTER_USER/MASTER_PASSWORD/AGENT_USER/AGENT_PASSWORD)');
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Autenticazione non configurata' }) };
    }

    if (username && password) {
      if (username.toLowerCase() === masterUser.toLowerCase() && password === masterPass) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, role: 'master', name: 'Christopher' }) };
      }
      if (username.toLowerCase() === agentUser.toLowerCase() && password === agentPass) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, role: 'agent', name: agentUser }) };
      }
    }

    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Credenziali non valide' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
