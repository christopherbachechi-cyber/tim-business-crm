exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    const masterUser = process.env.MASTER_USER     || 'christopher';
    const masterPass = process.env.MASTER_PASSWORD || 'master1234';
    const agentUser  = process.env.AGENT_USER      || 'agente';
    const agentPass  = process.env.AGENT_PASSWORD  || 'agente1234';

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
