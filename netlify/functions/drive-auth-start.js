// GET /api/drive-auth-start — redirect al consenso Google per collegare Drive con l'identità reale
// dell'utente (scope drive.file: l'app vede solo ciò che crea lei stessa, non l'intero Drive).
exports.handler = async (event) => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return { statusCode: 500, headers: { 'Content-Type': 'text/plain' }, body: 'GOOGLE_OAUTH_CLIENT_ID non configurato su Netlify' };
  }

  const host = event.headers.host;
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/drive-auth-callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
  });

  return {
    statusCode: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` },
    body: '',
  };
};
