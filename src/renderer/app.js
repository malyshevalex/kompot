/* global require, monaco */
'use strict';

const K = window.kompot;
const $ = (id) => document.getElementById(id);

const ICONS = {
  play: '<path d="M7 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L8.5 4.64A1 1 0 0 0 7 5.5z" fill="currentColor"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  open: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  save: '<path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z M8 4v5h7V4 M8 20v-6h8v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  gear: '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.7 7.7 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7M10.5 10.5v6M13.5 10.5v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  upload: '<path d="M12 15V4.5M7.5 9 12 4.5 16.5 9M5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  bug: '<path d="M9 7.5V6a3 3 0 0 1 6 0v1.5M7 10.5a5 5 0 0 1 10 0V15a5 5 0 0 1-10 0z M12 11v8M4 13h3M17 13h3M5 8.5l2.2 1.5M19 8.5l-2.2 1.5M5 18.5l2.4-1.6M19 18.5l-2.4-1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  stepOver: '<path d="M4.5 14a7.5 7.5 0 0 1 14.2-3.3M19.5 5.5v5.2h-5.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/>',
  stepInto: '<path d="M12 3.5v10M7.5 9.5 12 14l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="19.2" r="1.8" fill="currentColor"/>',
  toCursor: '<path d="M3.5 12h11M10.5 7.5 15 12l-4.5 4.5M19.5 5v14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  stepOut: '<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="19.2" r="1.8" fill="currentColor"/>',
  flask: '<path d="M9.5 3.5h5M10.5 3.5v6L5 18.5A1.5 1.5 0 0 0 6.3 20.7h11.4A1.5 1.5 0 0 0 19 18.5l-5.5-9v-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.5 15h9" stroke="currentColor" stroke-width="1.6"/>',
};
const ICONS_EXTRA = {
  chevron: '<path d="M9.5 6.5 15 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  arrowUp: '<path d="M12 19V5.5M6.5 11 12 5.5 17.5 11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  arrowDown: '<path d="M12 5v13.5M6.5 13l5.5 5.5 5.5-5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
};
Object.assign(ICONS, ICONS_EXTRA);
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const paintIcons = (root = document) => root.querySelectorAll('[data-ic]').forEach((el) => { el.innerHTML = icon(el.dataset.ic); });

const TEMPLATE = `#include <iostream>

using namespace std;

int main() {
    return 0;
}
`;

const state = {
  settings: null,
  file: null,          // путь к файлу или null для нового
  dirty: false,
  tests: [],
  mode: 'tests',
  running: false,
  compiler: null,
  editor: null,
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const basename = (p) => p.split(/[\\/]/).pop();
const dirname = (p) => p.replace(/[\\/][^\\/]*$/, '');
const fmtTime = (t) => (t == null ? '' : t < 10 ? `${t.toFixed(3)} с` : `${t.toFixed(1)} с`);
const fmtMem = (m) => (m == null ? '' : m < 10 ? `${m.toFixed(1)} МБ` : `${Math.round(m)} МБ`);

// ---------- мелочи ----------
let toastTimer;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// Все статусы — компиляция, тесты, консоль, отладка — пишутся в одно поле строки состояния внизу
function setStatus(text, kind = '') {
  const el = $('sbRun');
  el.hidden = !text;
  el.className = `sb sb-run${kind ? ` ${kind}` : ''}`;
  el.title = text;
  $('sbRunText').textContent = text;
}

function confirmBox(title, text, buttons) {
  return new Promise((resolve) => {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    const box = $('confirmButtons');
    box.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = 'btn';
      if (!b.primary) btn.dataset.variant = 'outline';
      btn.textContent = b.label;
      btn.onclick = () => {
        $('confirmModal').hidden = true;
        resolve(b.value);
      };
      box.appendChild(btn);
    }
    $('confirmModal').hidden = false;
    box.lastChild?.focus();
  });
}

