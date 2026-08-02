const nodemailer = require('nodemailer');

// Errore esplicito se SMTP non configurato, mai un falso successo (stessa cautela già seguita
// per Google Drive non collegato) — usato sia dall'invio Offerte sia dai Reminder automatici.
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('Email non configurata — completa il setup SMTP su Netlify');
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

async function sendMail({ to, subject, text, attachments }) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    attachments: attachments && attachments.length ? attachments : undefined,
  });
}

module.exports = { sendMail };
