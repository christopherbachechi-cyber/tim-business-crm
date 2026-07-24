exports.handler = async (event) => {
  const sid = event.queryStringParameters?.sid;
  if (!sid) return { statusCode: 400, body: 'Missing sid' };

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${sid}.mp3`;
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) return { statusCode: 404, body: 'Recording not found' };

  const buf = await res.arrayBuffer();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' },
    body: Buffer.from(buf).toString('base64'),
    isBase64Encoded: true,
  };
};
