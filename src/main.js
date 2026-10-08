// Основной процесс: окно, файлы, компилятор, запуск решений.
const { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell, Menu } = require('electron');
const { spawn, execFile, execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const toolchain = require('./toolchain');
const { Lsp } = require('./lsp');
const { Dap } = require('./dap');

const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const ASCII = (p) => /^[\x20-\x7e]*$/.test(p);

app.setName('Kompot');

// ---------- где лежат данные ----------
// Всё держим внутри папки приложения (переносимый режим), если туда можно писать;
// иначе — в стандартной папке данных пользователя.
function dataDir() {
  if (process.env.KOMPOT_DATA) return process.env.KOMPOT_DATA;  // для отладки
  const candidates = [];
  // Переносная папка data рядом с Kompot.exe — только для zip под Windows.
  // На macOS писать внутрь Kompot.app нельзя: это ломает подпись, и обновление приложения стёрло бы инструменты.
  if (app.isPackaged && IS_WIN) candidates.push(path.join(path.dirname(process.execPath), 'data'));
  candidates.push(path.join(app.getPath('userData'), 'data'));
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {}
  }
  return candidates[candidates.length - 1];
}
const DATA = dataDir();
const BUILD = path.join(DATA, 'build');
const SETTINGS_FILE = path.join(DATA, 'settings.json');
fs.mkdirSync(BUILD, { recursive: true });

const RES = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
const RUNTIME = app.isPackaged ? path.join(RES, 'runtime') : path.join(__dirname, 'runtime');
const TOOLCHAIN = path.join(DATA, 'toolchain');
const SEVEN_ZIP = app.isPackaged ? path.join(RES, IS_WIN ? '7za.exe' : '7za') : require('7zip-bin').path7za;
if (!IS_WIN) try { fs.chmodSync(SEVEN_ZIP, 0o755); } catch {}

const DEFAULTS = {
  theme: 'system', fontSize: 15, timeLimit: 1, memoryLimit: 256, stackMb: 64,
  flags: '-std=gnu++17 -O2 -Wall', folder: '', file: '', recent: [],
  sidebar: 230, panel: 400, mode: 'tests',
};
let settings = { ...DEFAULTS };
try {
  settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
} catch {}
const saveSettings = () => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

// ---------- окно ----------
let win;
// Демо-сценарий снимает экран, даже когда окно закрыто другими окнами
if (process.env.KOMPOT_DEMO) {
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
}
// Сообщения в окно: при закрытии приложения clangd, отладчик и решения ещё присылают события, а окна уже нет
function safeSend(wc, channel, data) {
  if (wc && !wc.isDestroyed()) wc.send(channel, data);
}
const toWin = (channel, data) => safeSend(win && !win.isDestroyed() ? win.webContents : null, channel, data);
const PALETTE = { dark: { bg: '#111113', fg: '#d4d4d8' }, light: { bg: '#fafafa', fg: '#3f3f46' } };

function overlayColors() {
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && nativeTheme.shouldUseDarkColors);
  const p = dark ? PALETTE.dark : PALETTE.light;
  return { color: p.bg, symbolColor: p.fg, height: 47 };
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 980, minHeight: 600,
    title: 'Компот', show: false,
    icon: path.join(app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'build'), 'icon.png'),
    backgroundColor: overlayColors().color,
    titleBarStyle: 'hidden',
    ...(IS_MAC ? { trafficLightPosition: { x: 18, y: 18 } } : { titleBarOverlay: overlayColors() }),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: !process.env.KOMPOT_DEMO },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  if (process.env.KOMPOT_DEMO) win.webContents.once('did-finish-load', () => require('./demo')(win));
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