// ---------- тема ----------
function applyTheme() {
  const s = state.settings;
  const dark = s.theme === 'dark' || (s.theme === 'system' && s.systemDark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', dark);
  $('themeBtn').querySelector('.ic').innerHTML = icon(dark ? 'sun' : 'moon');
  if (window.monaco) monaco.editor.setTheme(dark ? 'kompot-dark' : 'kompot-light');
  document.querySelectorAll('#themeSeg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.theme === s.theme)));
}

async function setSettings(patch) {
  Object.assign(state.settings, patch);
  await K.setSettings(patch);
}

// ---------- Monaco ----------
function defineThemes() {
  // Цвета кода в тон интерфейсу: нейтральный фон shadcn, функции — янтарные, типы — бирюзовые, ключевые слова — фиолетовые
  const rules = (c) => [
    { token: 'comment', foreground: c.comment, fontStyle: 'italic' },
    { token: 'keyword', foreground: c.keyword }, { token: 'keyword.directive', foreground: c.macro }, { token: 'modifier', foreground: c.keyword },
    { token: 'type', foreground: c.type }, { token: 'class', foreground: c.type }, { token: 'struct', foreground: c.type },
    { token: 'enum', foreground: c.type }, { token: 'interface', foreground: c.type }, { token: 'typeParameter', foreground: c.type },
    { token: 'concept', foreground: c.type }, { token: 'number', foreground: c.number }, { token: 'enumMember', foreground: c.number },
    { token: 'string', foreground: c.string }, { token: 'delimiter', foreground: c.punct }, { token: 'operator', foreground: c.punct },
    { token: 'identifier', foreground: c.text }, { token: 'variable', foreground: c.text },
    { token: 'function', foreground: c.func }, { token: 'method', foreground: c.func }, { token: 'parameter', foreground: c.param },
    { token: 'property', foreground: c.prop }, { token: 'namespace', foreground: c.ns }, { token: 'macro', foreground: c.macro },
  ];
  monaco.editor.defineTheme('kompot-dark', {
    base: 'vs-dark', inherit: true, semanticHighlighting: true,
    rules: rules({ comment: '71717A', keyword: 'C4B5FD', type: '5EEAD4', number: 'FDBA74', string: '86EFAC', punct: 'A1A1AA', text: 'F4F4F5',
      func: 'F2C879', param: 'F9A8D4', prop: '7DD3FC', ns: 'D4D4D8', macro: 'F0ABFC' }),
    colors: {
      'editor.background': '#0C0C0E', 'editor.foreground': '#F4F4F5', 'editor.lineHighlightBackground': '#16161A', 'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#3F3F46', 'editorLineNumber.activeForeground': '#A1A1AA', 'editorGutter.background': '#0C0C0E',
      'editor.selectionBackground': '#6366F152', 'editor.inactiveSelectionBackground': '#6366F12E', 'editorCursor.foreground': '#A5B4FC',
      'editorIndentGuide.background1': '#1C1C20', 'editorIndentGuide.activeBackground1': '#1C1C20', 'editorWhitespace.foreground': '#27272A',
      'editorBracketHighlight.foreground1': '#A5B4FC', 'editorBracketHighlight.foreground2': '#C4B5FD', 'editorBracketHighlight.foreground3': '#5EEAD4',
      'editorBracketMatch.background': '#818CF826', 'editorBracketMatch.border': '#00000000',
      'editor.wordHighlightBackground': '#818CF81F', 'editor.wordHighlightStrongBackground': '#818CF829', 'editor.wordHighlightBorder': '#00000000',
      'editorWidget.background': '#18181BD9', 'editorWidget.border': '#FFFFFF17', 'editorHoverWidget.background': '#18181BD9', 'editorHoverWidget.border': '#FFFFFF17',
      'editorSuggestWidget.background': '#18181BD9', 'editorSuggestWidget.border': '#FFFFFF17', 'editorSuggestWidget.selectedBackground': '#6366F14D',
      'editorSuggestWidget.selectedForeground': '#FFFFFF', 'editorSuggestWidget.selectedIconForeground': '#C7D2FE', 'editorSuggestWidget.foreground': '#E4E4E7',
      'editorSuggestWidget.highlightForeground': '#A5B4FC', 'editorSuggestWidget.focusHighlightForeground': '#C7D2FE',
      'list.activeSelectionForeground': '#FFFFFF', 'list.activeSelectionIconForeground': '#C7D2FE', 'list.focusForeground': '#FFFFFF',
      'list.hoverBackground': '#FFFFFF0D', 'widget.shadow': '#00000000', 'scrollbarSlider.background': '#FFFFFF14', 'scrollbarSlider.hoverBackground': '#FFFFFF24',
    },
  });
  monaco.editor.defineTheme('kompot-light', {
    base: 'vs', inherit: true, semanticHighlighting: true,
    rules: rules({ comment: 'A1A1AA', keyword: '7C3AED', type: '0F766E', number: '1D4ED8', string: '15803D', punct: '71717A', text: '18181B',
      func: 'C2410C', param: 'BE185D', prop: '0369A1', ns: '52525B', macro: 'A21CAF' }),
    colors: {
      'editor.background': '#FFFFFF', 'editor.foreground': '#18181B', 'editor.lineHighlightBackground': '#F7F7F8', 'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#D4D4D8', 'editorLineNumber.activeForeground': '#52525B',
      'editor.selectionBackground': '#6366F12E', 'editor.inactiveSelectionBackground': '#6366F11A', 'editorCursor.foreground': '#4F46E5',
      'editorIndentGuide.background1': '#F0F0F2', 'editorIndentGuide.activeBackground1': '#F0F0F2',
      'editorBracketHighlight.foreground1': '#4F46E5', 'editorBracketHighlight.foreground2': '#7C3AED', 'editorBracketHighlight.foreground3': '#0F766E',
      'editorBracketMatch.background': '#4F46E514', 'editorBracketMatch.border': '#00000000',
      'editor.wordHighlightBackground': '#4F46E512', 'editor.wordHighlightStrongBackground': '#4F46E51C', 'editor.wordHighlightBorder': '#00000000',
      'editorWidget.background': '#FFFFFFD9', 'editorWidget.border': '#E4E4E7', 'editorHoverWidget.background': '#FFFFFFD9', 'editorHoverWidget.border': '#E4E4E7',
      'editorSuggestWidget.background': '#FFFFFFD9', 'editorSuggestWidget.border': '#E4E4E7', 'editorSuggestWidget.selectedBackground': '#4F46E526',
      'editorSuggestWidget.selectedForeground': '#09090B', 'editorSuggestWidget.selectedIconForeground': '#4F46E5', 'editorSuggestWidget.foreground': '#18181B',
      'editorSuggestWidget.highlightForeground': '#4F46E5', 'editorSuggestWidget.focusHighlightForeground': '#4338CA',
      'list.activeSelectionForeground': '#09090B', 'list.activeSelectionIconForeground': '#4F46E5', 'list.focusForeground': '#09090B',
      'list.hoverBackground': '#09090B0A', 'widget.shadow': '#00000000', 'scrollbarSlider.background': '#09090B14', 'scrollbarSlider.hoverBackground': '#09090B24',
    },
  });
}

function registerSnippets() {
  const snippets = [
    ['fori', 'for (int i = 0; i < n; i++) {\n\t$0\n}', 'цикл по i'],
    ['forj', 'for (int j = 0; j < m; j++) {\n\t$0\n}', 'цикл по j'],
    ['vi', 'vector<int> ${1:a}(${2:n});', 'vector<int>'],
    ['vll', 'vector<long long> ${1:a}(${2:n});', 'vector<long long>'],
    ['readv', 'for (auto &${1:x} : ${2:a}) {\n\tcin >> ${1:x};\n}', 'прочитать вектор'],
    ['main', TEMPLATE.replace('    return 0;', '    $0\n    return 0;'), 'заготовка решения'],
  ];
  monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      if (/(\.|->|::|#\s*\w*|["<])\s*$/.test(before)) return { suggestions: [] };  // после v. / -> / :: / #include сниппеты не нужны
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      return {
        suggestions: snippets.map(([label, text, doc]) => ({
          label, kind: monaco.languages.CompletionItemKind.Snippet, insertText: text, documentation: doc,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range,
        })),
      };
    },
  });
}

function initMonaco() {
  return new Promise((resolve) => {
    window.MonacoEnvironment = {
      getWorkerUrl: () => new URL('../../node_modules/monaco-editor/min/vs/editor/editor.worker.js', location.href).href,
    };
    require.config({ paths: { vs: '../../node_modules/monaco-editor/min/vs' } });
    // Русские надписи Monaco (меню, поиск, подсказки): файл задаёт глобальные строки до загрузки редактора
    const ru = document.createElement('script');
    ru.src = '../../node_modules/monaco-editor/min/vs/nls/lang/ru.js';
    ru.onload = ru.onerror = () => require(['vs/editor/editor.main'], async () => {
      defineThemes();
      registerSnippets();
      registerLsp();
      await document.fonts.load('14px "JetBrains Mono"').catch(() => {});
      applyTheme();
      state.editor = monaco.editor.create($('editor'), {
        language: 'cpp', fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontWeight: '400', fontSize: state.settings.fontSize,
        fontLigatures: true, lineHeight: 1.6, minimap: { enabled: false }, scrollBeyondLastLine: false,
        smoothScrolling: false, cursorBlinking: 'solid', cursorSmoothCaretAnimation: 'off', renderLineHighlight: 'all',
        suggest: { preview: false, showWords: false, localityBonus: true }, quickSuggestionsDelay: 60, suggestFontSize: 13, suggestLineHeight: 22,
        wordBasedSuggestions: 'currentDocument', matchBrackets: 'always', 'semanticHighlighting.enabled': true, glyphMargin: true,
        padding: { top: 14, bottom: 14 }, bracketPairColorization: { enabled: true },
        lineNumbersMinChars: 3, lineDecorationsWidth: 14, folding: false, contextmenu: false,
        guides: { bracketPairs: false, bracketPairsHorizontal: false, highlightActiveBracketPair: false, indentation: true, highlightActiveIndentation: false },
        automaticLayout: true, tabSize: 4, insertSpaces: true, roundedSelection: true, stickyScroll: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }, overviewRulerBorder: false, fixedOverflowWidgets: true,
        overviewRulerLanes: 0, hideCursorInOverviewRuler: true,
      });
      const ed = state.editor;
      ed.onDidChangeModelContent(() => {
        markDirty();
        scheduleSync();
        if (find.open && !find.editing) {
          clearTimeout(find.timer);
          find.timer = setTimeout(() => runFind(true), 120);
        }
      });
      ed.onDidChangeCursorPosition((e) => { $('sbCursor').textContent = `Стр ${e.position.lineNumber}, стлб ${e.position.column}`; });
      const KM = monaco.KeyMod;
      const KC = monaco.KeyCode;
      ed.addCommand(KC.F5, () => (dbg.active ? debugCommand('continue') : run()));
      ed.addCommand(KM.Shift | KC.F5, () => debugCommand('stop'));
      ed.addCommand(KC.F6, () => startDebug());
      // Отладка: клавиши Visual Studio (F9, F10, F11) и CLion / Free Pascal (F7, F8, F4, Ctrl+F8, Ctrl+F2)
      dbg.ctx = ed.createContextKey('kompotDebug', false);
      ed.addCommand(KC.F9, () => toggleBreakpoint(ed.getPosition().lineNumber));
      ed.addCommand(KM.CtrlCmd | KC.F8, () => toggleBreakpoint(ed.getPosition().lineNumber));
      ed.addCommand(KC.F8, () => debugKey('over'));
      ed.addCommand(KC.F10, () => debugKey('over'));
      ed.addCommand(KC.F7, () => debugKey('into'));
      ed.addCommand(KC.F11, () => debugKey('into'));
      ed.addCommand(KM.Shift | KC.F8, () => debugCommand('out'));
      ed.addCommand(KM.Shift | KC.F11, () => debugCommand('out'));
      ed.addCommand(KC.F4, () => debugKey('cursor'));
      ed.addCommand(KM.CtrlCmd | KC.F2, () => debugCommand('stop'), 'kompotDebug');
      bindBreakpointGutter();
      ed.onContextMenu(() => K.editorMenu({ hasSelection: !ed.getSelection().isEmpty(), debugging: dbg.active }));
      // Свой поиск и замена вместо панели Monaco
      find.ctx = ed.createContextKey('kompotFindOpen', false);
      ed.addCommand(KM.CtrlCmd | KC.KeyF, () => openFind(false));
      ed.addCommand(IS_MAC ? KM.CtrlCmd | KM.Alt | KC.KeyF : KM.CtrlCmd | KC.KeyH, () => openFind(true));
      ed.addCommand(KC.F3, () => (find.open ? findStep(1) : openFind(false)));
      ed.addCommand(KM.Shift | KC.F3, () => (find.open ? findStep(-1) : openFind(false)));
      if (IS_MAC) {
        ed.addCommand(KM.CtrlCmd | KC.KeyG, () => (find.open ? findStep(1) : openFind(false)));
        ed.addCommand(KM.CtrlCmd | KM.Shift | KC.KeyG, () => (find.open ? findStep(-1) : openFind(false)));
      }
      ed.addCommand(KC.Escape, () => closeFind(), 'kompotFindOpen && !suggestWidgetVisible && !parameterHintsVisible');
      ed.addCommand(KM.CtrlCmd | KC.KeyS, () => save());
      ed.addCommand(KM.CtrlCmd | KM.Shift | KC.KeyS, () => save(true));
      ed.addCommand(KM.CtrlCmd | KC.KeyO, openFile);
      ed.addCommand(KM.CtrlCmd | KC.KeyN, newFile);
      resolve();
    });
    document.head.appendChild(ru);
  });
}

