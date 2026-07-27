exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const { SIP_WS_URI, SIP_USER, SIP_PASSWORD, SIP_DOMAIN } = process.env;
  if (!SIP_WS_URI || !SIP_USER || !SIP_PASSWORD || !SIP_DOMAIN) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'SIP non configurato' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ wsUri: SIP_WS_URI, sipUser: SIP_USER, sipPassword: SIP_PASSWORD, sipDomain: SIP_DOMAIN }),
  };
};
