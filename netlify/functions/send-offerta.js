const nodemailer = require('nodemailer');

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

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
      return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'Email non configurata — completa il setup SMTP su Netlify' }) };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text,
    });

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('send-offerta.js:', e.message);
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: 'Invio fallito: ' + e.message }) };
  }
};
