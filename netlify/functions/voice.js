const Twilio = require('twilio');

exports.handler = async (event) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  const body  = event.body ? Object.fromEntries(new URLSearchParams(event.body)) : {};
  const base  = process.env.URL || `https://${event.headers.host}`;
  const To    = body.To;

  if (!To) {
    twiml.say({ language: 'it-IT' }, 'Numero non specificato.');
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
  }

  let number = To.replace(/\s+/g, '');
  if (!number.startsWith('+')) number = `+39${number.replace(/^0+/, '')}`;

  const dial = twiml.dial({
    callerId: process.env.TWILIO_PHONE_NUMBER,
    record: 'record-from-ringing-dual',
    recordingStatusCallback: `${base}/.netlify/functions/recording-ready`,
    recordingStatusCallbackMethod: 'POST',
    action: `${base}/.netlify/functions/call-ended`,
    timeout: 30,
  });
  dial.number(number);

  return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: twiml.toString() };
};
