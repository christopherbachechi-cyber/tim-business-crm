const { AmiClient } = require('./ami-client');
const { getData, postData } = require('./crm-api');

function startAmiListener() {
  const ami = new AmiClient({
    host: '127.0.0.1',
    port: parseInt(process.env.AMI_PORT || '5038'),
    username: process.env.AMI_USER,
    password: process.env.AMI_PASSWORD,
  });

  ami.on('error', (err) => console.error('AMI error:', err.message));
  ami.on('disconnected', () => console.warn('AMI disconnected, will retry...'));

  ami.on('event', async (fields) => {
    try {
      if (fields.Event === 'Hangup') {
        await postData('active', null);
      } else if (fields.Event === 'UserEvent' && fields.UserEvent === 'RecordingReady') {
        const callId = fields.CallId;
        const duration = parseInt(fields.Duration || '0');
        if (!callId) return;
        const calls = await getData('calls');
        const updated = calls.map((c) =>
          c.callSid === callId ? { ...c, recordingSid: callId, recordingDuration: duration } : c
        );
        await postData('calls', updated);
      }
    } catch (e) {
      console.error('ami-listener event handling failed:', e.message);
    }
  });

  ami.connect();
  console.log('AMI listener connecting to 127.0.0.1:%s', process.env.AMI_PORT || '5038');
}

module.exports = { startAmiListener };