// ---------- подсказки по коду (clangd через LSP) ----------
let syncTimer;
const lspPos = (pos) => ({ line: pos.lineNumber - 1, character: pos.column - 1 });
const lspRange = (r) => new monaco.Range(r.start.line + 1, r.start.character + 1, r.end.line + 1, r.end.character + 1);
const lspDoc = (d) => (!d ? undefined : typeof d === 'string' ? d : { value: d.value });
const LSP_KIND = [null, 'Text', 'Method', 'Function', 'Constructor', 'Field', 'Variable', 'Class', 'Interface', 'Module', 'Property',
  'Unit', 'Value', 'Enum', 'Keyword', 'Snippet', 'Color', 'File', 'Reference', 'Folder', 'EnumMember', 'Constant', 'Struct', 'Event',
  'Operator', 'TypeParameter'];

function syncNow() {
  clearTimeout(syncTimer);
  if (state.editor) K.lspSync(state.editor.getValue());
}
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 150);
}

function registerLsp() {
  monaco.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.', '>', ':', '<', '"', '/'],
    provideCompletionItems: async (model, position, ctx) => {
      if (state.lsp !== 'ready') return { suggestions: [] };
      syncNow();
      const res = await K.lspCompletion(lspPos(position), { triggerKind: ctx.triggerKind + 1, triggerCharacter: ctx.triggerCharacter });
      const items = Array.isArray(res) ? res : res?.items || [];
      const word = model.getWordUntilPosition(position);
      const fallback = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
      return {
        incomplete: !!res?.isIncomplete,
        suggestions: items.map((it) => {
          const te = it.textEdit;
          return {
            label: it.label.trim(),
            kind: monaco.languages.CompletionItemKind[LSP_KIND[it.kind]] ?? monaco.languages.CompletionItemKind.Text,
            detail: it.detail,
            documentation: lspDoc(it.documentation),
            insertText: te ? te.newText : it.insertText || it.label.trim(),
            insertTextRules: it.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            range: te ? lspRange(te.range || te.replace) : fallback,
            filterText: it.filterText,
            sortText: it.sortText,
          };
        }),
      };
    },
  });
  monaco.languages.registerHoverProvider('cpp', {
    provideHover: async (model, position) => {
      if (state.lsp !== 'ready') return null;
      syncNow();
      const r = await K.lspHover(lspPos(position));
      if (!r || !r.contents) return null;
      const list = Array.isArray(r.contents) ? r.contents : [r.contents];
      return { contents: list.map((c) => ({ value: typeof c === 'string' ? c : c.value })), range: r.range ? lspRange(r.range) : undefined };
    },
  });
  monaco.languages.registerSignatureHelpProvider('cpp', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [')'],
    provideSignatureHelp: async (model, position, token, ctx) => {
      if (state.lsp !== 'ready') return null;
      syncNow();
      const r = await K.lspSignature(lspPos(position), { triggerKind: ctx.triggerKind, triggerCharacter: ctx.triggerCharacter, isRetrigger: ctx.isRetrigger });
      if (!r || !r.signatures?.length) return null;
      return {
        value: {
          signatures: r.signatures.map((sig) => ({
            label: sig.label, documentation: lspDoc(sig.documentation),
            parameters: (sig.parameters || []).map((pr) => ({ label: pr.label, documentation: lspDoc(pr.documentation) })),
          })),
          activeSignature: r.activeSignature || 0,
          activeParameter: r.activeParameter || 0,
        },
        dispose() {},
      };
    },
  });
  K.on('lsp:diagnostics', (list) => {
    const sev = { 1: monaco.MarkerSeverity.Error, 2: monaco.MarkerSeverity.Warning, 3: monaco.MarkerSeverity.Info, 4: monaco.MarkerSeverity.Hint };
    monaco.editor.setModelMarkers(state.editor.getModel(), 'clangd', list.map((d) => ({
      ...lspRange(d.range), startLineNumber: d.range.start.line + 1, startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1, endColumn: d.range.end.character + 1,
      message: d.message, severity: sev[d.severity] || monaco.MarkerSeverity.Warning, source: 'clangd',
    })));
  });
  K.on('lsp:status', showLspStatus);
}

let semanticRegistered = false;
async function registerSemanticTokens() {
  if (semanticRegistered) return;
  syncNow();
  const first = await K.lspSemantic();
  if (!first || semanticRegistered) return;
  semanticRegistered = true;
  monaco.languages.registerDocumentSemanticTokensProvider('cpp', {
    getLegend: () => first.legend,
    provideDocumentSemanticTokens: async () => {
      if (state.lsp !== 'ready') return null;
      syncNow();
      const r = await K.lspSemantic();
      return r ? { data: new Uint32Array(r.data) } : null;
    },
    releaseDocumentSemanticTokens() {},
  });
}

function showLspStatus(st) {
  state.lsp = st.status;
  const text = { ready: 'подсказки', starting: 'подсказки запускаются…', missing: 'подсказки не установлены', off: 'подсказки выключены' }[st.status] || 'подсказки';
  $('lspDot').className = `dot ${st.status === 'ready' ? 'ready' : st.status === 'starting' ? 'starting' : 'missing'}`;
  $('lspText').textContent = text;
  $('lspFull').textContent = st.status === 'ready' || st.status === 'starting' ? `clangd\n${st.path || ''}` : 'clangd не найден';
  $('lspInstall').hidden = !(st.status === 'missing' && st.canInstall);
  state.editor?.updateOptions({ wordBasedSuggestions: st.status === 'ready' ? 'off' : 'currentDocument' });
  if (st.status === 'ready') {
    syncNow();
    setTimeout(registerSemanticTokens, 300);
  }
}

// ---------- файлы ----------
let autosaveTimer;
function markDirty() {
  if (loading) return;
  state.dirty = true;
  $('dirty').hidden = false;
  clearTimeout(autosaveTimer);
  if (state.file) {
    autosaveTimer = setTimeout(() => save(false, true), 1200);  // автосохранение
  } else {
    try {
      localStorage.setItem('draft', state.editor.getValue());
    } catch {}
  }
}

let loading = false;
function setDocument(text, file) {
  loading = true;
  state.editor.setValue(text);
  loading = false;
  state.file = file;
  state.dirty = false;
  $('dirty').hidden = true;
  $('fileName').textContent = file ? basename(file) : 'без имени.cpp';
  document.title = `${file ? basename(file) : 'без имени.cpp'} — Компот`;
  monaco.editor.setModelMarkers(state.editor.getModel(), 'gcc', []);
  monaco.editor.setModelMarkers(state.editor.getModel(), 'clangd', []);
  $('problems').hidden = true;
  syncNow();
  if (window.monaco && dbg) renderBreakpoints();
  const line = text.split('\n').findIndex((l) => /^\s*$/.test(l) && text.includes('cin.tie'));
  state.editor.focus();
  if (!file && line > 0) state.editor.setPosition({ lineNumber: line + 1, column: 5 });
}

async function confirmLeave() {
  if (!state.dirty && (state.file || !state.tests.length)) return true;
  if (state.file) return save(false, true);  // сохранённый файл молча дописываем; не записался — не уходим
  const r = await askSave('без имени.cpp');
  if (r === 'cancel') return false;
  if (r === 'save') return save(true);
  clearDraft();
  return true;
}

// Системный диалог «Сохранить изменения?»: 'save' | 'discard' | 'cancel'
async function askSave(name) {
  return K.confirmSave(name);
}

// Закрытие окна или выход из приложения
K.on('app:close-request', async () => {
  K.closeAck();
  K.closeDone(await confirmLeave());
});

async function newFile() {
  if (!(await confirmLeave())) return;
  clearDraft();
  setDocument(TEMPLATE, null);
  state.tests = [];
  renderTests();
  await setSettings({ file: '' });
  renderSidebar();
}

async function openFile() {
  const p = await K.openDialog();
  if (p) await openPath(p);
}

async function openPath(p) {
  if (p === state.file) return;
  if (!(await confirmLeave())) return;
  const r = await K.read(p);
  if (r.error) {
    toast('Не удалось открыть файл');
    const recent = state.settings.recent.filter((x) => x !== p);
    await setSettings({ recent });
    renderSidebar();
    return;
  }
  setDocument(r.text, p);
  clearDraft();
  state.tests = await K.loadTests(p);
  renderTests();
  rememberRecent(p);
}

async function rememberRecent(p) {
  const recent = [p, ...state.settings.recent.filter((x) => x !== p)].slice(0, 12);
  await setSettings({ recent, file: p, folder: dirname(p) });
  renderSidebar();
}

