import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from "@monaco-editor/react";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  indentation: number | string;
  onReady?: () => void;
  searchTerm?: string;
}

export const JsonEditor: React.FC<EditorProps> = ({ value, onChange, error, indentation, onReady, searchTerm }) => {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || "");
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
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
    
    // Trigger re-render to apply decorations if needed
    setIsEditorReady(true);

    // Signal that the editor is ready
    if (onReady) {
      onReady();
    }
  };

  // Search highlighting effect
  useEffect(() => {
    if (!editorRef.current || !isEditorReady) return;
    
    const editor = editorRef.current;
    const model = editor.getModel();
    
    if (!model) return;

    // Clear previous decorations
    if (!searchTerm) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    // Find matches
    // findMatches(searchString, searchOnlyEditableRange, isRegex, matchCase, wordSeparators, captureMatches)
    const matches = model.findMatches(searchTerm, false, false, false, null, true);
    
    // Create new decorations
    const newDecorations = matches.map((match: any) => ({
      range: match.range,
      options: {
        isWholeLine: false,
        className: 'editor-match-highlight',
        overviewRuler: {
          color: 'rgba(234, 179, 8, 0.8)',
          position: 4 // OverviewRulerLane.Full
        }
      }
    }));

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

  }, [searchTerm, value, isEditorReady]); // Re-run when searchTerm, value, or ready state changes

  return (
    <div className="relative flex-1 w-full h-full group overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="json"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        // Use an empty div for loading to prevent the default "Loading..." text
        // The Loader component in App.tsx handles the visual loading state
        loading={<div className="w-full h-full bg-background" />}
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
          },
          tabSize: typeof indentation === 'number' ? indentation : 4,
          insertSpaces: typeof indentation === 'number',
          detectIndentation: false,
        }}
        theme="vs-dark" // Fallback, we set custom theme on mount
      />
      
      {/* Visual Error Indicator Overlay */}
      {error && (
        <div className="absolute bottom-6 left-0 right-0 px-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-lg w-full animate-in slide-in-from-bottom-2 fade-in duration-200 z-10 flex justify-center pointer-events-none">
          <div className="bg-error/10 text-error border border-error/20 px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-mono pointer-events-auto max-w-full">
            <div className="w-2 h-2 rounded-full bg-error shrink-0 animate-pulse" />
            <span className="break-all line-clamp-2 md:line-clamp-none">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};