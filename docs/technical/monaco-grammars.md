# Monaco Editor: Circom and Noir Grammars

> Implementation guide — complete Monaco Monarch grammar definitions for Circom and Noir,
> registration pattern, theme integration, and line highlighting for step synchronization.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Registration Pattern](#2-registration-pattern)
3. [Circom Monarch Grammar (Complete)](#3-circom-monarch-grammar-complete)
4. [Circom Language Configuration](#4-circom-language-configuration)
5. [Noir Monarch Grammar (Complete)](#5-noir-monarch-grammar-complete)
6. [Noir Language Configuration](#6-noir-language-configuration)
7. [Theme Integration](#7-theme-integration)
8. [Line Highlighting for Step Sync](#8-line-highlighting-for-step-sync)
9. [Inline Value Annotations](#9-inline-value-annotations)

---

## 1. Overview

Monaco's **Monarch tokenizer** is a JSON-configurable lexer. It defines token rules as a state machine: the tokenizer scans the source text and assigns token types (keyword, comment, number, etc.) to each token. Monaco uses token types to apply colors from the active theme.

This file provides two complete grammar objects for `monaco.languages.setMonarchTokensProvider()`. Both grammars are intentionally minimal — enough for readable syntax highlighting, not a full language server. A language server protocol (LSP) integration is out of scope for ZK Visual.

---

## 2. Registration Pattern

The exact sequence for registering a custom language in Monaco. **Must be called before the editor is created.**

```typescript
import * as monaco from 'monaco-editor';
import { circomGrammar, circomConfig } from './grammars/circom';
import { noirGrammar, noirConfig } from './grammars/noir';
import { zkVisualTheme } from './grammars/theme';

export function registerLanguages(): void {
  // ── Circom ────────────────────────────────────────────────────────────
  monaco.languages.register({ id: 'circom' });
  monaco.languages.setMonarchTokensProvider('circom', circomGrammar);
  monaco.languages.setLanguageConfiguration('circom', circomConfig);

  // ── Noir ──────────────────────────────────────────────────────────────
  monaco.languages.register({ id: 'noir' });
  monaco.languages.setMonarchTokensProvider('noir', noirGrammar);
  monaco.languages.setLanguageConfiguration('noir', noirConfig);

  // ── Theme ─────────────────────────────────────────────────────────────
  monaco.editor.defineTheme('zk-visual-dark', zkVisualTheme);
}

// Call once during app initialization, before any editor is created:
// registerLanguages();
// const editor = monaco.editor.create(container, { language: 'circom', theme: 'zk-visual-dark' });
```

---

## 3. Circom Monarch Grammar (Complete)

```typescript
import type * as monaco from 'monaco-editor';

export const circomGrammar: monaco.languages.IMonarchLanguage = {
  keywords: [
    'template', 'component', 'signal', 'input', 'output', 'public',
    'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'include', 'pragma', 'circom', 'main',
  ],

  typeKeywords: [
    'field',
  ],

  operators: [
    // ZK-specific constraint operators
    '<==', '==>', '<--', '-->', '===',
    // Arithmetic
    '+', '-', '*', '/', '%', '**',
    // Comparison
    '==', '!=', '<', '>', '<=', '>=',
    // Logical
    '&&', '||', '!',
    // Bitwise
    '&', '|', '^', '~', '<<', '>>',
    // Assignment
    '=',
  ],

  // Symbols used to delimit operators
  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  tokenizer: {
    root: [
      // Template names (PascalCase identifiers following 'template')
      [/template\s+([A-Z][a-zA-Z0-9_]*)/, ['keyword', 'type.identifier']],

      // Component instantiation names
      [/component\s+([a-zA-Z_]\w*)/, ['keyword', 'variable']],

      // Identifiers — checked against keyword list
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords':     'keyword',
          '@typeKeywords': 'type',
          '@default':      'identifier',
        },
      }],

      // Whitespace
      { include: '@whitespace' },

      // Numeric literals
      [/\d+/, 'number'],

      // Strings (for include paths)
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // unterminated
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

      // ZK constraint operators (must come before general operators)
      [/<==|==>|<--|-->|===/, 'keyword.operator'],

      // Delimiters
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],

      // General operators
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default':   '',
        },
      }],

      // Punctuation
      [/[;,.]/, 'delimiter'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\/\*/, 'comment', '@push'],
      ['\\*/', 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],
  },
};
```

---

## 4. Circom Language Configuration

```typescript
import type * as monaco from 'monaco-editor';

export const circomConfig: monaco.languages.LanguageConfiguration = {
  // Bracket matching
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],

  // Auto-closing pairs
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
  ],

  // Surrounding pairs (for selection wrapping)
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],

  // Comments
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },

  // Word definition for hover and selection
  wordPattern: /[a-zA-Z_]\w*/,

  // Auto-indent rules
  indentationRules: {
    increaseIndentPattern: /^.*\{[^}]*$/,
    decreaseIndentPattern: /^\s*\}/,
  },

  // Folding markers (for IDE-like code folding)
  folding: {
    markers: {
      start: /^\s*\/\/ #region/,
      end:   /^\s*\/\/ #endregion/,
    },
  },
};
```

---

## 5. Noir Monarch Grammar (Complete)

```typescript
import type * as monaco from 'monaco-editor';

export const noirGrammar: monaco.languages.IMonarchLanguage = {
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

  builtins: [
    'std', 'dep',
  ],

  constants: [
    'true', 'false',
  ],

  operators: [
    // Noir-specific
    '::', '..', '..=', '=>', '->', '|>', '?',
    // Arithmetic
    '+', '-', '*', '/', '%',
    // Comparison
    '==', '!=', '<', '>', '<=', '>=',
    // Logical
    '&&', '||', '!',
    // Bitwise
    '&', '|', '^', '~', '<<', '>>',
    // Assignment
    '=', '+=', '-=', '*=', '/=',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%@]+/,

  tokenizer: {
    root: [
      // Function definitions: 'fn name'
      [/fn\s+([a-zA-Z_]\w*)/, ['keyword', 'entity.name.function']],

      // Struct definitions: 'struct Name'
      [/struct\s+([A-Z][a-zA-Z0-9_]*)/, ['keyword', 'type.identifier']],

      // Impl blocks: 'impl Name' or 'impl Trait for Name'
      [/impl\s+([A-Z][a-zA-Z0-9_]*)/, ['keyword', 'type.identifier']],

      // Trait definitions: 'trait Name'
      [/trait\s+([A-Z][a-zA-Z0-9_]*)/, ['keyword', 'type.identifier']],

      // Generic type parameters: <T> — simple match
      [/<([A-Z][a-zA-Z0-9_,\s]*)>/, 'type.identifier'],

      // Path separators for std namespace
      [/\b(std|dep)\b/, 'namespace'],

      // Identifiers
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords':     'keyword',
          '@typeKeywords': 'type',
          '@builtins':     'namespace',
          '@constants':    'constant',
          '@default':      'identifier',
        },
      }],

      // Whitespace
      { include: '@whitespace' },

      // Numeric literals (decimal, hex, binary)
      [/0x[0-9a-fA-F_]+/, 'number.hex'],
      [/0b[01_]+/, 'number.binary'],
      [/\d[\d_]*/, 'number'],

      // Byte and char literals
      [/'[^\\']'/, 'string'],
      [/(')([^\\'])(')/, ['string', 'string', 'string']],

      // String literals
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // unterminated
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

      // Noir-specific operators (check before general)
      [/::/, 'operator.path'],
      [/=>|->|\|>/, 'keyword.operator'],

      // Delimiters
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],

      // General operators
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default':   '',
        },
      }],

      // Punctuation
      [/[;,.]/, 'delimiter'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/\/\/.*$/, 'comment.doc'],   // Doc comments: ///
      [/\/\/.*$/,   'comment'],       // Line comments: //
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],
  },
};
```

---

## 6. Noir Language Configuration

```typescript
import type * as monaco from 'monaco-editor';

export const noirConfig: monaco.languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['<', '>'],  // Generic type parameters
  ],

  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: '\'', close: '\'', notIn: ['string', 'comment'] },
  ],

  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '<', close: '>' },
  ],

  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],  // Noir supports block comments
  },

  wordPattern: /[a-zA-Z_]\w*/,

  indentationRules: {
    increaseIndentPattern: /^.*\{[^}]*$/,
    decreaseIndentPattern: /^\s*\}/,
  },
};
```

---

## 7. Theme Integration

Apply ZK Visual's dark color palette to token types. The token colors match the design system colors from [architecture.md](./architecture.md).

```typescript
import type * as monaco from 'monaco-editor';

export const zkVisualTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Keywords: violet (matches gateAdd node color)
    { token: 'keyword',          foreground: 'a78bfa' },  // violet-400
    { token: 'keyword.operator', foreground: 'c4b5fd' },  // violet-300

    // Types: sky blue
    { token: 'type',             foreground: '38bdf8' },  // sky-400
    { token: 'type.identifier',  foreground: '7dd3fc' },  // sky-300

    // Comments: gray
    { token: 'comment',          foreground: '6b7280', fontStyle: 'italic' },  // gray-500
    { token: 'comment.doc',      foreground: '9ca3af', fontStyle: 'italic' },  // gray-400

    // Numbers: amber
    { token: 'number',           foreground: 'fbbf24' },  // yellow-400
    { token: 'number.hex',       foreground: 'f59e0b' },  // amber-500
    { token: 'number.binary',    foreground: 'f59e0b' },  // amber-500

    // Operators: blue
    { token: 'operator',         foreground: '60a5fa' },  // blue-400
    { token: 'operator.path',    foreground: '93c5fd' },  // blue-300

    // Strings: green
    { token: 'string',           foreground: '86efac' },  // green-300
    { token: 'string.escape',    foreground: '6ee7b7' },  // emerald-300

    // Identifiers: light gray (default text)
    { token: 'identifier',       foreground: 'e5e7eb' },  // gray-200
    { token: 'variable',         foreground: 'd1d5db' },  // gray-300

    // Namespaces: teal
    { token: 'namespace',        foreground: '2dd4bf' },  // teal-400

    // Constants: orange
    { token: 'constant',         foreground: 'fb923c' },  // orange-400

    // Entity names (function names)
    { token: 'entity.name.function', foreground: 'fde68a' },  // amber-200

    // Delimiters
    { token: 'delimiter',        foreground: '9ca3af' },  // gray-400
  ],
  colors: {
    'editor.background':              '#111827',  // gray-900
    'editor.foreground':              '#e5e7eb',  // gray-200
    'editorLineNumber.foreground':    '#4b5563',  // gray-600
    'editorLineNumber.activeForeground': '#9ca3af', // gray-400
    'editor.lineHighlightBackground': '#1f2937',  // gray-800 (default)
    'editorCursor.foreground':        '#a78bfa',  // violet-400
    'editor.selectionBackground':     '#374151',  // gray-700
    'editor.inactiveSelectionBackground': '#1f2937',
    'editorGutter.background':        '#111827',  // gray-900
  },
};
```

---

## 8. Line Highlighting for Step Sync

When `CircuitStep.codeLine` is set, the Monaco editor highlights that line to show which code is currently executing. This uses Monaco's **decorations API**.

```typescript
// In the component managing the Monaco editor:

let activeDecorations: string[] = [];  // Track current decorations for cleanup

/**
 * Highlight a specific line in the Monaco editor.
 * Clears any previous highlighting first.
 */
function highlightLine(editor: monaco.editor.IStandaloneCodeEditor, line: number): void {
  // Clear previous decorations
  activeDecorations = editor.deltaDecorations(activeDecorations, []);

  if (line <= 0) return;

  // Apply new decoration
  activeDecorations = editor.deltaDecorations([], [
    {
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'zkviz-active-line',
        glyphMarginClassName: 'zkviz-active-glyph',
        overviewRuler: {
          color: '#a78bfa',  // violet-400
          position: monaco.editor.OverviewRulerLane.Full,
        },
      },
    },
  ]);

  // Scroll the active line into view
  editor.revealLineInCenter(line, monaco.editor.ScrollType.Smooth);
}
```

**Required CSS rules:**

```css
/* Active line background */
.zkviz-active-line {
  background-color: rgba(167, 139, 250, 0.12) !important;  /* violet-400 at 12% opacity */
  border-left: 3px solid #a78bfa;                           /* violet-400 left accent */
}

/* Glyph margin indicator */
.zkviz-active-glyph::before {
  content: '▶';
  color: #a78bfa;  /* violet-400 */
  font-size: 10px;
  display: block;
  margin-top: 4px;
}
```

**Usage pattern in animation:**

```typescript
// In the step change handler:
function onStepChange(step: CircuitStep): void {
  if (step.codeLine != null && editorRef.current) {
    highlightLine(editorRef.current, step.codeLine);
  } else if (editorRef.current) {
    // Clear highlighting for steps without a code line
    activeDecorations = editorRef.current.deltaDecorations(activeDecorations, []);
  }
}
```

---

## 9. Inline Value Annotations

`CircuitStep.codeAnnotations[]` renders signal values inline next to code lines. A `CodeAnnotation` object:

```typescript
interface CodeAnnotation {
  line: number;   // 1-indexed line number in Circuit.code
  label: string;  // The annotation text, e.g. "= 42" or "✓"
}
```

**Implementation using Monaco after-content decorations:**

```typescript
let annotationDecorations: string[] = [];

function applyAnnotations(
  editor: monaco.editor.IStandaloneCodeEditor,
  annotations: CodeAnnotation[]
): void {
  // Clear previous annotations
  annotationDecorations = editor.deltaDecorations(annotationDecorations, []);

  if (annotations.length === 0) return;

  const decorations: monaco.editor.IModelDeltaDecoration[] = annotations.map(ann => ({
    range: new monaco.Range(ann.line, Number.MAX_SAFE_INTEGER, ann.line, Number.MAX_SAFE_INTEGER),
    options: {
      after: {
        content: `  // ${ann.label}`,
        inlineClassName: 'zkviz-inline-annotation',
      },
    },
  }));

  annotationDecorations = editor.deltaDecorations([], decorations);
}
```

**Required CSS:**

```css
/* Inline value annotation text */
.zkviz-inline-annotation {
  color: #6b7280;           /* gray-500 — subdued, comment-like */
  font-style: italic;
  opacity: 0.85;
}
```

**Example output in the editor:**

```circom
signal input a;          // a = 3
signal input b;          // b = 2
signal output out;

out <== a * b;           // out = 6
```

**Usage in step data:**

```typescript
steps.push({
  graph: g,
  signals: { a: 3n, b: 2n, out: 6n },
  codeLine: 5,
  codeAnnotations: [
    { line: 1, label: 'a = 3' },
    { line: 2, label: 'b = 2' },
    { line: 5, label: 'out = 6' },
  ],
  totalConstraints: 1,
});
```
