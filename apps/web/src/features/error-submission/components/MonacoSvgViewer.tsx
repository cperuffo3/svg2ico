import { useTheme } from '@/hooks/useTheme';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef } from 'react';
import type { HighlightRange } from '../utils/prettifyXml';

interface MonacoSvgViewerProps {
  value: string;
  highlights?: HighlightRange[];
  height?: number | string;
  readOnly?: boolean;
}

// Using `any` here because @monaco-editor/react does not expose the monaco-editor
// types as part of its public surface; we only need a few well-known fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Monaco = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StandaloneCodeEditor = any;

export function MonacoSvgViewer({
  value,
  highlights,
  height = 360,
  readOnly = true,
}: MonacoSvgViewerProps) {
  const editorRef = useRef<StandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const { theme } = useTheme();

  const applyDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !highlights || highlights.length === 0) {
      if (editor) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }

    const decorations = highlights.map((range) => ({
      range: new monaco.Range(range.startLine, range.startColumn, range.endLine, range.endColumn),
      options: {
        inlineClassName: 'svg-error-highlight-inline',
        className: 'svg-error-highlight-line',
        hoverMessage: { value: `**Problematic pattern:** ${range.description}` },
        overviewRuler: {
          color: 'rgba(239, 68, 68, 0.7)',
          position: monaco.editor.OverviewRulerLane.Right,
        },
        minimap: { color: 'rgba(239, 68, 68, 0.7)', position: 1 },
      },
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);

    // Scroll to the first highlight
    const first = highlights[0];
    if (first) {
      editor.revealRangeInCenter(
        new monaco.Range(first.startLine, first.startColumn, first.endLine, first.endColumn),
      );
    }
  }, [highlights]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyDecorations();
  };

  useEffect(() => {
    applyDecorations();
  }, [applyDecorations, value]);

  return (
    <div className="svg-error-monaco-wrapper overflow-hidden rounded-md border border-border">
      <Editor
        height={height}
        defaultLanguage="xml"
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        onMount={handleMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          wordWrap: 'on',
          fontSize: 12,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          renderLineHighlight: 'none',
          automaticLayout: true,
        }}
      />
      <style>{`
        .svg-error-highlight-inline {
          background-color: rgba(239, 68, 68, 0.25);
          border-bottom: 2px solid rgba(239, 68, 68, 0.9);
        }
        .svg-error-highlight-line {
          background-color: rgba(239, 68, 68, 0.08);
        }
      `}</style>
    </div>
  );
}
