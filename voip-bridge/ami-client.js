const net = require('net');
const EventEmitter = require('events');

// Minimal Asterisk Manager Interface (AMI) client: no third-party dependency,
// so there's one less package to audit/trust on a box that also holds the
// Messagenet trunk credentials.
class AmiClient extends EventEmitter {
  constructor({ host, port, username, password }) {
    super();
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.socket = null;
    this.buffer = '';
    this.reconnectDelay = 2000;
  }

  connect() {
    this.socket = net.createConnection(this.port, this.host, () => {
      this._send({ Action: 'Login', Username: this.username, Secret: this.password });
      this.reconnectDelay = 2000;
    });

    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk) => this._onData(chunk));
    this.socket.on('error', (err) => this.emit('error', err));
    this.socket.on('close', () => {
      this.emit('disconnected');
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    });
  }

  _send(fields) {
    const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
    this.socket.write(lines.join('\r\n') + '\r\n\r\n');
  }

  _onData(chunk) {
    this.buffer += chunk;
    let idx;
    while ((idx = this.buffer.indexOf('\r\n\r\n')) !== -1) {
      const block = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 4);
      if (block.trim()) this._handleBlock(block);
    }
  }

  _handleBlock(block) {
    const fields = {};
    for (const line of block.split('\r\n')) {
      const sep = line.indexOf(':');
      if (sep === -1) continue;
      fields[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }
    if (fields.Event) this.emit('event', fields);
    else if (fields.Response) this.emit('response', fields);
  }
}

module.exports = { AmiClient };