nativeTheme.on('updated', () => {
  if (!IS_MAC && win) win.setTitleBarOverlay(overlayColors());
  toWin('theme:system', nativeTheme.shouldUseDarkColors);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ---------- настройки и файлы ----------
ipcMain.handle('settings:get', () => ({ ...settings, systemDark: nativeTheme.shouldUseDarkColors, platform: process.platform }));
ipcMain.handle('settings:set', (_e, patch) => {
  settings = { ...settings, ...patch };
  saveSettings();
  if (!IS_MAC && win && 'theme' in patch) win.setTitleBarOverlay(overlayColors());
  if ('flags' in patch) detectCompiler().then(startLsp);
  return settings;
});

ipcMain.handle('dialog:folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('dialog:open', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile'], defaultPath: settings.folder || undefined,
    filters: [{ name: 'C++', extensions: ['cpp', 'cc', 'cxx', 'h', 'hpp'] }, { name: 'Все файлы', extensions: ['*'] }],
  });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('dialog:saveAs', async (_e, suggested) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: path.join(settings.folder || app.getPath('documents'), suggested || 'solution.cpp'),
    filters: [{ name: 'C++', extensions: ['cpp'] }],
  });
  return r.canceled ? null : r.filePath;
});

const natural = (a, b) => a.localeCompare(b, 'ru', { numeric: true, sensitivity: 'base' });

ipcMain.handle('fs:read', (_e, file) => {
  try {
    return { text: fs.readFileSync(file, 'utf8') };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});
ipcMain.handle('fs:write', (_e, file, text) => {
  try {
    fs.writeFileSync(file, text, 'utf8');
    return { ok: true };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});
ipcMain.handle('tests:move', (_e, from, to) => {
  if (fs.existsSync(testsFile(from))) fs.renameSync(testsFile(from), testsFile(to));
});
ipcMain.handle('fs:create', (_e, folder, name, text) => {
  const file = path.join(folder, name);
  if (fs.existsSync(file)) return { error: 'Такой файл уже есть' };
  fs.writeFileSync(file, text, 'utf8');
  return { path: file };
});
ipcMain.handle('fs:rename', (_e, file, name) => {
  const target = path.join(path.dirname(file), name);
  if (fs.existsSync(target)) return { error: 'Такой файл уже есть' };
  fs.renameSync(file, target);
  if (fs.existsSync(testsFile(file))) fs.renameSync(testsFile(file), testsFile(target));
  return { path: target };
});
ipcMain.handle('fs:delete', async (_e, file) => {
  await shell.trashItem(file);
  return true;
});
ipcMain.handle('fs:reveal', (_e, file) => shell.showItemInFolder(file));

// Тесты хранятся внутри приложения (папка data/tests), по одному файлу на решение
const TESTS = path.join(DATA, 'tests');
fs.mkdirSync(TESTS, { recursive: true });
const testsFile = (file) => path.join(TESTS, crypto.createHash('sha1').update(path.resolve(file).toLowerCase()).digest('hex') + '.json');
ipcMain.handle('tests:load', (_e, file) => {
  try {
    return JSON.parse(fs.readFileSync(testsFile(file), 'utf8')).tests || [];
  } catch {
    return [];
  }
});
ipcMain.handle('tests:save', (_e, file, tests) => {
  fs.writeFileSync(testsFile(file), JSON.stringify({ file, tests }), 'utf8');
});

// Импорт набора тестов из папки: 01.in/01.out, 01/01.a, input1.txt/output1.txt, *.in/*.ans
ipcMain.handle('tests:import', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'], title: 'Папка с тестами' });
  if (r.canceled) return null;
  const dir = r.filePaths[0];
  const names = new Set(fs.readdirSync(dir));
  const read = (n) => fs.readFileSync(path.join(dir, n), 'utf8');
  const found = [];
  for (const n of names) {
    let ans = null;
    let label = n;
    let m;
    if ((m = n.match(/^(.*)\.(in|inp|input)$/i))) {
      label = m[1];
      ans = ['out', 'ans', 'a', 'res', 'output', 'sol'].map((e) => `${m[1]}.${e}`).find((x) => names.has(x));
    } else if ((m = n.match(/^input(\d+)\.txt$/i))) {
      label = m[1];
      ans = [`output${m[1]}.txt`].find((x) => names.has(x));
    } else if (/^\d+$/.test(n)) {
      ans = [`${n}.a`, `${n}.ans`, `${n}.out`].find((x) => names.has(x));
    } else {
      continue;
    }
    found.push({ label, input: read(n), expected: ans ? read(ans) : '' });
  }
  found.sort((a, b) => natural(a.label, b.label));
  return { dir, tests: found.map(({ input, expected }) => ({ input, expected })) };
});

// ---------- компилятор ----------
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 1 << 24, ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr, error: err });
    });
  });
}

