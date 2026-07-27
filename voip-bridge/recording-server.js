const https = require('https');
const fs = require('fs');
const path = require('path');

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function startRecordingServer() {
  const monitorDir = process.env.MONITOR_DIR || '/var/spool/asterisk/monitor';
  const secret = process.env.RECORDING_SECRET;
  const port = parseInt(process.env.RECORDING_PORT || '8443');

  const options = {
    cert: fs.readFileSync(process.env.CERT_PATH),
    key: fs.readFileSync(process.env.KEY_PATH),
  };

  const server = https.createServer(options, (req, res) => {
    const match = req.url.match(/^\/recordings\/([^/?]+)/);
    if (!match) {
      res.writeHead(404).end('Not found');
      return;
    }

    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      res.writeHead(401).end('Unauthorized');
      return;
    }

    const id = match[1];
    if (!ID_PATTERN.test(id)) {
      res.writeHead(400).end('Invalid id');
      return;
    }

    const filePath = path.join(monitorDir, `${id}.wav`);
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404).end('Recording not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': stat.size,
        'Cache-Control': 'private, max-age=3600',
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.listen(port, () => console.log('Recording server listening on port %d', port));
}

module.exports = { startRecordingServer };
