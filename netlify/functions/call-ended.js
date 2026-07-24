const { sheetsRead, sheetsWrite } = require('./_sheets');

exports.handler = async (event) => {
  try {
    const body = Object.fromEntries(new URLSearchParams(event.body || ''));
    const { CallSid, DialCallDuration, CallDuration } = body;
    const duration = parseInt(DialCallDuration || CallDuration || 0);

    const raw = await sheetsRead('calls');
    let calls = raw ? JSON.parse(raw) : [];
    calls = calls.map(c =>
      c.callSid === CallSid
        ? { ...c, duration, endTime: new Date().toISOString() }
        : c
    );
    await sheetsWrite('calls', JSON.stringify(calls));
    await sheetsWrite('active', 'null');
  } catch (e) {
    console.error('call-ended:', e.message);
  }

  const Twilio = require('twilio');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: new Twilio.twiml.VoiceResponse().toString(),
  };
};
