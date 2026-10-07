// Инструменты Kompot — компилятор GCC, подсказки clangd, отладчик — скачиваются в папку данных приложения.
// Системные компиляторы не используются. Удалили папку приложения — удалили и инструменты.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const IS_WIN = process.platform === 'win32';

const W64DEVKIT = '2.10.0';
const CLANGD = '23.1.0';
const LLVM_MINGW = '20260922';
const MAC_GCC = '16.2-tahoe';

const SOURCES = {
  win: {
    gcc: { mb: 64, url: `https://github.com/skeeto/w64devkit/releases/download/v${W64DEVKIT}/w64devkit-x64-${W64DEVKIT}.7z.exe` },
    clangd: { mb: 29, url: `https://github.com/clangd/clangd/releases/download/${CLANGD}/clangd-windows-${CLANGD}.zip` },
    debugger: { mb: 182, url: `https://github.com/mstorsjo/llvm-mingw/releases/download/${LLVM_MINGW}/llvm-mingw-${LLVM_MINGW}-ucrt-x86_64.zip` },
  },
  mac: {
    gcc: { mb: 153, url: `https://github.com/fxcoudert/gfortran-for-macOS/releases/download/${MAC_GCC}/gfortran-16.2-Tahoe.dmg` },
    clangd: { mb: 95, url: `https://github.com/clangd/clangd/releases/download/${CLANGD}/clangd-mac-${CLANGD}.zip` },
  },
};
const plat = IS_WIN ? 'win' : 'mac';

const paths = (root) => ({
  gxx: IS_WIN ? path.join(root, 'w64devkit', 'bin', 'g++.exe') : path.join(root, 'gcc', 'bin', 'g++'),
  clangd: path.join(root, 'clangd', 'bin', IS_WIN ? 'clangd.exe' : 'clangd'),
  lldbDap: IS_WIN ? path.join(root, 'llvm-mingw', 'bin', 'lldb-dap.exe') : null,
});

// ---------- общие помощники ----------
function exec(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 1 << 26, ...opts }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