let compiler = null; // { path, version } — всегда собственный GCC из папки инструментов
let sdk = null;      // macOS SDK из Command Line Tools — единственное, что на macOS берётся у системы

async function macSdk() {
  const x = await run('/usr/bin/xcode-select', ['-p']);
  if (x.code !== 0) return null;
  const clt = '/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk';
  if (fs.existsSync(clt)) return clt;
  const s = await run('/usr/bin/xcrun', ['--show-sdk-path']);
  return s.code === 0 ? s.stdout.trim() : null;
}

async function detectCompiler() {
  compiler = null;
  const gxx = toolchain.paths(TOOLCHAIN).gxx;
  if (!fs.existsSync(gxx)) return null;
  if (IS_MAC && !(sdk = await macSdk())) return null;
  const v = await run(gxx, ['--version']);
  if (v.code !== 0) return null;
  compiler = { path: gxx, version: v.stdout.split('\n')[0].trim() };
  return compiler;
}

// Флаги, которые нужны самой платформе (не ученику): SDK на macOS, статическая стандартная библиотека
const platformFlags = () => (IS_MAC ? [`--sysroot=${sdk}`] : []);

ipcMain.handle('compiler:info', async () => {
  const c = await detectCompiler();
  if (c && lspStatus === 'off') startLsp();
  if (c) return c;
  const installed = fs.existsSync(toolchain.paths(TOOLCHAIN).gxx);
  return { missing: true, mac: IS_MAC, win: IS_WIN, needSdk: IS_MAC && installed, installed, sizeMb: toolchain.sizes().base };
});

// Установка GCC и clangd в папку данных приложения
ipcMain.handle('compiler:install', async (e, fromFile) => {
  let archive = null;
  if (fromFile) {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openFile'], title: IS_WIN ? 'Архив w64devkit-x64-….7z.exe' : 'Пакет gfortran-…-Tahoe.dmg',
      filters: [{ name: 'GCC', extensions: IS_WIN ? ['exe', '7z'] : ['dmg'] }],
    });
    if (r.canceled) return { canceled: true };
    archive = r.filePaths[0];
  }
  try {
    const onProgress = (p) => safeSend(e.sender, 'compiler:progress', p);
    const tp = toolchain.paths(TOOLCHAIN);
    if (!fs.existsSync(tp.gxx) || archive) await toolchain.installGcc(TOOLCHAIN, SEVEN_ZIP, onProgress, archive);
    const c = await detectCompiler();
    if (!c) return { error: IS_MAC && !sdk ? 'нужны Command Line Tools от Apple' : 'компилятор установлен, но не запускается' };
    try {
      if (!fs.existsSync(tp.clangd)) await toolchain.installClangd(TOOLCHAIN, SEVEN_ZIP, onProgress);
    } catch {}  // без подсказок по коду редактор всё равно работает
    startLsp();
    return c;
  } catch (err) {
    return { error: String(err.message || err) };
  }
});
ipcMain.handle('compiler:installMacTools', () => {
  spawn('/usr/bin/xcode-select', ['--install'], { detached: true, stdio: 'ignore' }).unref();
  return true;
});

const exeName = IS_WIN ? 'main.exe' : 'main';
const rtObjects = new Map(); // компилятор → объектный файл с замером памяти

// Отпечаток исходника замера памяти: меняется код замера — пересобираются и он, и решения
const RUNTIME_HASH = crypto.createHash('sha1').update(fs.readFileSync(path.join(RUNTIME, 'kompot_rt.cpp'))).digest('hex').slice(0, 10);

async function runtimeObject() {
  const key = compiler.path;
  if (rtObjects.has(key) && fs.existsSync(rtObjects.get(key))) return rtObjects.get(key);
  const hash = crypto.createHash('sha1').update(key + RUNTIME_HASH).digest('hex').slice(0, 10);
  const obj = path.join(BUILD, `kompot_rt_${hash}.o`);
  if (!fs.existsSync(obj)) {
    const r = await run(compiler.path, [...platformFlags(), '-O2', '-c', path.join(RUNTIME, 'kompot_rt.cpp'), '-o', obj], { cwd: BUILD });
    if (r.code !== 0) return null;
  }
  rtObjects.set(key, obj);
  return obj;
}

