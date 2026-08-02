const { schedule } = require('@netlify/functions');
const { sheetsReadList, sheetsWriteList } = require('./_sheets');
const { sendMail } = require('./_mailer');
const { getDrive } = require('./_drive');

// "Adesso" nel fuso orario Europe/Rome, come stringhe 'YYYY-MM-DD'/'HH:MM' — stesso confronto
// lessicografico usato altrove nel progetto per le date locali (crm-logic.js, localDateStr).
function nowInRome() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

function isDue(reminder, now) {
  if (reminder.status !== 'programmato') return false;
  if (!reminder.sendDate) return false;
  const time = reminder.sendTime || '09:00';
  return reminder.sendDate < now.date || (reminder.sendDate === now.date && time <= now.time);
}

async function fetchAttachmentBuffer(drive, fileId) {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

async function processReminder(drive, reminder) {
  const attachmentRefs = JSON.parse(reminder.attachments || '[]');
  const attachments = [];
  for (const ref of attachmentRefs) {
    attachments.push({
      filename: ref.filename,
      content: await fetchAttachmentBuffer(drive, ref.driveFileId),
      contentType: ref.mimeType,
    });
  }
  await sendMail({ to: reminder.toEmail, subject: reminder.subject, text: reminder.body, attachments });
}

const handler = async () => {
  const now = nowInRome();
  const reminders = await sheetsReadList('reminders');
  const due = reminders.filter((r) => isDue(r, now));
  if (due.length === 0) return { statusCode: 200, body: JSON.stringify({ ok: true, sent: 0 }) };

  let drive = null;
  const timelineEntries = [];
  const updated = [...reminders];

  for (const reminder of due) {
    const idx = updated.findIndex((r) => r.id === reminder.id);
    try {
      const attachmentRefs = JSON.parse(reminder.attachments || '[]');
      if (attachmentRefs.length > 0 && !drive) drive = await getDrive();
      await processReminder(drive, reminder);
      updated[idx] = { ...reminder, status: 'inviato', sentAt: new Date().toISOString(), errorMessage: null };
      timelineEntries.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        clientId: reminder.clientId || reminder.leadId,
        date: new Date().toISOString(),
        user: 'Sistema',
        type: 'nota',
        text: `📧 Reminder inviato: ${reminder.subject}`,
      });
    } catch (e) {
      console.error('send-reminders.js, reminder', reminder.id, ':', e.message);
      updated[idx] = { ...reminder, status: 'errore', errorMessage: e.message };
    }
  }

  await sheetsWriteList('reminders', updated);
  if (timelineEntries.length > 0) {
    const timeline = await sheetsReadList('timeline');
    await sheetsWriteList('timeline', [...timeline, ...timelineEntries]);
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, sent: due.length }) };
};

exports.handler = schedule('*/15 * * * *', handler);