async function save(as = false, quiet = false) {
  clearTimeout(autosaveTimer);
  let target = state.file;
  if (as || !target) {
    target = await K.saveAsDialog(state.file ? basename(state.file) : 'solution.cpp');
    if (!target) return false;
  }
  const r = await K.write(target, state.editor.getValue());
  if (r.error) {
    toast('Не удалось сохранить: ' + r.error);
    return false;
  }
  const isNew = target !== state.file;
  if (isNew && state.file) await K.moveTests(state.file, target);
  state.file = target;
  state.dirty = false;
  $('dirty').hidden = true;
  $('fileName').textContent = basename(target);
  document.title = `${basename(target)} — Компот`;
  if (isNew) {
    await K.saveTests(target, plainTests());
    clearDraft();
    rememberRecent(target);
  }
  if (!quiet) toast('Сохранено');
  return true;
}

async function renderSidebar() {
  const s = state.settings;
  const recent = $('recentList');
  recent.innerHTML = '';
  for (const p of s.recent) {
    const li = document.createElement('li');
    li.className = p === state.file ? 'current' : '';
    li.innerHTML = `<span class="file-ic">C++</span><span class="name">${esc(basename(p))}</span><span class="dir">${esc(basename(dirname(p)))}</span>`;
    li.title = p;
    li.onclick = () => openPath(p);
    recent.appendChild(li);
  }
  if (!s.recent.length) recent.innerHTML = '<li class="none">Здесь появятся открытые и сохранённые решения.</li>';
}

// ---------- тесты ----------
const plainTests = () => state.tests.map(({ input, expected }) => ({ input, expected }));
let testsSaveTimer;
function persistTests() {
  clearTimeout(testsSaveTimer);
  testsSaveTimer = setTimeout(() => {
    if (state.file) K.saveTests(state.file, plainTests());
    else saveDraftTests();
  }, 400);
}

// Черновик несохранённого файла: код и тесты переживают перезапуск, пока файлу не дадут имя
function saveDraftTests() {
  try {
    if (state.tests.length) localStorage.setItem('draftTests', JSON.stringify(plainTests()));
    else localStorage.removeItem('draftTests');
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem('draft');
    localStorage.removeItem('draftTests');
  } catch {}
}

const VERDICT_TEXT = { OK: 'OK', WA: 'WA', TLE: 'TLE', RE: 'RE', MLE: 'MLE', OLE: 'OLE', DONE: 'ГОТОВО', RUN: 'ИДЁТ' };

function chip(v) {
  if (!v) return '';
  const cls = { OK: 'ok', WA: 'wa', TLE: 'tle', RE: 're', MLE: 'mle', OLE: 'ole', DONE: 'done', RUN: 'run' }[v];
  return `<span class="chip ${cls}">${VERDICT_TEXT[v]}</span>`;
}

function outputHtml(t) {
  const r = t.result;
  const lines = r.stdout.replace(/\s+$/, '').split('\n');
  const exp = (t.expected || '').replace(/\s+$/, '').split('\n');
  const norm = (s) => (s || '').trim().split(/\s+/).join(' ');
  const body = lines.map((l, i) => (r.verdict === 'WA' && norm(l) !== norm(exp[i]) ? `<span class="bad-line">${esc(l)}</span>` : esc(l))).join('\n');
  const err = r.stderr ? `\n<span class="err">${esc(r.stderr.trimEnd())}</span>` : '';
  return body + err || '<span class="muted">(пусто)</span>';
}

function renderTests() {
  const box = $('tests');
  box.innerHTML = '';
  if (!state.tests.length) {
    box.innerHTML = `<div class="empty-state"><span class="ic">${icon('flask')}</span><p>Добавьте тест — ввод и, если знаете, правильный ответ. Или загрузите готовый набор из папки.</p>
      <div class="row" style="justify-content:center"><button class="btn" data-size="sm" id="emptyAdd">${icon('plus').replace('<svg', '<svg width="14" height="14"')}Добавить тест</button></div></div>`;
    $('emptyAdd').onclick = () => addTest();
    updateSummary();
    return;
  }
  state.tests.forEach((t, i) => box.appendChild(testCard(t, i)));
  updateSummary();
}

function testCard(t, i) {
  const el = document.createElement('div');
  el.className = `test${t.collapsed ? ' collapsed' : ''}${t.running ? ' running' : ''}${t.stale ? ' stale' : ''}`;
  const r = t.result;
  el.innerHTML = `
    <div class="test-head">
      <span class="test-num">#${i + 1}</span>
      ${t.running ? chip('RUN') : r ? chip(r.verdict) : ''}
      <span class="preview">${esc((t.input || '').split('\n')[0].slice(0, 40))}</span>
      <span class="test-metrics">${r ? `<span>${fmtTime(r.time)}</span><span>${fmtMem(r.memory)}</span>` : ''}</span>
      <span class="test-actions">
        <button class="btn" data-variant="ghost" data-size="icon-xs" data-act="run" title="Запустить этот тест"><span class="ic">${icon('play')}</span></button>
        <button class="btn" data-variant="ghost" data-size="icon-xs" data-act="debug" title="Отладить на этом тесте"><span class="ic">${icon('bug')}</span></button>
        <button class="btn" data-variant="ghost" data-size="icon-xs" data-act="dup" title="Копия"><span class="ic">${icon('copy')}</span></button>
        <button class="btn" data-variant="ghost" data-size="icon-xs" data-act="del" title="Удалить"><span class="ic">${icon('trash')}</span></button>
      </span>
    </div>
    <div class="test-body">
      <div><div class="io-label">Ввод</div><textarea class="io" data-f="input" spellcheck="false" rows="${rowsFor(t.input)}" placeholder="что прочитает программа">${esc(t.input)}</textarea></div>
      <div><div class="io-label">Ответ</div><textarea class="io" data-f="expected" spellcheck="false" rows="${rowsFor(t.expected)}" placeholder="необязательно">${esc(t.expected)}</textarea></div>
      ${r ? `<div class="full"><div class="io-label">Вывод программы</div><pre class="io">${outputHtml(t)}</pre></div>` : ''}
      ${r && r.note ? `<div class="note full${r.verdict === 'RE' ? ' re' : ''}">${esc(r.note)}</div>` : ''}
    </div>`;
  el.querySelector('.test-head').onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'run') return runTests([i]);
    if (act === 'debug') return startDebug(i);
    if (act === 'dup') {
      state.tests.splice(i + 1, 0, { input: t.input, expected: t.expected });
      persistTests();
      return renderTests();
    }
    if (act === 'del') {
      state.tests.splice(i, 1);
      persistTests();
      return renderTests();
    }
    t.collapsed = !t.collapsed;
    el.classList.toggle('collapsed', t.collapsed);
  };
  el.querySelectorAll('textarea').forEach((ta) => {
    ta.oninput = () => {
      t[ta.dataset.f] = ta.value;
      ta.rows = rowsFor(ta.value);
      persistTests();
    };
  });
  return el;
}

const rowsFor = (text) => Math.max(2, Math.min(10, (text || '').split('\n').length));

function updateSummary() {
  if (state.running || dbg.active || state.lastRun !== 'tests') return;
  const done = state.tests.filter((t) => t.result);
  if (!done.length) return setStatus('');
  const maxT = Math.max(...done.map((t) => t.result.time || 0));
  const checked = done.filter((t) => t.result.verdict !== 'DONE');
  if (!checked.length) return setStatus(`Тесты выполнены · ${fmtTime(maxT)}`);
  const ok = checked.filter((t) => t.result.verdict === 'OK').length;
  setStatus(`Тесты: ${ok} из ${checked.length} · ${fmtTime(maxT)}`, ok === checked.length ? 'good' : 'bad');
}

// Перерисовать одну карточку, не трогая остальные (без моргания всей панели)
function renderTestCard(i) {
  const old = $('tests').children[i];
  if (old && old.classList.contains('test')) old.replaceWith(testCard(state.tests[i], i));
  else renderTests();
}

function addTest() {
  state.tests.push({ input: '', expected: '' });
  persistTests();
  renderTests();
  const tas = $('tests').querySelectorAll('textarea[data-f="input"]');
  tas[tas.length - 1]?.focus();
}

async function importTests() {
  const r = await K.importTests();
  if (!r) return;
  if (!r.tests.length) {
    toast('В папке не нашлось тестов');
    return;
  }
  for (const t of r.tests) t.collapsed = r.tests.length > 3;
  state.tests.push(...r.tests);
  persistTests();
  renderTests();
  toast(`Добавлено тестов: ${r.tests.length}`);
}