// Сообщения компилятора → пометки в редакторе
function parseDiagnostics(log) {
  const out = [];
  const re = /^(?:[^\n]*?)main\.cpp:(\d+):(\d+):\s+(fatal error|error|warning|note):\s+(.*)$/gm;
  let m;
  while ((m = re.exec(log))) {
    out.push({ line: +m[1], col: +m[2], severity: m[3].includes('error') ? 'error' : m[3], message: m[4] });
  }
  return out;
}

let lastBuild = null; // { key, exe }

async function buildSource(source, debug = false) {
  if (compiler && !fs.existsSync(compiler.path)) compiler = null;  // папку с инструментами удалили или переместили
  if (!compiler && !(await detectCompiler())) return { ok: false, log: 'Компилятор не найден. Установите его заново: Настройки → Компилятор.', diagnostics: [] };
  let flags = settings.flags.split(/\s+/).filter(Boolean);
  if (debug) flags = [...flags.filter((f) => !/^-O/.test(f) && f !== '-g'), '-O0', '-g'];
  const key = crypto.createHash('sha1').update([compiler.path, flags.join(' '), settings.stackMb, RUNTIME_HASH, source].join('\0')).digest('hex');
  const dir = path.join(BUILD, key.slice(0, 12));
  const exe = path.join(dir, exeName);
  if (fs.existsSync(exe)) {
    if (!debug) lastBuild = { key, exe, dir };
    return { ok: true, cached: true, log: '', diagnostics: [], exe, dir };
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'main.cpp'), source, 'utf8');
  const rt = await runtimeObject();
  const args = [...flags, 'main.cpp'];
  if (rt) args.push(rt);
  args.push('-o', exeName);
  args.unshift(...platformFlags());
  const stack = Math.max(8, settings.stackMb) * 1024 * 1024;
  if (IS_WIN) args.push('-static', `-Wl,--stack=${stack}`, '-lpsapi');
  else if (IS_MAC) args.push('-static-libstdc++', '-static-libgcc', `-Wl,-stack_size,0x${Math.min(stack, 512 * 1024 * 1024).toString(16)}`);
  const started = Date.now();
  const r = await run(compiler.path, args, { cwd: dir, env: { ...process.env, PATH: path.dirname(compiler.path) + path.delimiter + process.env.PATH } });
  const log = (r.stderr || '') + (r.stdout || '') || (r.error ? `Не удалось запустить компилятор: ${r.error.message}` : '');
  if (r.code !== 0 || !fs.existsSync(exe)) {
    fs.rmSync(dir, { recursive: true, force: true });
    return { ok: false, log, diagnostics: parseDiagnostics(log) };
  }
  if (!debug) lastBuild = { key, exe, dir };
  return { ok: true, log, diagnostics: parseDiagnostics(log), seconds: (Date.now() - started) / 1000, exe, dir };
}

// Первый запуск свежей программы заметно медленнее: macOS и антивирус Windows проверяют новый файл.
// Поэтому сразу после сборки запускаем её один раз с пустым вводом, вне замеров — и тесты, и консоль стартуют уже без задержки.
const warmed = new Set();
ipcMain.handle('build', async (_e, source) => {
  const r = await buildSource(source);
  if (r.ok && lastBuild && !warmed.has(lastBuild.key)) {
    await execute('', { timeLimit: 1, hardLimit: 1.5 });
    warmed.add(lastBuild.key);
  }
  delete r.exe;
  delete r.dir;
  return r;
});

// ---------- подсказки по коду (clangd) ----------
let lspStatus = 'off';
let clangdFound = null;
const lsp = new Lsp({
  dir: path.join(DATA, 'lsp'),
  onDiagnostics: (d) => toWin('lsp:diagnostics', d),
  onStatus: (st) => {
    lspStatus = st;
    toWin('lsp:status', { status: st, path: clangdFound });
  },
});

async function findClangd() {
  const p = toolchain.paths(TOOLCHAIN).clangd;
  clangdFound = fs.existsSync(p) ? p : null;
  return clangdFound;
}

