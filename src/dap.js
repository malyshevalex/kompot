// Клиент Debug Adapter Protocol для lldb-dap: точки останова, шаги, переменные, стек.
const { spawn } = require('child_process');

class Dap {
  constructor({ onEvent }) {
    this.onEvent = onEvent;
    this.proc = null;
    this.seq = 1;
    this.pending = new Map();
    this.waiters = [];
  }

  start(adapter, env) {
    this.stop();
    this.proc = spawn(adapter, [], { windowsHide: true, env });
    let buf = Buffer.alloc(0);
    this.proc.stdout.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        const sep = buf.indexOf('\r\n\r\n');
        if (sep < 0) break;
        const m = /Content-Length: (\d+)/i.exec(buf.slice(0, sep).toString());
        const len = m ? +m[1] : 0;
        if (buf.length < sep + 4 + len) break;
        const msg = JSON.parse(buf.slice(sep + 4, sep + 4 + len).toString('utf8'));
        buf = buf.slice(sep + 4 + len);
        this.handle(msg);
      }
    });
    this.proc.stderr.on('data', () => {});
    this.proc.on('exit', () => {
      this.proc = null;
      for (const res of this.pending.values()) res(null);
      this.pending.clear();
      this.onEvent({ event: 'adapterExit' });
    });
    this.proc.on('error', (err) => this.onEvent({ event: 'adapterError', body: { message: String(err.message || err) } }));
  }

  stop() {
    if (this.proc) this.proc.kill();
    this.proc = null;
  }

  handle(msg) {
    if (msg.type === 'response') {
      const res = this.pending.get(msg.request_seq);
      this.pending.delete(msg.request_seq);
      res?.(msg);
    } else if (msg.type === 'event') {
      const i = this.waiters.findIndex((w) => w.event === msg.event);
      if (i >= 0) this.waiters.splice(i, 1)[0].resolve(msg);
      this.onEvent(msg);
    } else if (msg.type === 'request') {
      this.write({ seq: this.seq++, type: 'response', request_seq: msg.seq, command: msg.command, success: false });
    }
  }

  write(obj) {
    if (!this.proc) return;
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    this.proc.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.proc.stdin.write(body);
  }

  request(command, args = {}, timeout = 15000) {
    if (!this.proc) return Promise.resolve(null);
    const seq = this.seq++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq);
        resolve(null);
      }, timeout);
      this.pending.set(seq, (m) => {
        clearTimeout(timer);
        resolve(m);
      });
      this.write({ seq, type: 'request', command, arguments: args });
    });
  }

  waitEvent(event, timeout = 15000) {
    return new Promise((resolve) => {
      const w = { event, resolve };
      this.waiters.push(w);
      setTimeout(() => {
        const i = this.waiters.indexOf(w);
        if (i >= 0) {
          this.waiters.splice(i, 1);
          resolve(null);
        }
      }, timeout);
    });
  }
}

module.exports = { Dap };
