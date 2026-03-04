import { useRef, useEffect, useCallback } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import type { CodeAnnotation } from '../lib/types';
import { registerLanguages } from '../lib/monaco-setup';

interface Props {
  code: string;
  language: 'circom' | 'noir';
  activeLine?: number;
  annotations?: CodeAnnotation[];
  className?: string;
}

export function CodePanel({
  code,
  language,
  activeLine,
  annotations,
  className = '',
}: Props) {
  const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<MonacoEditor.editor.IEditorDecorationsCollection | null>(null);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    registerLanguages(monaco);
  }, []);

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection([]);
  }, []);

  // Update decorations when activeLine or annotations change
  useEffect(() => {
    const editor = editorRef.current;
    const decorations = decorationsRef.current;
    if (!editor || !decorations) return;

    const newDecorations: MonacoEditor.editor.IModelDeltaDecoration[] = [];

    // Active line highlight
    if (activeLine && activeLine > 0) {
      newDecorations.push({
        range: {
          startLineNumber: activeLine,
          startColumn: 1,
          endLineNumber: activeLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'zkviz-active-line',
          glyphMarginClassName: 'zkviz-active-glyph',
        },
      });

      // Scroll to active line
      editor.revealLineInCenterIfOutsideViewport(activeLine);
    }

    // Annotations
    if (annotations) {
      for (const ann of annotations) {
        newDecorations.push({
          range: {
            startLineNumber: ann.line,
            startColumn: 1,
            endLineNumber: ann.line,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            after: {
              content: `  // ${ann.label}`,
              inlineClassName: 'zkviz-inline-annotation',
            },
          },
        });
      }
    }

    decorations.set(newDecorations);
  }, [activeLine, annotations]);

  return (
    <div className={`h-full ${className}`}>
      <Editor
        value={code}
        language={language}
        theme="zk-visual-dark"
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          lineNumbers: 'on',
          wordWrap: 'off',
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: "'Geist Mono', monospace",
          glyphMargin: true,
          folding: false,
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