async function startLsp() {
  if (!compiler || !(await findClangd())) {
    lsp.stop();
    lspStatus = 'missing';
    toWin('lsp:status', { status: 'missing', canInstall: !!compiler });
    return;
  }
  const flags = settings.flags.split(/\s+/).filter(Boolean);
  lsp.start(clangdFound, compiler, [...flags, ...platformFlags()]);
}

ipcMain.on('lsp:sync', (_e, text) => lsp.sync(text));
ipcMain.handle('lsp:status', () => ({ status: lspStatus, path: clangdFound, canInstall: !!compiler }));
ipcMain.handle('lsp:completion', (_e, position, context) => lsp.call('textDocument/completion', position, { context }));
ipcMain.handle('lsp:hover', (_e, position) => lsp.call('textDocument/hover', position));
ipcMain.handle('lsp:signature', (_e, position, context) => lsp.call('textDocument/signatureHelp', position, { context }));
ipcMain.handle('lsp:semantic', async () => {
  const r = await lsp.semanticTokens();
  return r && lsp.legend ? { legend: lsp.legend, data: r.data } : null;
});
ipcMain.handle('lsp:install', async (e) => {
  try {
    await toolchain.installClangd(TOOLCHAIN, SEVEN_ZIP, (p) => safeSend(e.sender, 'compiler:progress', p));
    await startLsp();
    return { ok: true };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});
app.on('before-quit', () => lsp.stop());

// ---------- системное контекстное меню редактора ----------
// Вырезать/копировать/вставить — роли Electron (их ловит textarea Monaco), остальное — команды редактора по событию menu:action
ipcMain.on('menu:editor', (e, { hasSelection, debugging }) => {
  const act = (id) => () => safeSend(e.sender, 'menu:action', id);
  Menu.buildFromTemplate([
    { label: 'Вырезать', role: 'cut', enabled: hasSelection },
    { label: 'Копировать', role: 'copy', enabled: hasSelection },
    { label: 'Вставить', role: 'paste' },
    { type: 'separator' },
    { label: 'Выделить всё', accelerator: 'CmdOrCtrl+A', click: act('selectAll') },
    { label: 'Изменить все вхождения', click: act('changeAll') },
    { label: 'Закомментировать строки', accelerator: 'CmdOrCtrl+/', click: act('comment') },
    { type: 'separator' },
    { label: 'Точка останова', accelerator: 'F9', click: act('breakpoint') },
    { label: debugging ? 'Выполнить до этой строки' : 'Отладка до этой строки', accelerator: 'F4', click: act('cursor') },
  ]).popup({ window: BrowserWindow.fromWebContents(e.sender) });
});

// ---------- отладчик (lldb-dap) ----------
let session = null;  // { threadId, dir, source }
const dap = new Dap({
  onEvent: async (m) => {
    const send = (type, body) => toWin('dbg:event', { type, ...body });
    if (m.event === 'output') {
      const cat = m.body.category;
      if (cat === 'stdout' || cat === 'stderr') send('output', { stream: cat, text: m.body.output });
    } else if (m.event === 'stopped') {
      if (!session) return;
      session.threadId = m.body.threadId || session.threadId;
      // временные остановки (до курсора, начало main) срабатывают один раз
      const temp = session.temp;
      const atMain = session.atMain;
      if (temp != null || atMain) {
        session.temp = null;
        if (session.atMain) {
          session.atMain = false;
          await dap.request('setFunctionBreakpoints', { breakpoints: [] });
        }
        await setLines(session.lines);
      }
      const st = await stoppedState(m.body);
      if (atMain) st.reason = 'main';
      else if (temp != null && st.line === temp && !session.lines.includes(temp)) st.reason = 'cursor';
      send('stopped', st);
    } else if (m.event === 'exited') {
      send('exited', { code: m.body.exitCode });
    } else if (m.event === 'terminated' || m.event === 'adapterExit') {
      if (session) {
        endSession();
        send('terminated', {});
      }
    }
  },
});

async function findDebugger() {
  if (IS_WIN) {
    const p = toolchain.paths(TOOLCHAIN).lldbDap;
    return fs.existsSync(p) ? p : null;
  }
  // macOS разрешает отлаживать только через debugserver, подписанный Apple, — он есть в Command Line Tools
  if (!(await macSdk())) return null;
  const f = await run('/usr/bin/xcrun', ['--find', 'lldb-dap']);
  return f.code === 0 ? f.stdout.trim() : null;
}

// Точки останова пользователя плюс временная «до курсора»
async function setLines(lines) {
  const all = [...new Set(session.temp != null ? [...lines, session.temp] : lines)];
  const r = await dap.request('setBreakpoints', { source: { path: session.source }, breakpoints: all.map((line) => ({ line })) });
  return r?.body?.breakpoints?.map((x) => ({ line: x.line, verified: x.verified })) || null;
}

const userFrame = (f) => !!(f.source && f.source.path && session && path.resolve(f.source.path) === path.resolve(session.source));

async function frameVariables(frameId) {
  const scopes = await dap.request('scopes', { frameId });
  const list = scopes?.body?.scopes || [];
  const local = list.find((x) => /local/i.test(x.name)) || list[0];
  if (!local) return [];
  const v = await dap.request('variables', { variablesReference: local.variablesReference });
  return (v?.body?.variables || []).map(slimVar);
}
const slimVar = (v) => ({ name: v.name, value: v.value, type: v.type || '', ref: v.variablesReference || 0 });

async function stoppedState(body) {
  const st = await dap.request('stackTrace', { threadId: session.threadId, levels: 40 });
  const frames = (st?.body?.stackFrames || []).map((f) => ({ id: f.id, name: f.name, line: f.line, user: userFrame(f) }));
  const top = frames.find((f) => f.user) || frames[0];
  let message = '';
  if (body.reason === 'exception' || body.reason === 'signal') {
    message = body.text || body.description || 'программа упала';
  }
  return { reason: body.reason, message, frames, frameId: top?.id, line: top?.user ? top.line : null, variables: top ? await frameVariables(top.id) : [] };
}

ipcMain.handle('dbg:info', async () => ({ path: await findDebugger(), canInstall: IS_WIN, sizeMb: toolchain.sizes().debugger }));

ipcMain.handle('dbg:install', async (e) => {
  try {
    await toolchain.installDebugger(TOOLCHAIN, SEVEN_ZIP, (p) => safeSend(e.sender, 'compiler:progress', p));
    return { ok: true };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

// opts.stopAtMain — остановиться в начале main (F7/F8 без точек останова); opts.runTo — выполнить до строки (F4)
// Завершить сеанс отладки: закрыть ввод программы, убрать её процесс (Windows) и адаптер
function endSession() {
  const s = session;
  session = null;
  dap.stop();
  if (!s) return;
  try {
    s.stdin?.destroy();
  } catch {}
  if (s.child && s.child.exitCode == null) s.child.kill();
  if (s.fifo) fs.rmSync(s.fifo, { force: true });
}

// Ввод программы при отладке.
// Тест: ввод теста целиком, затем конец ввода. Консоль (opts.interactive): строки, которые ученик набирает в панели «Отладка».
// Windows: программу запускаем сами — без консольного окна, со своими каналами ввода-вывода — и lldb к ней подключается
//   (lldb на Windows открывает программе отдельное пустое окно консоли и не умеет передавать ей ввод с клавиатуры).
// macOS: lldb запускает программу сам; ввод — из файла теста или из именованного канала (FIFO) для консоли.
ipcMain.handle('dbg:start', async (e, source, lines, input, opts = {}) => {
  const adapter = await findDebugger();
  if (!adapter) return { error: 'missing' };
  const b = await buildSource(source, true);
  if (!b.ok) return { error: 'build', log: b.log, diagnostics: b.diagnostics };
  const fwd = (p) => p.replace(/\\/g, '/');
  const interactive = !!opts.interactive;
  session = { threadId: 1, dir: b.dir, source: path.join(b.dir, 'main.cpp'), lines: [...lines], temp: opts.runTo ?? null, atMain: !!opts.stopAtMain };
  const env = { ...process.env, PATH: [path.dirname(adapter), path.dirname(compiler.path), process.env.PATH].join(path.delimiter) };
  dap.start(adapter, env);
  const init = await dap.request('initialize', { clientID: 'kompot', adapterID: 'lldb-dap', linesStartAt1: true, columnsStartAt1: true, pathFormat: 'path', supportsVariableType: true });
  if (!init?.success) {
    endSession();
    return { error: 'adapter' };
  }
  const initialized = dap.waitEvent('initialized');
  let launched;
  if (IS_WIN) {
    const child = spawn(b.exe, [], {
      cwd: b.dir, windowsHide: true,
      env: { ...process.env, KOMPOT_WAIT_DEBUGGER: '1', KOMPOT_UNBUFFERED: '1' },
    });
    session.child = child;
    session.stdin = child.stdin;
    child.stdin.on('error', () => {});
    const out = (stream) => (d) => safeSend(e.sender, 'dbg:event', { type: 'output', stream, text: d.toString('utf8') });
    child.stdout.on('data', out('stdout'));
    child.stderr.on('data', out('stderr'));
    if (!interactive) child.stdin.end(input || '');
    launched = dap.request('attach', { program: b.exe, pid: child.pid }, 30000);
  } else {
    let inPath = path.join(b.dir, 'input.txt');
    if (interactive) {
      inPath = path.join(b.dir, 'stdin.fifo');
      fs.rmSync(inPath, { force: true });
      execFileSync('/usr/bin/mkfifo', [inPath]);
      // O_RDWR не блокируется, пока программа не открыла канал (в отличие от O_WRONLY)
      session.fifo = inPath;
      session.stdin = fs.createWriteStream(null, { fd: fs.openSync(inPath, fs.constants.O_RDWR) });
      session.stdin.on('error', () => {});
    } else {
      fs.writeFileSync(inPath, input || '', 'utf8');
    }
    launched = dap.request('launch', {
      program: b.exe, cwd: b.dir, stopOnEntry: false, env: ['KOMPOT_UNBUFFERED=1'],
      preRunCommands: [`settings set target.input-path "${fwd(inPath)}"`],
    }, 30000);
  }
  await initialized;
  await setLines(lines);
  if (session.atMain) await dap.request('setFunctionBreakpoints', { breakpoints: [{ name: 'main' }] });
  await dap.request('setExceptionBreakpoints', { filters: [] });
  await dap.request('configurationDone');
  const r = await launched;
  if (!r?.success) {
    endSession();
    return { error: 'launch', message: r?.message || '' };
  }
  return { ok: true };
});

ipcMain.on('dbg:input', (_e, text) => session?.stdin?.write(text));
ipcMain.on('dbg:eof', () => session?.stdin?.end());

ipcMain.handle('dbg:breakpoints', async (_e, lines) => {
  if (!session) return null;
  session.lines = [...lines];
  return setLines(lines);
});

ipcMain.handle('dbg:runTo', async (_e, line) => {
  if (!session) return;
  session.temp = line;
  await setLines(session.lines);
  await dap.request('continue', { threadId: session.threadId });
});

ipcMain.handle('dbg:step', async (_e, cmd) => {
  if (!session) return;
  const map = { continue: 'continue', over: 'next', into: 'stepIn', out: 'stepOut', pause: 'pause' };
  await dap.request(map[cmd], { threadId: session.threadId });
});

ipcMain.handle('dbg:variables', async (_e, ref) => {
  const v = await dap.request('variables', { variablesReference: ref });
  return (v?.body?.variables || []).map(slimVar);
});
ipcMain.handle('dbg:frame', async (_e, frameId) => frameVariables(frameId));

ipcMain.handle('dbg:stop', async () => {
  if (!session) return;
  await dap.request('disconnect', { terminateDebuggee: true }, 3000);
  endSession();
  toWin('dbg:event', { type: 'terminated' });
});
app.on('before-quit', () => dap.stop());

// ---------- запуск ----------
const OUTPUT_LIMIT = 8 << 20;
let current = null; // текущий процесс решения

function execute(input, { timeLimit, hardLimit, interactive = false, onOutput } = {}) {
  return new Promise((resolve) => {
    const memFile = path.join(lastBuild.dir, `mem-${crypto.randomBytes(4).toString('hex')}.txt`);
    const start = process.hrtime.bigint();
    const child = spawn(lastBuild.exe, [], {
      cwd: lastBuild.dir, windowsHide: true, env: { ...process.env, KOMPOT_MEM_FILE: memFile },
    });
    current = child;
    const chunks = [];
    let size = 0;
    let stderr = '';
    let reason = null;
    const timer = hardLimit ? setTimeout(() => { reason = 'TLE'; child.kill('SIGKILL'); }, hardLimit * 1000) : null;
    child.stdout.on('data', (d) => {
      if (onOutput) onOutput('out', d.toString('utf8'));
      if (size < OUTPUT_LIMIT) {
        chunks.push(d);
        size += d.length;
      } else if (!reason) {
        reason = 'OLE';
        child.kill('SIGKILL');
      }
    });
    child.stderr.on('data', (d) => {
      if (onOutput) onOutput('err', d.toString('utf8'));
      if (stderr.length < 65536) stderr += d.toString('utf8');
    });
    child.stdin.on('error', () => {});
    child.on('error', (err) => {
      reason = reason || 'RE';
      stderr += String(err);
    });
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      if (current === child) current = null;
      const time = Number(process.hrtime.bigint() - start) / 1e9;
      let memory = null;
      try {
        memory = parseInt(fs.readFileSync(memFile, 'utf8'), 10) / 1024;
        fs.rmSync(memFile, { force: true });
      } catch {}
      resolve({ stdout: Buffer.concat(chunks).toString('utf8'), stderr, time, memory, code, signal, reason, timeLimit });
    });
    if (!interactive) child.stdin.end(input);
  });
}

const tokens = (s) => s.split(/\s+/).filter(Boolean);
function compare(expected, actual) {
  const a = tokens(expected);
  const b = tokens(actual);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      if (i >= a.length) return `лишний вывод начиная с «${b[i]}»`;
      if (i >= b.length) return `вывод закончился, ожидалось ещё «${a[i]}»`;
      return `${i + 1}-й элемент: ожидалось «${a[i]}», получено «${b[i]}»`;
    }
  }
  return null;
}