// ---------- запуск ----------
function setRunning(on) {
  state.running = on;
  // «Запустить» и «Стоп» стоят в одной ячейке: меняется только видимость, ширина и положение кнопок не прыгают
  $('runBtn').classList.toggle('off', on);
  $('stopBtn').classList.toggle('off', !on);
  // Узнать, что программа именно ждёт ввода, извне нельзя. Поэтому поле включаем и фокусируем, только если
  // программа работает дольше 250 мс: быстрые решения успевают завершиться, и поле не моргает.
  clearTimeout(inputTimer);
  const input = $('consoleInput');
  if (!on) {
    input.disabled = true;
  } else if (state.mode === 'console') {
    inputTimer = setTimeout(() => {
      if (!state.running) return;
      input.disabled = false;
      input.focus();
    }, 250);
  }
}
let inputTimer;

async function compile() {
  const model = state.editor.getModel();
  monaco.editor.setModelMarkers(model, 'gcc', []);
  $('problems').hidden = true;
  if (!state.compiler || state.compiler.missing) {
    showOnboarding();
    return false;
  }
  $('runBtn').classList.add('busy');
  setStatus('Компиляция…', 'busy');
  const res = await K.build(state.editor.getValue());
  $('runBtn').classList.remove('busy');
  const markers = (res.diagnostics || []).filter((d) => d.severity !== 'note').map((d) => ({
    startLineNumber: d.line, startColumn: d.col, endLineNumber: d.line, endColumn: model.getLineMaxColumn(Math.min(d.line, model.getLineCount())),
    message: d.message, severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
  }));
  monaco.editor.setModelMarkers(model, 'gcc', markers);
  if (!res.ok) {
    const list = $('problemsList');
    list.innerHTML = '';
    for (const d of (res.diagnostics || []).filter((x) => x.severity !== 'note')) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="pos">${d.line}:${d.col}</span><span class="sev-${d.severity}">${esc(d.message)}</span>`;
      li.onclick = () => {
        state.editor.revealLineInCenter(d.line);
        state.editor.setPosition({ lineNumber: d.line, column: d.col });
        state.editor.focus();
      };
      list.appendChild(li);
    }
    $('problemsLog').textContent = res.log;
    $('problems').hidden = false;
    setStatus('Ошибка компиляции', 'bad');
    return false;
  }
  return true;
}

async function run() {
  if (state.running) return;
  if (state.mode === 'debug') await setMode(dbg.lastMode || 'tests');  // запуск — это тесты или консоль, не отладка
  if (state.file && state.dirty) await save(false, true);
  if (state.mode === 'console') return runConsole();
  if (!state.tests.length) {
    toast('Нет тестов: добавьте тест или переключитесь в «Консоль»');
    addTest();
    return;
  }
  return runTests(state.tests.map((_, i) => i));
}

async function runTests(indexes) {
  if (state.running) return;
  state.lastRun = 'tests';
  if (!(await compile())) return;
  setRunning(true);
  const subset = indexes.map((i) => state.tests[i]);
  // старый результат остаётся на месте (приглушённым), пока его не заменит новый
  subset.forEach((t, k) => {
    t.stale = !!t.result;
    t.running = false;
    renderTestCard(indexes[k]);
  });
  progressMap = indexes;
  progressDone = 0;
  setStatus(`Тесты: 0 из ${subset.length}…`, 'busy');
  await K.runTests(subset.map((t) => ({ input: t.input, expected: t.expected })));
  progressMap = null;
  setRunning(false);
  subset.forEach((t, k) => {
    if (t.running || t.stale) {
      t.running = false;
      t.stale = false;
      renderTestCard(indexes[k]);
    }
  });
  updateSummary();
}

let progressMap = null;
let progressDone = 0;
K.on('run:progress', (p) => {
  if (!progressMap) return;
  const t = state.tests[progressMap[p.index]];
  if (!t) return;
  if (p.running) {
    t.running = true;
  } else {
    t.running = false;
    t.stale = false;
    t.result = p;
    t.collapsed = p.verdict === 'OK' && state.tests.length > 1;  // пройденные сворачиваем, ошибки раскрываем
    progressDone += 1;
    setStatus(`Тесты: ${progressDone} из ${progressMap.length}…`, 'busy');
  }
  renderTestCard(progressMap[p.index]);
});

// ---------- консоль ----------
const consoleEl = () => $('console');
function consoleAppend(cls, text) {
  const el = consoleEl();
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text;
  el.appendChild(span);
  if (atBottom) el.scrollTop = el.scrollHeight;
}

async function runConsole() {
  state.lastRun = 'console';
  if (!(await compile())) return;
  consoleEl().innerHTML = '';
  setStatus('Программа работает · ввод внизу, Ctrl+D — конец ввода', 'busy');
  setRunning(true);
  const r = await K.runInteractive();
  setRunning(false);
  const ok = r.code === 0 && !r.signal;
  const parts = [ok ? 'Программа завершилась' : `Программа завершилась с ошибкой (код ${r.code ?? r.signal})`, fmtTime(r.time), fmtMem(r.memory)].filter(Boolean);
  setStatus(parts.join(' · '), ok ? 'good' : 'bad');
}

K.on('console:data', ({ stream, text }) => consoleAppend(stream === 'err' ? 'err' : '', text));

$('consoleForm').onsubmit = (e) => {
  e.preventDefault();
  const input = $('consoleInput');
  if (!state.running) return;
  consoleAppend('in', input.value + '\n');
  K.sendInput(input.value + '\n');
  input.value = '';
};
$('consoleInput').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    K.sendEof();
    setStatus('Программа работает · ввод закрыт', 'busy');
  }
});
$('eofBtn').onclick = () => {
  if (!state.running) return;
  K.sendEof();
  setStatus('Программа работает · ввод закрыт', 'busy');
};
$('clearConsoleBtn').onclick = () => { consoleEl().innerHTML = ''; };

// ---------- режим ----------
async function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('#modeSeg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  $('testsView').hidden = mode !== 'tests';
  $('consoleView').hidden = mode !== 'console';
  $('debugView').hidden = mode !== 'debug';
  $('testsActions').hidden = mode !== 'tests';
  $('consoleActions').hidden = mode !== 'console';
  if (mode !== 'debug') await setSettings({ mode });
}

// ---------- отладчик ----------
const dbg = { active: false, stopped: false, bps: new Map(), bpDecor: [], lineDecor: [], prev: new Map(), lastMode: 'tests' };
const bpsOf = () => {
  const key = state.file || '';
  if (!dbg.bps.has(key)) dbg.bps.set(key, new Set());
  return dbg.bps.get(key);
};

function renderBreakpoints() {
  dbg.bpDecor = state.editor.deltaDecorations(dbg.bpDecor, [...bpsOf()].map((line) => ({
    range: new monaco.Range(line, 1, line, 1), options: { glyphMarginClassName: 'bp-glyph', glyphMarginHoverMessage: { value: 'Точка останова' } },
  })));
}

function toggleBreakpoint(line) {
  const set = bpsOf();
  if (set.has(line)) set.delete(line);
  else set.add(line);
  renderBreakpoints();
  if (dbg.active) K.dbgBreakpoints([...set]);
}

function bindBreakpointGutter() {
  const ed = state.editor;
  const T = monaco.editor.MouseTargetType;
  let hint = [];
  ed.onMouseDown((e) => {
    if (e.target.type === T.GUTTER_GLYPH_MARGIN || e.target.type === T.GUTTER_LINE_NUMBERS) toggleBreakpoint(e.target.position.lineNumber);
  });
  ed.onMouseMove((e) => {
    const on = e.target.type === T.GUTTER_GLYPH_MARGIN && !bpsOf().has(e.target.position?.lineNumber);
    hint = ed.deltaDecorations(hint, on ? [{ range: new monaco.Range(e.target.position.lineNumber, 1, e.target.position.lineNumber, 1), options: { glyphMarginClassName: 'bp-hint' } }] : []);
  });
  ed.onMouseLeave(() => { hint = ed.deltaDecorations(hint, []); });
}

function showLine(line, crash) {
  dbg.lineDecor = state.editor.deltaDecorations(dbg.lineDecor, line ? [{
    range: new monaco.Range(line, 1, line, 1),
    options: { isWholeLine: true, className: crash ? 'crash-line' : 'cur-line', glyphMarginClassName: bpsOf().has(line) ? 'cur-glyph on-bp' : 'cur-glyph' },
  }] : []);
  if (line) state.editor.revealLineInCenterIfOutsideViewport(line);
}

function setDebugUi(active) {
  dbg.active = active;
  dbg.ctx?.set(active);
  $('runSlot').hidden = active;
  $('debugBtn').hidden = active;
  $('dbgBar').hidden = !active;
  document.body.classList.toggle('debugging', active);
}

function setStepEnabled(on) {
  document.querySelectorAll('.dbg-btn').forEach((b) => { b.disabled = !on && b.dataset.dbg !== 'stop'; });
}

// Чем кормить программу при отладке: выбранный тест, первый упавший тест — или ввод с клавиатуры (консоль, нет тестов)
function pickDebugInput(index) {
  if (index != null && state.tests[index]) return { input: state.tests[index].input, label: `тест #${index + 1}` };
  const mode = state.mode === 'debug' ? dbg.lastMode : state.mode;
  if (mode === 'console' || !state.tests.length) return { input: '', label: 'с клавиатуры', interactive: true };
  const bad = state.tests.findIndex((t) => t.result && !['OK', 'DONE'].includes(t.result.verdict));
  const i = bad >= 0 ? bad : 0;
  return { input: state.tests[i].input, label: `тест #${i + 1}` };
}

async function startDebug(index = null, opts = {}) {
  if (dbg.active || state.running) return;
  if (!state.compiler || state.compiler.missing) return showOnboarding();
  const info = await K.dbgInfo();
  if (!info.path) {
    if (!info.canInstall) return showOnboarding();
    installCard({
      title: 'Установим отладчик',
      text: `Отладчик lldb (около ${info.sizeMb} МБ) скачается один раз и будет жить в папке Компота. Программы по-прежнему собирает GCC.`,
      actions: '<button class="btn" data-a="net">Скачать и установить</button>',
      run: async () => {
        const r = await K.dbgInstall();
        if (!r.error) {
          toast('Отладчик установлен');
          setTimeout(() => startDebug(index, opts), 100);
        }
        return r;
      },
    });
    return;
  }
  const { input, label, interactive } = pickDebugInput(index);
  dbg.interactive = !!interactive;
  $('dbgInput').value = '';
  $('dbgInputForm').hidden = !dbg.interactive;
  dbg.userStop = false;
  dbg.lastMode = state.mode === 'debug' ? dbg.lastMode : state.mode;
  dbg.prev = new Map();
  $('dbgOut').textContent = '';
  $('dbgVars').innerHTML = '';
  $('dbgFrames').innerHTML = '';
  $('debugTab').hidden = false;
  await setMode('debug');
  state.lastRun = 'debug';
  setStatus(`Отладка: сборка… · ввод: ${label}`, 'busy');
  setDebugUi(true);
  setStepEnabled(false);
  const r = await K.dbgStart(state.editor.getValue(), [...bpsOf()], input, { ...opts, interactive: dbg.interactive });
  if (r.error) {
    setDebugUi(false);
    if (r.error === 'build') {
      await compile();
    } else {
      setStatus(`Не удалось запустить отладчик: ${r.message || r.error}`, 'bad');
    }
    return;
  }
  setStatus(`Отладка: программа выполняется · ввод: ${label}`, 'busy');
  dbg.label = label;
  focusDbgInputSoon();
}

function renderVars(list, box, depth = 0) {
  for (const v of list) {
    const row = document.createElement('div');
    const key = `${depth}:${v.name}`;
    const changed = depth === 0 && dbg.prev.has(key) && dbg.prev.get(key) !== v.value;
    if (depth === 0) dbg.next.set(key, v.value);
    row.className = `var${changed ? ' changed' : ''}`;
    row.style.paddingLeft = `${4 + depth * 14}px`;
    row.innerHTML = `<span class="tw">${v.ref ? '▸' : ''}</span><span class="vn">${esc(v.name)}</span><span class="vv">${esc(v.value ?? '')}</span><span class="vt">${esc(v.type || '')}</span>`;
    box.appendChild(row);
    if (v.ref) {
      const kids = document.createElement('div');
      kids.hidden = true;
      box.appendChild(kids);
      row.querySelector('.tw').onclick = async () => {
        if (!kids.dataset.loaded) {
          kids.dataset.loaded = '1';
          renderVars(await K.dbgVariables(v.ref), kids, depth + 1);
        }
        kids.hidden = !kids.hidden;
        row.querySelector('.tw').textContent = kids.hidden ? '▸' : '▾';
      };
    }
  }
  if (!list.length && depth === 0) box.innerHTML = '<div class="muted">нет переменных</div>';
}

function renderStopped(st) {
  dbg.stopped = true;
  setStepEnabled(true);
  const crash = st.reason === 'exception' || st.reason === 'signal';

  const why = { breakpoint: 'Остановка на точке останова', step: 'Шаг выполнен', exception: 'Программа упала', signal: 'Программа упала', pause: 'Пауза', entry: 'Начало программы', main: 'Начало main', cursor: 'Остановка у курсора' }[st.reason] || 'Остановка';
  setStatus(`${why}${st.line ? ` — строка ${st.line}` : ''}${st.message ? ` · ${st.message}` : ''} · ввод: ${dbg.label || ''}`, crash ? 'bad' : 'debug');
  showLine(st.line, crash);
  dbg.next = new Map();
  $('dbgVars').innerHTML = '';
  renderVars(st.variables, $('dbgVars'));
  dbg.prev = dbg.next;
  const fl = $('dbgFrames');
  fl.innerHTML = '';
  for (const f of st.frames) {
    const li = document.createElement('li');
    li.className = `${f.user ? '' : 'lib'}${f.id === st.frameId ? ' sel' : ''}`;
    li.innerHTML = `<span>${esc(f.name)}</span><span class="ln">${f.user ? `стр. ${f.line}` : ''}</span>`;
    li.onclick = async () => {
      fl.querySelectorAll('li').forEach((x) => x.classList.remove('sel'));
      li.classList.add('sel');
      if (f.user) showLine(f.line, false);
      dbg.next = new Map();
      $('dbgVars').innerHTML = '';
      renderVars(await K.dbgFrame(f.id), $('dbgVars'));
    };
    fl.appendChild(li);
  }
}

// Команды из системного контекстного меню редактора
K.on('menu:action', (id) => {
  const ed = state.editor;
  ed.focus();
  if (id === 'selectAll') ed.trigger('menu', 'editor.action.selectAll', null);
  else if (id === 'changeAll') ed.trigger('menu', 'editor.action.changeAll', null);
  else if (id === 'comment') ed.trigger('menu', 'editor.action.commentLine', null);
  else if (id === 'breakpoint') toggleBreakpoint(ed.getPosition().lineNumber);
  else if (id === 'cursor') debugKey('cursor');
});

K.on('dbg:event', (e) => {
  if (e.type === 'output') {
    const out = $('dbgOut');
    const span = document.createElement('span');
    if (e.stream === 'stderr') span.className = 'err';
    span.textContent = e.text;
    out.appendChild(span);
    out.scrollTop = out.scrollHeight;
  } else if (e.type === 'stopped') {
    renderStopped(e);
  } else if (e.type === 'exited' && dbg.userStop) {
    setStatus(`Отладка остановлена · ввод: ${dbg.label || ''}`);
  } else if (e.type === 'exited') {
    setStatus(`Программа завершилась с кодом ${e.code} · ввод: ${dbg.label || ''}`, e.code ? 'bad' : 'good');
  } else if (e.type === 'terminated') {
    setDebugUi(false);
    dbg.stopped = false;
    showLine(null);
    clearTimeout(dbg.inputTimer);
    $('dbgInputForm').hidden = true;
  }
});

async function debugCommand(cmd) {
  if (!dbg.active) return;
  if (cmd === 'stop') {
    dbg.userStop = true;
    return K.dbgStop();
  }
  if (!dbg.stopped) return;
  dbg.stopped = false;
  setStepEnabled(false);
  showLine(null);
  setStatus(`Отладка: программа выполняется · ввод: ${dbg.label || ''}`, 'busy');
  focusDbgInputSoon();
  if (cmd === 'cursor') await K.dbgRunTo(state.editor.getPosition().lineNumber);
  else await K.dbgStep(cmd);
}

// Ввод с клавиатуры при отладке: фокус в поле, только если программа работает дольше 250 мс (скорее всего, ждёт ввода)
function focusDbgInputSoon() {
  clearTimeout(dbg.inputTimer);
  if (!dbg.interactive) return;
  dbg.inputTimer = setTimeout(() => {
    if (dbg.active && !dbg.stopped) $('dbgInput').focus();
  }, 250);
}

function appendDbgOut(text, cls) {
  const out = $('dbgOut');
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text;
  out.appendChild(span);
  out.scrollTop = out.scrollHeight;
}

$('dbgInputForm').onsubmit = (e) => {
  e.preventDefault();
  if (!dbg.active) return;
  const text = `${$('dbgInput').value}\n`;
  K.dbgInput(text);
  appendDbgOut(text, 'in');
  $('dbgInput').value = '';
};
$('dbgInput').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    K.dbgEof();
    appendDbgOut('[конец ввода]\n', 'in');
  }
});

