exports.handler = async (event) => {
  const sid = event.queryStringParameters?.sid;
  if (!sid) return { statusCode: 400, body: 'Missing sid' };

  const { VPS_RECORDING_URL, VPS_RECORDING_SECRET } = process.env;
  if (!VPS_RECORDING_URL || !VPS_RECORDING_SECRET) {
    return { statusCode: 500, body: 'Recording server non configurato' };
  }

  try {
    const url = `${VPS_RECORDING_URL}/recordings/${encodeURIComponent(sid)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${VPS_RECORDING_SECRET}` } });
    if (!res.ok) return { statusCode: 404, body: 'Recording not found' };

    const buf = await res.arrayBuffer();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=3600' },
      body: Buffer.from(buf).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('recording.js:', e.message);
    return { statusCode: 502, body: 'Recording server non raggiungibile' };
  }
};
