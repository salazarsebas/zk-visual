import type * as Monaco from 'monaco-editor';

// ── Circom Monarch Grammar ─────────────────────────────────────────

const circomGrammar: Monaco.languages.IMonarchLanguage = {
  keywords: [
    'template', 'component', 'signal', 'input', 'output', 'public',
    'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'include', 'pragma', 'circom', 'main',
  ],
  typeKeywords: ['field'],
  operators: [
    '<==', '==>', '<--', '-->', '===',
    '+', '-', '*', '/', '%', '**',
    '&&', '||', '!', '==', '!=', '<', '>', '<=', '>=',
    '=', '+=', '-=', '*=', '/=',
    '?', ':',
  ],
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  tokenizer: {
    root: [
      [/<==|==>|<--|-->|===/, 'keyword.operator'],
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@default': 'identifier',
        },
      }],
      { include: '@whitespace' },
      [/[{}()\[\]]/, 'delimiter.bracket'],
      [/[;,.]/, 'delimiter'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],
      [/\d+/, 'number'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],
    ],
    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
    ],
    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
  },
};

const circomConfig: Monaco.languages.LanguageConfiguration = {
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
  ],
  indentationRules: {
    increaseIndentPattern: /^.*\{[^}]*$/,
    decreaseIndentPattern: /^\s*\}/,
  },
};

// ── Noir Monarch Grammar ────────────────────────────────────────────

const noirGrammar: Monaco.languages.IMonarchLanguage = {
  keywords: [
    'fn', 'let', 'mut', 'pub', 'use', 'mod', 'struct', 'impl',
    'return', 'if', 'else', 'for', 'in', 'while', 'loop',
    'assert', 'assert_eq', 'constrain', 'global', 'comptime',
    'where', 'trait', 'type', 'as', 'unsafe', 'unconstrained',
  ],
  typeKeywords: [
    'Field', 'u8', 'u16', 'u32', 'u64', 'u128',
    'i8', 'i16', 'i32', 'i64', 'i128',
    'bool', 'str', 'Self',
  ],
  constants: ['true', 'false'],
  operators: [
    '=>', '->', '|>', '::', '..', '..=',
    '+', '-', '*', '/', '%',
    '&&', '||', '!', '==', '!=', '<', '>', '<=', '>=',
    '=', '+=', '-=', '*=', '/=',
    '&', '|', '^', '<<', '>>',
  ],
  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  tokenizer: {
    root: [
      [/=>|->|\|>/, 'keyword.operator'],
      [/::/, 'operator.path'],
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@constants': 'constant',
          '@default': 'identifier',
        },
      }],
      { include: '@whitespace' },
      [/[{}()\[\]]/, 'delimiter.bracket'],
      [/[;,.]/, 'delimiter'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],
      [/0x[0-9a-fA-F]+/, 'number.hex'],
      [/0b[01]+/, 'number.binary'],
      [/\d+/, 'number'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],
    ],
    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\/\/.*$/, 'comment.doc'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],
    ],
    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],
    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
  },
};

const noirConfig: Monaco.languages.LanguageConfiguration = {
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
  ],
  indentationRules: {
    increaseIndentPattern: /^.*\{[^}]*$/,
    decreaseIndentPattern: /^\s*\}/,
  },
};

// ── Theme ───────────────────────────────────────────────────────────

const zkVisualTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'a78bfa', fontStyle: 'bold' },
    { token: 'keyword.operator', foreground: 'c4b5fd' },
    { token: 'type', foreground: '38bdf8' },
    { token: 'type.identifier', foreground: '7dd3fc' },
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'comment.doc', foreground: '9ca3af', fontStyle: 'italic' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'number.hex', foreground: 'f59e0b' },
    { token: 'number.binary', foreground: 'f59e0b' },
    { token: 'operator', foreground: '60a5fa' },
    { token: 'operator.path', foreground: '93c5fd' },
    { token: 'string', foreground: '86efac' },
    { token: 'string.escape', foreground: '6ee7b7' },
    { token: 'identifier', foreground: 'e5e7eb' },
    { token: 'constant', foreground: 'fb923c' },
    { token: 'delimiter', foreground: '9ca3af' },
    { token: 'delimiter.bracket', foreground: '9ca3af' },
  ],
  colors: {
    'editor.background': '#000000',
    'editor.foreground': '#e5e7eb',
    'editorLineNumber.foreground': '#333333',
    'editorLineNumber.activeForeground': '#666666',
    'editor.lineHighlightBackground': '#0a0a0a',
    'editorCursor.foreground': '#facc15',
    'editor.selectionBackground': '#1a1a1a',
    'editorGutter.background': '#000000',
  },
};

// ── Registration ────────────────────────────────────────────────────

let registered = false;

export function registerLanguages(monaco: typeof Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({ id: 'circom' });
  monaco.languages.setMonarchTokensProvider('circom', circomGrammar);
  monaco.languages.setLanguageConfiguration('circom', circomConfig);

  monaco.languages.register({ id: 'noir' });
  monaco.languages.setMonarchTokensProvider('noir', noirGrammar);
  monaco.languages.setLanguageConfiguration('noir', noirConfig);

  monaco.editor.defineTheme('zk-visual-dark', zkVisualTheme);
}