// Шаг или «до курсора» без запущенной отладки начинают её: шаги — с начала main, F4 — до строки с курсором
function debugKey(cmd) {
  if (dbg.active) return debugCommand(cmd);
  if (cmd === 'cursor') return startDebug(null, { runTo: state.editor.getPosition().lineNumber });
  return startDebug(null, { stopAtMain: true });
}

// ---------- обновления ----------
// ready — скачано, поставится при перезапуске; available — переносная версия, обновить можно только вручную
K.on('update:state', ({ state: st, version }) => {
  const b = $('sbUpdate');
  b.hidden = false;
  $('sbUpdateText').textContent = st === 'ready' ? `Обновление ${version} готово — перезапустить` : `Доступна версия ${version} — скачать`;
  b.title = st === 'ready' ? 'Kompot закроется и откроется уже новой версией' : 'Откроется страница релиза на GitHub';
  b.onclick = () => (st === 'ready' ? K.installUpdate() : K.openReleases());
});

// ---------- поиск и замена ----------
// Своя панель над редактором во всю ширину; совпадения ищет сам Monaco (model.findMatches), подсветка — декорациями
const IS_MAC = navigator.platform.toUpperCase().includes('MAC');
const find = { open: false, matches: [], index: -1, decor: [], timer: null, origin: null, editing: false, ctx: null };
const findPressed = (id) => $(id).getAttribute('aria-pressed') === 'true';

