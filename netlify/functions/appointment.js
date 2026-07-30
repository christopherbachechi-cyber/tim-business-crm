const { sheetsReadList, sheetsWriteList } = require('./_sheets');
const { google } = require('googleapis');

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };

  try {
    const { company, contactName, phone, date, time, notes, callSid } = JSON.parse(event.body || '{}');
    if (!company || !date) {
      return { statusCode: 400, headers: H, body: JSON.stringify({ error: 'Azienda e data obbligatori' }) };
    }

    const appt = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      company, contactName: contactName||'', phone: phone||'',
      date, time: time||'', notes: notes||'', callSid: callSid||'',
      createdAt: new Date().toISOString(), googleEventId: null, status: 'in_valuta',
    };

    // ── Save to Sheets ────────────────────────────────────────────
    const list = await sheetsReadList('appointments');
    list.push(appt);
    await sheetsWriteList('appointments', list);

    // ── Google Calendar (optional) ────────────────────────────────
    let googleEventId = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_CALENDAR_ID) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/spreadsheets',
          ],
        });
        const cal = google.calendar({ version: 'v3', auth });

        let start, end;
        if (time) {
          const [h, m] = time.split(':').map(Number);
          start = { dateTime: `${date}T${time}:00`, timeZone: 'Europe/Rome' };
          end   = { dateTime: `${date}T${String(h+1).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`, timeZone: 'Europe/Rome' };
        } else {
          start = { date }; end = { date };
        }

        const res = await cal.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          requestBody: {
            summary: `📞 TIM Business – ${company}`,
            description: [
              `Azienda: ${company}`,
              contactName && `Contatto: ${contactName}`,
              phone && `Telefono: ${phone}`,
              notes && `Note: ${notes}`,
              '\nFissato dal CRM TIM Business',
            ].filter(Boolean).join('\n'),
            start, end,
            reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
          },
        });
        googleEventId = res.data.id;

        // Update record with event ID
        const list2 = await sheetsReadList('appointments');
        await sheetsWriteList('appointments', list2.map(a => a.id === appt.id ? { ...a, googleEventId } : a));
      } catch (gcErr) {
        console.error('Google Calendar (non-fatal):', gcErr.message);
      }
    }

    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, id: appt.id, googleEventId }) };
  } catch (e) {
    console.error('appointment.js:', e.message);
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: e.message }) };
  }
};
