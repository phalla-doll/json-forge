import React from 'react';
import Editor, { OnMount } from "@monaco-editor/react";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

export const JsonEditor: React.FC<EditorProps> = ({ value, onChange, error }) => {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value || "");
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Define a custom Vercel-like theme with consistent colors to Graph View
    monaco.editor.defineTheme('vercel-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: 'A1A1A1' }, // Keys (Gray)
        { token: 'string.value.json', foreground: '4ADE80' }, // Strings (Green)
        { token: 'number', foreground: 'FB923C' }, // Numbers (Orange)
        { token: 'keyword.json', foreground: 'C084FC' }, // Booleans/Null (Purple)
        { token: 'delimiter', foreground: '444444' }, // Brackets/Commas
      ],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#eaeaea',
        'editor.lineHighlightBackground': '#111111',
        'editorCursor.foreground': '#ffffff',
        'editor.selectionBackground': '#333333',
        'editorLineNumber.foreground': '#444444',
        'editorLineNumber.activeForeground': '#888888',
        'scrollbarSlider.background': '#333333',
        'scrollbarSlider.hoverBackground': '#444444',
        'scrollbarSlider.activeBackground': '#555555',
      }
    });
    monaco.editor.setTheme('vercel-dark');
  };

  return (
    <div className="relative flex-1 w-full h-full group overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="json"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 24,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          formatOnPaste: true,
          renderLineHighlight: "all",
          contextmenu: true,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          mouseWheelZoom: true,
          guides: {
            indentation: true,
            bracketPairs: true,
          },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          }
        }}
        theme="vs-dark" // Fallback, we set custom theme on mount
      />
      
      {/* Visual Error Indicator Overlay */}
      {error && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-full px-4 animate-in slide-in-from-bottom-2 fade-in duration-200 z-10">
          <div className="bg-error/10 text-error border border-error/20 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-mono">
            <div className="w-2 h-2 rounded-full bg-error shrink-0 animate-pulse" />
            <span className="break-all">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};