async function download(url, target, onProgress, label) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`сервер ответил ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const out = fs.createWriteStream(target);
  let done = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done: end, value } = await reader.read();
    if (end) break;
    done += value.length;
    if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
    onProgress({ stage: 'download', what: label, done, total });
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
}

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });

function moveInto(root, from, name) {
  rm(path.join(root, name));
  fs.renameSync(from, path.join(root, name));
}

// ---------- установка компонентов ----------
// archive — уже скачанный файл (для школ без интернета) или null — скачать
async function installGcc(root, sevenZip, onProgress, archive = null) {
  const work = path.join(root, 'staging-gcc');
  rm(work);
  fs.mkdirSync(work, { recursive: true });
  const file = archive || path.join(work, IS_WIN ? 'gcc.7z.exe' : 'gcc.dmg');
  if (!archive) await download(SOURCES[plat].gcc.url, file, onProgress, 'компилятор');
  onProgress({ stage: 'extract', what: 'компилятор' });
  if (IS_WIN) {
    await exec(sevenZip, ['x', file, `-o${work}`, '-y']);
    const dir = path.join(work, 'w64devkit');
    // Для компиляции C++ не нужны: компилятор C, 32-битные библиотеки, документация, CMake, Fortran, отладчик
    for (const rel of ['lib32', 'share', 'src', 'Dockerfile', 'bin/cmake.exe', 'bin/ccmake.exe', 'bin/cpack.exe', 'bin/ctest.exe',
      'bin/cmcldeps.exe', 'bin/dcmake.exe', 'bin/gdb.exe', 'bin/gdbserver.exe', 'bin/makensis.exe', 'bin/ninja.exe',
      'bin/ccache.exe', 'bin/ccache-g++.exe', 'bin/ccache-gcc.exe', 'bin/ctags.exe']) rm(path.join(dir, rel));
    for (const f of fs.readdirSync(path.join(dir, 'bin'))) if (/gfortran/.test(f)) rm(path.join(dir, 'bin', f));
    const libexec = path.join(dir, 'libexec', 'gcc', 'x86_64-w64-mingw32');
    for (const v of fs.readdirSync(libexec)) for (const f of ['f951.exe', 'cc1.exe']) rm(path.join(libexec, v, f));
    if (!fs.existsSync(path.join(dir, 'bin', 'g++.exe'))) throw new Error('в архиве нет g++');
    moveInto(root, dir, 'w64devkit');
  } else {
    // macOS: GCC из пакета gfortran-for-macOS; пакет не устанавливается в систему, а распаковывается к нам
    const mnt = path.join(work, 'mnt');
    await exec('/usr/bin/hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mnt, file]);
    try {
      const pkg = fs.readdirSync(mnt).find((f) => f.endsWith('.pkg'));
      await exec('/usr/sbin/pkgutil', ['--expand-full', path.join(mnt, pkg), path.join(work, 'pkg')]);
    } finally {
      await exec('/usr/bin/hdiutil', ['detach', mnt]).catch(() => {});
    }
    const dir = path.join(work, 'pkg', 'Payload', 'usr', 'local', 'gfortran');
    for (const f of fs.readdirSync(path.join(dir, 'bin'))) if (/fortran/.test(f)) rm(path.join(dir, 'bin', f));
    const libexec = path.join(dir, 'libexec', 'gcc');
    for (const triple of fs.readdirSync(libexec)) {
      for (const v of fs.readdirSync(path.join(libexec, triple))) rm(path.join(libexec, triple, v, 'f951'));
    }
    if (!fs.existsSync(path.join(dir, 'bin', 'g++'))) throw new Error('в пакете нет g++');
    moveInto(root, dir, 'gcc');
  }
  rm(work);
}

async function installZip(root, sevenZip, onProgress, url, label, inner, name, prune = []) {
  const work = path.join(root, `staging-${name}`);
  rm(work);
  fs.mkdirSync(work, { recursive: true });
  const file = path.join(work, 'archive.zip');
  await download(url, file, onProgress, label);
  onProgress({ stage: 'extract', what: label });
  await exec(sevenZip, ['x', file, `-o${work}`, '-y']);
  const dir = path.join(work, inner);
  if (!fs.existsSync(dir)) throw new Error(`в архиве нет ${inner}`);
  for (const rel of prune) rm(path.join(dir, rel));
  if (!IS_WIN) await exec('/bin/chmod', ['-R', 'u+x', path.join(dir, 'bin')]).catch(() => {});
  moveInto(root, dir, name);
  rm(work);
}

// В lib/clang/<версия>/lib лежат библиотеки для компиляции clang-ом (санитайзеры и т. п.) — подсказкам они не нужны
const installClangd = (root, sevenZip, onProgress) =>
  installZip(root, sevenZip, onProgress, SOURCES[plat].clangd.url, 'подсказки по коду', `clangd_${CLANGD}`, 'clangd',
    [`lib/clang/${CLANGD.split('.')[0]}/lib`]);

// Отладчик для Windows: lldb-dap из llvm-mingw; компилятор clang оттуда не нужен — компилирует GCC
const installDebugger = (root, sevenZip, onProgress) =>
  installZip(root, sevenZip, onProgress, SOURCES.win.debugger.url, 'отладчик', `llvm-mingw-${LLVM_MINGW}-ucrt-x86_64`, 'llvm-mingw',
    ['aarch64-w64-mingw32', 'armv7-w64-mingw32', 'i686-w64-mingw32', 'x86_64-w64-mingw32', 'include']);

// При первом запуске ставятся компилятор и подсказки. Отладчик Windows — по требованию.
function sizes() {
  const s = SOURCES[plat];
  return { base: s.gcc.mb + s.clangd.mb, debugger: s.debugger ? s.debugger.mb : 0 };
}

module.exports = { paths, sizes, installGcc, installClangd, installDebugger };
