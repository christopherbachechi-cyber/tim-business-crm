const { sheetsRead, sheetsWrite } = require('./_sheets');

exports.handler = async (event) => {
  try {
    const body = Object.fromEntries(new URLSearchParams(event.body || ''));
    const { CallSid, RecordingSid, RecordingDuration } = body;

    const raw = await sheetsRead('calls');
    let calls = raw ? JSON.parse(raw) : [];
    calls = calls.map(c =>
      c.callSid === CallSid
        ? { ...c, recordingSid: RecordingSid, recordingDuration: parseInt(RecordingDuration || 0) }
        : c
    );
    await sheetsWrite('calls', JSON.stringify(calls));
  } catch (e) {
    console.error('recording-ready:', e.message);
  }
  return { statusCode: 200, body: 'OK' };
};
