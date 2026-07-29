const { google } = require('googleapis');

// GET /api/drive-auth-callback — scambia il code con un refresh token e lo mostra UNA volta
// per la copia manuale su Netlify (GOOGLE_DRIVE_REFRESH_TOKEN, Secret). Non viene mai salvato
// o registrato da questa funzione: stessa regola già seguita per le altre credenziali del progetto.
exports.handler = async (event) => {
  const html = (body) => ({ statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body });

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const { code, error } = event.queryStringParameters || {};

  if (error) return html(`<p>Autorizzazione annullata da Google: ${error}</p>`);
  if (!clientId || !clientSecret) {
    return html('<p>GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET non configurati su Netlify.</p>');
  }
  if (!code) return html('<p>Codice di autorizzazione mancante nella richiesta.</p>');

  const host = event.headers.host;
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/drive-auth-callback`;

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return html(`
        <p>Google non ha restituito un refresh token (succede se il collegamento è già stato fatto in precedenza).</p>
        <p>Revoca l'accesso da <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> e riprova da <a href="/api/drive-auth-start">/api/drive-auth-start</a>.</p>
      `);
    }

    return html(`
      <div style="font-family:'DM Sans',sans-serif;max-width:640px;margin:40px auto;padding:0 20px;color:#1a1f2e;">
        <h2 style="color:#0d1b4b;">✅ Google Drive collegato</h2>
        <p>Copia questo valore e salvalo su Netlify come variabile d'ambiente <code>GOOGLE_DRIVE_REFRESH_TOKEN</code> (marcata "Secret"), poi chiudi questa pagina.</p>
        <textarea readonly style="width:100%;height:90px;font-family:monospace;font-size:13px;padding:10px;border-radius:8px;border:1.5px solid #e2e8f0;">${tokens.refresh_token}</textarea>
        <p style="color:#64748b;font-size:13px;">Questo valore non è stato salvato da nessuna parte da questa pagina — se la chiudi senza copiarlo dovrai rifare il collegamento.</p>
      </div>
    `);
  } catch (e) {
    return html(`<p>Errore durante lo scambio del codice: ${e.message}</p>`);
  }
};