function findOptions() {
  const q = $('findInput').value;
  if (!q) return null;
  const regex = findPressed('findRegex');
  if (regex) {
    try {
      new RegExp(q);
    } catch {
      return { bad: true };
    }
  }
  return { q, regex, matchCase: findPressed('findCase'), word: findPressed('findWord') };
}

function runFind(keepIndex = false) {
  const ed = state.editor;
  const model = ed.getModel();
  const o = findOptions();
  const prev = find.matches[find.index]?.range;
  find.matches = o && !o.bad
    ? model.findMatches(o.q, false, o.regex, o.matchCase, o.word ? ed.getOption(monaco.editor.EditorOption.wordSeparators) : null, true, 5000)
    : [];
  const n = find.matches.length;
  if (!n) {
    find.index = -1;
  } else if (keepIndex && prev) {
    const i = find.matches.findIndex((m) => monaco.Range.compareRangesUsingStarts(m.range, prev) >= 0);
    find.index = i < 0 ? 0 : i;
  } else {
    const from = find.origin || ed.getPosition();
    const i = find.matches.findIndex((m) => monaco.Position.isBeforeOrEqual(from, m.range.getStartPosition()));
    find.index = i < 0 ? 0 : i;
  }
  paintFind(!keepIndex);
}

function paintFind(reveal) {
  const ed = state.editor;
  find.decor = ed.deltaDecorations(find.decor, find.matches.map((m, i) => ({
    range: m.range, options: { className: i === find.index ? 'find-current' : 'find-match', stickiness: 1 },
  })));
  const o = findOptions();
  const n = find.matches.length;
  $('findCount').textContent = !o ? '' : o.bad ? 'ошибка в выражении' : n ? `${find.index + 1} из ${n}` : 'не найдено';
  $('findCount').classList.toggle('none', !!o && !n);
  $('findInput').classList.toggle('bad', !!o && !n);
  const cur = find.matches[find.index];
  if (cur && reveal) {
    ed.setSelection(cur.range);
    ed.revealRangeInCenterIfOutsideViewport(cur.range);
  }
}

function findStep(dir) {
  const n = find.matches.length;
  if (!n) return;
  find.origin = null;
  find.index = (find.index + dir + n) % n;
  paintFind(true);
}

function openFind(withReplace) {
  const ed = state.editor;
  const sel = ed.getSelection();
  const text = sel && !sel.isEmpty() && sel.startLineNumber === sel.endLineNumber ? ed.getModel().getValueInRange(sel) : '';
  if (text) $('findInput').value = text;
  find.open = true;
  find.ctx?.set(true);
  // свои подсветки Monaco (вхождения выделенного текста и слова под курсором) легли бы поверх найденного
  ed.updateOptions({ selectionHighlight: false, occurrencesHighlight: 'off' });
  find.origin = sel ? sel.getStartPosition() : ed.getPosition();
  $('findBar').hidden = false;
  if (withReplace) setReplaceVisible(true);
  runFind();
  const target = withReplace && $('findInput').value ? $('replaceInput') : $('findInput');
  target.focus();
  target.select();
}

function closeFind() {
  if (!find.open) return;
  find.open = false;
  find.ctx?.set(false);
  state.editor.updateOptions({ selectionHighlight: true, occurrencesHighlight: 'singleFile' });
  find.matches = [];
  find.decor = state.editor.deltaDecorations(find.decor, []);
  $('findBar').hidden = true;
  state.editor.focus();
}

function setReplaceVisible(on) {
  $('replaceRow').hidden = !on;
  $('findBar').classList.toggle('with-replace', on);
}

// Текст замены: в режиме регулярных выражений поддерживаются $1…$99, $& и $$
function replacementFor(m) {
  const r = $('replaceInput').value;
  if (!findPressed('findRegex')) return r;
  return r.replace(/\$(\$|&|\d{1,2})/g, (_, t) => (t === '$' ? '$' : t === '&' ? m.matches[0] : m.matches?.[+t] ?? ''));
}

function replaceOne() {
  const m = find.matches[find.index];
  if (!m) return;
  const ed = state.editor;
  find.editing = true;
  ed.pushUndoStop();
  ed.executeEdits('find', [{ range: m.range, text: replacementFor(m), forceMoveMarkers: true }]);
  ed.pushUndoStop();
  find.editing = false;
  find.origin = ed.getModel().getPositionAt(ed.getModel().getOffsetAt(m.range.getStartPosition()) + replacementFor(m).length);
  runFind();
}

function replaceAll() {
  if (!find.matches.length) return;
  const ed = state.editor;
  const count = find.matches.length;
  find.editing = true;
  ed.pushUndoStop();
  ed.executeEdits('find', find.matches.map((m) => ({ range: m.range, text: replacementFor(m) })));
  ed.pushUndoStop();
  find.editing = false;
  runFind(true);
  setStatus(`Заменено: ${count}`);
}

$('findInput').addEventListener('input', () => runFind());
$('findInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    findStep(e.shiftKey ? -1 : 1);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeFind();
  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    $('findInput').select();
  }
});
$('replaceInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) replaceAll();
    else replaceOne();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeFind();
  }
});
['findCase', 'findWord', 'findRegex'].forEach((id) => {
  $(id).onclick = () => {
    $(id).setAttribute('aria-pressed', String(!findPressed(id)));
    runFind();
    $('findInput').focus();
  };
});
$('findPrev').onclick = () => findStep(-1);
$('findNext').onclick = () => findStep(1);
$('findClose').onclick = closeFind;
$('findToggle').onclick = () => {
  setReplaceVisible($('replaceRow').hidden);
  ($('replaceRow').hidden ? $('findInput') : $('replaceInput')).focus();
};
$('replaceOne').onclick = replaceOne;
$('replaceAll').onclick = replaceAll;

// ---------- инструменты ----------
async function refreshCompiler() {
  state.compiler = await K.compilerInfo();
  const c = state.compiler;
  const dot = $('compilerDot');
  if (c.missing) {
    dot.className = 'dot missing';
    $('compilerText').textContent = c.needSdk ? 'нужны инструменты Apple' : 'компилятор не установлен';
    $('compilerFull').textContent = 'не установлен';
  } else {
    dot.className = 'dot ready';
    const short = (c.version.match(/\d+\.\d+\.\d+/) || [c.version])[0];
    $('compilerText').textContent = `GCC ${short}`;
    $('compilerFull').textContent = `${c.version}\n${c.path}`;
  }
}

// Экран установки: компилятор + подсказки (а на Windows по требованию — отладчик)
function installCard({ title, text, actions, run }) {
  document.querySelector('.onboard')?.remove();
  const el = document.createElement('div');
  el.className = 'onboard';
  el.innerHTML = `<div class="onboard-card">
      ${document.querySelector('.topbar .logo').outerHTML.replace('class="logo"', 'class="logo big-logo"')}
      <h2>${title}</h2><p>${text}</p>
      <div class="dl-bar" hidden><i></i></div><p class="muted stage" hidden></p>
      <div class="row">${actions}<button class="btn" data-variant="outline" data-a="later">Позже</button></div>
    </div>`;
  document.querySelector('.center').appendChild(el);
  el.onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    if (a === 'later') return el.remove();
    const busy = (on) => {
      el.querySelector('.row').hidden = on;
      el.querySelector('.dl-bar').hidden = !on;
      el.querySelector('.stage').hidden = !on;
    };
    busy(true);
    const res = await run(a);
    if (!res || res.canceled) return busy(false);
    if (res.error) {
      el.querySelector('.stage').textContent = `Не получилось: ${res.error}`;
      el.querySelector('.row').hidden = false;
      return;
    }
    el.remove();
  };
  return el;
}

