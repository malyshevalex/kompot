// Отладочный сценарий: KOMPOT_DEMO=папка-для-снимков npm start
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function demo(win) {
  const dir = process.env.KOMPOT_DEMO;
  fs.mkdirSync(dir, { recursive: true });
  const js = (code) => win.webContents.executeJavaScript(code);
  // ждать условия в окне, а не фиксированное время: сборка и запуск отладчика бывают медленнее
  const until = async (expr, ms = 30000) => {
    for (const end = Date.now() + ms; Date.now() < end; await wait(200)) {
      if (await js(`!!(${expr})`)) return;
    }
  };
  const shot = async (name) => {
    win.webContents.invalidate();
    await wait(150);
    fs.writeFileSync(path.join(dir, `${name}.png`), (await win.capturePage(undefined, { stayHidden: false })).toPNG());
    const status = await js(`document.getElementById('sbRunText').textContent.trim()`);
    fs.appendFileSync(path.join(dir, 'status.txt'), `${name}: ${status}\n`);
  };
  win.setSize(1440, 900);
  win.setFocusable(false);  // не перехватывать клавиатуру, пока человек работает в других окнах
  await wait(2500);
  await shot('1-start');
  // подсказки clangd: автодополнение, сигнатура, ошибка при наборе
  await js(`(async () => {
    await setSettings({ theme: 'dark' }); applyTheme();
    state.editor.setValue(\`#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v = {3, 1, 2};
    sort(v.begin(), v.end());
    cout << undeclared << endl;
    v.
}
\`);
    state.editor.setPosition({ lineNumber: 8, column: 7 });
    state.editor.focus();
  })()`);
  await wait(9000);
  await shot('0-semantic');
  await js(`state.editor.trigger('demo', 'editor.action.triggerSuggest', {})`);
  await wait(2500);
  await shot('0-lsp-complete');
  await js(`(() => { state.editor.trigger('demo', 'hideSuggestWidget', {}); state.editor.setPosition({ lineNumber: 6, column: 10 }); state.editor.trigger('demo', 'editor.action.triggerParameterHints', {}); })()`);
  await wait(2000);
  await shot('0-lsp-signature');
  await js(`(async () => {
    state.editor.setValue(\`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long a, b;
    cin >> a >> b;
    vector<int> big(5'000'000, 1);  // чтобы было видно память
    cout << a + b + big[0] - 1 << '\\\\n';
    return 0;
}
\`);
    state.tests = [{ input: '2 3', expected: '5' }, { input: '10 -4', expected: '6' }, { input: '1 1', expected: '3' }, { input: '7 8', expected: '' }];
    renderTests();
    await setSettings({ theme: 'dark' }); applyTheme();
    await runTests([0, 1, 2, 3]);
  })()`);
  await wait(1500);
  await shot('2-dark-tests');
  await js(`(async () => { await setSettings({ theme: 'light' }); applyTheme(); })()`);
  await wait(600);
  await shot('3-light-tests');
  // отладка: точка останова на строке 10, остановка, шаг
  await js(`(async () => {
    await setSettings({ theme: 'dark' }); applyTheme();
    state.editor.setValue(\`#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (auto &x : a) {
        cin >> x;
    }
    string word = "клетка";
    long long sum = 0;
    for (int x : a) {
        sum += x;
    }
    cout << sum << " " << __gcd(12, 18) << endl;
    return 0;
}
\`);
    state.tests = [{ input: '4\\n5 7 9 11', expected: '32 6' }];
    renderTests();
    toggleBreakpoint(12);
    startDebug(0);
  })()`);
  await until('dbg.stopped');
  await wait(500);
  await shot('6-debug-stopped');
  const at = await js(`(() => { const b = document.querySelector('[data-dbg="over"]').getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })()`);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: at.x, y: at.y });
  await wait(400);
  await shot('6-debug-tooltip');
  win.webContents.sendInputEvent({ type: 'mouseMove', x: 700, y: 600 });
  await js(`debugCommand('over')`);
  await until('dbg.stopped');
  await js(`debugCommand('over')`);
  await until('dbg.stopped');
  await wait(300);
  await shot('7-debug-step');
  await js(`debugCommand('stop')`);
  await until('!dbg.active');
  // F8 без точек останова — остановка в начале main, F4 — до строки с курсором, Cmd/Ctrl+F2 — стоп
  await js(`(() => { dbg.bps.clear(); renderBreakpoints(); state.editor.setPosition({ lineNumber: 14, column: 9 }); state.editor.focus(); })()`);
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'F8' });
  await until('dbg.stopped');
  await wait(300);
  await shot('8-debug-main');
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'F4' });
  await wait(300);
  await until('dbg.stopped');
  await wait(300);
  await shot('9-debug-cursor');
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'F2', modifiers: [process.platform === 'darwin' ? 'meta' : 'control'] });
  await until('!dbg.active', 5000);
  await shot('9-debug-ctrl-f2');
  await js(`debugCommand('stop')`);
  await wait(1000);
  await js(`(async () => {
    state.editor.setValue(\`#include <bits/stdc++.h>
using namespace std;

int main() {
    string name;
    cout << "Как тебя зовут?" << endl;
    cin >> name;
    cout << "Привет, " << name << "!" << endl;
}
\`);
    await setMode('console');
    run();
  })()`);
  await wait(3500);
  await js(`document.getElementById('consoleInput').value = 'Маша'; document.getElementById('consoleForm').requestSubmit();`);
  await wait(1200);
  await shot('4-light-console');
  await js(`(async () => {
    await setSettings({ theme: 'dark' }); applyTheme(); await setMode('tests');
    state.editor.setValue('#include <bits/stdc++.h>\\nint main() {\\n    int x = ;\\n}\\n');
    run();
  })()`);
  await wait(3000);
  await shot('5-dark-error');
  await js(`(async () => { await setSettings({ theme: 'light' }); applyTheme(); document.getElementById('settingsBtn').click(); })()`);
  await wait(800);
  await shot('0-settings');
  await js(`(() => { document.querySelector('#settingsModal [data-close]').click(); toast('Решение сохранено'); })()`);
  await wait(400);
  await shot('0-toast');
  // меню открывается последним: пока оно открыто, окно не принимает остальные шаги сценария
  // подсказка при наведении и контекстное меню в светлой теме
  await js(`(async () => {
    await setMode('tests');
    await setSettings({ theme: 'light' }); applyTheme();
    state.editor.setValue(\`#include <iostream>

int main() {
    int x = 10;
    for (int i = 0; i < x; ++i) {
        std::cout << i << std::endl;
    }
}
\`);
    state.editor.setPosition({ lineNumber: 6, column: 16 });
    state.editor.focus();
  })()`);
  await wait(5000);
  await js(`state.editor.trigger('demo', 'editor.action.showHover', {})`);
  await wait(2500);
  await shot('0-hover');
  // автодополнение в светлой теме: выбранная строка должна читаться
  await js(`(() => { state.editor.setValue('#include <iostream>\\n\\nint solve(int n) {\\n    return n * 2;\\n}\\n\\nint main() {\\n    std::co\\n}\\n'); state.editor.setPosition({ lineNumber: 8, column: 12 }); state.editor.focus(); })()`);
  await wait(4000);
  await js(`state.editor.trigger('demo', 'editor.action.triggerSuggest', {})`);
  await wait(2500);
  await shot('0-suggest-light');
  await js(`state.editor.trigger('demo', 'hideSuggestWidget', {})`);
  // команда из системного меню: закомментировать строку 4
  await js(`state.editor.setPosition({ lineNumber: 4, column: 5 })`);
  win.webContents.send('menu:action', 'comment');
  await wait(300);
  fs.appendFileSync(path.join(dir, 'status.txt'), `menu-comment: ${await js(`state.editor.getModel().getLineContent(4)`)}\n`);
  await js(`(async () => { await setSettings({ theme: 'system' }); })()`);
  app.quit();
};