function verdictOf(res, expected) {
  if (res.reason === 'TLE' || res.time > res.timeLimit) return { verdict: 'TLE' };
  if (res.reason === 'OLE') return { verdict: 'OLE', note: 'слишком большой вывод' };
  if (res.code !== 0 || res.signal) {
    const code = res.code ?? res.signal;
    const hex = typeof code === 'number' && code < 0 ? ` (0x${(code >>> 0).toString(16).toUpperCase()})` : '';
    return { verdict: 'RE', note: `код выхода ${code}${hex}` };
  }
  if (res.memory != null && res.memory > settings.memoryLimit) return { verdict: 'MLE' };
  if (!expected || !expected.trim()) return { verdict: 'DONE' };
  const err = compare(expected, res.stdout);
  return err ? { verdict: 'WA', note: err } : { verdict: 'OK' };
}

ipcMain.handle('run:tests', async (e, tests) => {
  if (!lastBuild) return [];
  const tl = settings.timeLimit;
  const results = [];
  for (let i = 0; i < tests.length; i++) {
    safeSend(e.sender, 'run:progress', { index: i, running: true });
    const res = await execute(tests[i].input, { timeLimit: tl, hardLimit: tl * 2 + 0.5 });
    const v = verdictOf(res, tests[i].expected);
    const r = { index: i, ...v, time: res.time, memory: res.memory, stdout: res.stdout, stderr: res.stderr };
    results.push(r);
    safeSend(e.sender, 'run:progress', r);
    if (stopRequested) break;
  }
  stopRequested = false;
  return results;
});

// Интерактивный режим: вывод программы идёт в консоль по мере появления
ipcMain.handle('run:interactive', async (e) => {
  if (!lastBuild) return null;
  const res = await execute('', {
    timeLimit: Infinity, interactive: true,
    onOutput: (stream, text) => safeSend(e.sender, 'console:data', { stream, text }),
  });
  return { time: res.time, memory: res.memory, code: res.code, signal: res.signal };
});
ipcMain.on('console:input', (_e, text) => current?.stdin.write(text));
ipcMain.on('console:eof', () => current?.stdin.end());

let stopRequested = false;
ipcMain.handle('run:stop', () => {
  stopRequested = true;
  if (current) current.kill('SIGKILL');
});

ipcMain.handle('app:paths', () => ({ data: DATA, build: BUILD }));