function showOnboarding() {
  const c = state.compiler || {};
  if (c.needSdk) {
    installCard({
      title: 'Нужны инструменты Apple',
      text: 'Компилятор Компота уже на месте, но на macOS любой компилятор собирает программы с SDK от Apple, а отладчик работает через debugserver Apple. И то и другое есть только в Command Line Tools — других способов Apple не даёт.',
      actions: '<button class="btn" data-variant="outline" data-a="check">Проверить снова</button><button class="btn" data-a="clt">Установить</button>',
      run: async (a) => {
        if (a === 'clt') {
          await K.installMacTools();
          toast('Откроется окно установки Apple');
          return { canceled: true };
        }
        await refreshCompiler();
        if (state.compiler.missing) {
          toast('Инструменты Apple ещё не установлены');
          return { canceled: true };
        }
        return { ok: true };
      },
    });
    return;
  }
  installCard({
    title: 'Установим компилятор',
    text: `GCC — тот же компилятор, что на олимпиадах, — и подсказки по коду (около ${c.sizeMb || 100} МБ) скачаются один раз и будут жить в папке Компота. В систему ничего не устанавливается.`,
    actions: '<button class="btn" data-variant="outline" data-a="file">У меня есть архив…</button><button class="btn" data-a="net">Скачать и установить</button>',
    run: async (a) => {
      const res = await K.installCompiler(a === 'file');
      if (!res.error && !res.canceled) {
        await refreshCompiler();
        if (state.compiler.missing) {
          showOnboarding();
          return { canceled: true };
        }
        toast('Компилятор установлен');
      }
      return res;
    },
  });
}

K.on('compiler:progress', (p) => {
  const card = document.querySelector('.onboard');
  if (!card) return;
  const bar = card.querySelector('.dl-bar');
  const stage = card.querySelector('.stage');
  if (p.stage === 'download') {
    bar.classList.remove('indet');
    bar.querySelector('i').style.width = p.total ? `${Math.round((p.done / p.total) * 100)}%` : '50%';
    stage.textContent = `Скачивание (${p.what}): ${(p.done / 1048576).toFixed(0)}${p.total ? ` из ${(p.total / 1048576).toFixed(0)}` : ''} МБ`;
  } else if (p.stage === 'extract') {
    bar.classList.add('indet');
    stage.textContent = `Распаковка (${p.what})…`;
  }
});

// ---------- настройки ----------
function openSettings() {
  const s = state.settings;
  $('setTL').value = s.timeLimit;
  $('setML').value = s.memoryLimit;
  $('setStack').value = s.stackMb;
  $('setFlags').value = s.flags;
  $('setFont').value = s.fontSize;
  applyTheme();
  $('settingsModal').hidden = false;
}

function bindSettings() {
  const num = (id, key, min) => {
    $(id).onchange = async () => {
      const v = parseFloat($(id).value);
      if (Number.isFinite(v) && v >= min) {
        await setSettings({ [key]: v });
        updateLimits();
        if (key === 'fontSize') state.editor.updateOptions({ fontSize: v });
      }
    };
  };
  num('setTL', 'timeLimit', 0.1);
  num('setML', 'memoryLimit', 16);
  num('setStack', 'stackMb', 8);
  num('setFont', 'fontSize', 10);
  $('setFlags').onchange = () => setSettings({ flags: $('setFlags').value.trim() || '-std=gnu++17 -O2 -Wall' });
  document.querySelectorAll('#themeSeg button').forEach((b) => {
    b.onclick = async () => {
      await setSettings({ theme: b.dataset.theme });
      applyTheme();
    };
  });
  document.querySelectorAll('.modal').forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('[data-close]')) m.hidden = true;
    });
  });
}

function updateLimits() {
  const s = state.settings;
  $('sbLimits').textContent = `${s.timeLimit} с · ${s.memoryLimit} МБ`;
}

// ---------- перетаскивание границ ----------
function bindResizers() {
  document.querySelectorAll('.resizer').forEach((r) => {
    r.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const side = r.dataset.side;
      const startX = e.clientX;
      const start = state.settings[side];
      r.classList.add('drag');
      const move = (ev) => {
        const dx = ev.clientX - startX;
        const w = Math.max(side === 'sidebar' ? 170 : 300, Math.min(side === 'sidebar' ? 420 : 760, start + (side === 'sidebar' ? dx : -dx)));
        document.documentElement.style.setProperty(side === 'sidebar' ? '--sidebar-w' : '--panel-w', `${w}px`);
        state.settings[side] = w;
      };
      const up = () => {
        r.classList.remove('drag');
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        K.setSettings({ [side]: state.settings[side] });
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  });
}

// ---------- запуск приложения ----------
async function main() {
  state.settings = await K.settings();
  const s = state.settings;
  document.body.classList.add(`platform-${s.platform}`);
  document.querySelectorAll('kbd[data-key]').forEach((k) => { k.textContent = `${s.platform === 'darwin' ? '⌘' : 'Ctrl+'}${k.dataset.key}`; });
  document.documentElement.style.setProperty('--sidebar-w', `${s.sidebar}px`);
  document.documentElement.style.setProperty('--panel-w', `${s.panel}px`);
  paintIcons();
  applyTheme();
  await initMonaco();

  let opened = false;
  if (s.file) {
    const r = await K.read(s.file);
    if (!r.error) {
      setDocument(r.text, s.file);
      state.tests = await K.loadTests(s.file);
      opened = true;
    }
  }
  if (!opened) {
    let draft = null;
    try {
      draft = localStorage.getItem('draft');
    } catch {}
    setDocument(draft || TEMPLATE, null);
    if (draft) markDirty();
    try {
      state.tests = JSON.parse(localStorage.getItem('draftTests') || '[]');
    } catch {}
  }
  renderTests();
  renderSidebar();
  await setMode(s.mode === 'console' ? 'console' : 'tests');
  updateLimits();
  bindSettings();
  bindResizers();

  $('runBtn').onclick = run;
  $('debugBtn').onclick = () => startDebug();
  document.querySelectorAll('.dbg-btn').forEach((b) => { b.onclick = () => debugCommand(b.dataset.dbg); });
  $('stopBtn').onclick = () => K.stop();
  $('newBtn').onclick = newFile;
  $('openBtn').onclick = openFile;
  $('saveBtn').onclick = () => save();
  $('addTestBtn').onclick = addTest;
  $('importBtn').onclick = importTests;
  $('clearTestsBtn').onclick = async () => {
    if (!state.tests.length) return;
    const r = await confirmBox('Удалить все тесты?', `Будет удалено тестов: ${state.tests.length}.`, [
      { label: 'Отмена', value: false }, { label: 'Удалить', value: true, primary: true },
    ]);
    if (!r) return;
    state.tests = [];
    persistTests();
    renderTests();
  };
  $('problemsClose').onclick = () => { $('problems').hidden = true; };
  document.querySelectorAll('#modeSeg button').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });
  $('themeBtn').onclick = async () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    await setSettings({ theme: dark ? 'light' : 'dark' });
    applyTheme();
  };
  $('settingsBtn').onclick = openSettings;
  $('sbCompiler').onclick = openSettings;
  $('sbLimits').onclick = openSettings;
  $('sbLsp').onclick = openSettings;
  $('lspInstall').onclick = async () => {
    $('lspInstall').disabled = true;
    $('lspInstall').textContent = 'Скачивание…';
    const r = await K.lspInstall();
    $('lspInstall').disabled = false;
    $('lspInstall').textContent = 'Установить clangd';
    toast(r.error ? `Не получилось: ${r.error}` : 'Подсказки установлены');
  };

  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F5' && e.shiftKey) {
      e.preventDefault();
      debugCommand('stop');
    } else if (e.key === 'F5') {
      e.preventDefault();
      if (dbg.active) debugCommand('continue');
      else run();
    } else if (e.key === 'F6') {
      e.preventDefault();
      startDebug();
    } else if (e.key === 'F4') {
      e.preventDefault();
      debugKey('cursor');
    } else if (mod && e.key === 'F8') {
      e.preventDefault();
      toggleBreakpoint(state.editor.getPosition().lineNumber);
    } else if (e.key === 'F7' || e.key === 'F8' || e.key === 'F10' || e.key === 'F11') {
      e.preventDefault();
      if (!e.shiftKey) {
        debugKey(e.key === 'F7' || e.key === 'F11' ? 'into' : 'over');
      } else if (e.key === 'F8' || e.key === 'F11') {
        debugCommand('out');
      }
    } else if (mod && e.key === 'F2' && dbg.active) {
      e.preventDefault();
      debugCommand('stop');
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save(e.shiftKey);
    } else if (mod && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      openFile();
    } else if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      newFile();
    } else if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; });
    }
  });
  K.on('theme:system', (dark) => {
    state.settings.systemDark = dark;
    applyTheme();
  });

  await refreshCompiler();
  showLspStatus(await K.lspStatus());
  if (state.compiler.missing) showOnboarding();
}

main();
