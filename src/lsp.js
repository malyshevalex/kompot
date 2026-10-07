// Минимальный клиент Language Server Protocol для clangd: подсказки, сигнатуры, описание при наведении, ошибки при наборе.
// Один открытый документ — виртуальный main.cpp в папке data/lsp рядом с compile_commands.json.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

class Lsp {
  constructor({ dir, onDiagnostics, onStatus }) {
    this.dir = dir;
    this.file = path.join(dir, 'main.cpp');
    this.uri = pathToFileURL(this.file).href;
    this.onDiagnostics = onDiagnostics;
    this.onStatus = onStatus;
    this.proc = null;
    this.pending = new Map();
    this.nextId = 1;
    this.version = 0;
    this.opened = false;
    this.text = '';
    this.ready = null;
  }

  // compile_commands.json: clangd спросит у того же компилятора пути к заголовкам и цель сборки
  writeCompileCommands(compiler, flags) {
    fs.mkdirSync(this.dir, { recursive: true });
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, '');
    const args = [compiler.path, ...flags.filter((f) => /^-std=|^--sysroot=/.test(f)), '-c', 'main.cpp'];
    fs.writeFileSync(path.join(this.dir, 'compile_commands.json'),
      JSON.stringify([{ directory: this.dir, file: 'main.cpp', arguments: args }], null, 1));
  }

  start(clangd, compiler, flags) {
    this.stop();
    this.writeCompileCommands(compiler, flags);
    const driver = [compiler.path, compiler.path.replace(/\\/g, '/')].join(',');
    this.proc = spawn(clangd, [
      '--background-index=false', '--header-insertion=never', '--completion-style=detailed',
      '--function-arg-placeholders=1', '--pch-storage=memory', '--log=error', '-j=2',
      `--query-driver=${driver}`, `--compile-commands-dir=${this.dir}`,
    ], { windowsHide: true, cwd: this.dir });
    this.opened = false;
    this.version = 0;
    let buf = Buffer.alloc(0);
    this.proc.stdout.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        const sep = buf.indexOf('\r\n\r\n');
        if (sep < 0) break;
        const m = /Content-Length: (\d+)/i.exec(buf.slice(0, sep).toString());
        if (!m) {
          buf = buf.slice(sep + 4);
          continue;
        }
        const len = +m[1];
        if (buf.length < sep + 4 + len) break;
        const msg = JSON.parse(buf.slice(sep + 4, sep + 4 + len).toString('utf8'));
        buf = buf.slice(sep + 4 + len);
        this.handle(msg);
      }
    });
    this.proc.stderr.on('data', () => {});
    this.proc.on('exit', () => {
      this.proc = null;
      this.onStatus('off');
      for (const { resolve } of this.pending.values()) resolve(null);
      this.pending.clear();
    });
    this.proc.on('error', () => this.onStatus('off'));
    this.ready = this.request('initialize', {
      processId: process.pid, rootUri: pathToFileURL(this.dir).href,
      capabilities: {
        textDocument: {
          synchronization: { didSave: false },
          completion: { completionItem: { snippetSupport: true, documentationFormat: ['markdown', 'plaintext'] } },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          signatureHelp: { signatureInformation: { documentationFormat: ['markdown', 'plaintext'], parameterInformation: { labelOffsetSupport: true } } },
          publishDiagnostics: {},
          semanticTokens: {
            requests: { full: true }, formats: ['relative'], multilineTokenSupport: false, overlappingTokenSupport: false,
            tokenTypes: ['namespace', 'type', 'class', 'enum', 'interface', 'struct', 'typeParameter', 'parameter', 'variable',
              'property', 'enumMember', 'function', 'method', 'macro', 'keyword', 'comment', 'string', 'number', 'operator'],
            tokenModifiers: ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'defaultLibrary'],
          },
        },
      },
    }, 20000).then((r) => {
      if (!r) return false;
      this.legend = r.capabilities?.semanticTokensProvider?.legend || null;
      this.notify('initialized', {});
      this.onStatus('ready');
      if (this.text) this.sync(this.text);
      return true;
    });
    this.onStatus('starting');
  }

  stop() {
    if (this.proc) this.proc.kill();
    this.proc = null;
  }

  handle(msg) {
    if (msg.id != null && this.pending.has(msg.id)) {
      const { resolve, timer } = this.pending.get(msg.id);
      clearTimeout(timer);
      this.pending.delete(msg.id);
      resolve(msg.error ? null : msg.result);
    } else if (msg.method === 'textDocument/publishDiagnostics' && msg.params.uri === this.uri) {
      this.onDiagnostics(msg.params.diagnostics || []);
    } else if (msg.id != null && msg.method) {
      this.send({ jsonrpc: '2.0', id: msg.id, result: null });  // запросы сервера к клиенту: отвечаем пусто
    }
  }

  send(obj) {
    if (!this.proc) return;
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    this.proc.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.proc.stdin.write(body);
  }

  notify(method, params) {
    this.send({ jsonrpc: '2.0', method, params });
  }

  request(method, params, timeout = 4000) {
    if (!this.proc) return Promise.resolve(null);
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(null);
      }, timeout);
      this.pending.set(id, { resolve, timer });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  // Полный текст документа при каждом изменении — для решений олимпиадных задач этого достаточно
  sync(text) {
    this.text = text;
    if (!this.proc) return;
    if (!this.opened) {
      this.opened = true;
      this.version = 1;
      this.notify('textDocument/didOpen', { textDocument: { uri: this.uri, languageId: 'cpp', version: 1, text } });
    } else {
      this.version += 1;
      this.notify('textDocument/didChange', { textDocument: { uri: this.uri, version: this.version }, contentChanges: [{ text }] });
    }
  }

  async semanticTokens() {
    if (!this.proc || !(await this.ready)) return null;
    return this.request('textDocument/semanticTokens/full', { textDocument: { uri: this.uri } }, 8000);
  }

  async call(method, position, extra = {}) {
    if (!this.proc || !(await this.ready)) return null;
    return this.request(method, { textDocument: { uri: this.uri }, position, ...extra });
  }
}

module.exports = { Lsp };
