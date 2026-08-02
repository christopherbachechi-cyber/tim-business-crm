const { sendMail } = require('./_mailer');

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };

  try {
    const { to, subject, text } = JSON.parse(event.body || '{}');
    if (!to || !subject || !text) {
      return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Destinatario, oggetto e testo sono obbligatori' }) };
    }

    await sendMail({ to, subject, text });

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('send-offerta.js:', e.message);
    const error = e.message.includes('non configurata') ? e.message : 'Invio fallito: ' + e.message;
    return { statusCode: 500, headers: H, body: JSON.stringify({ error }) };
  }
};
