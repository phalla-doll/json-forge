"use client";

import { useRef, useEffect, useState } from "react";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type { EditorProps } from "./json-editor";

type MonacoNS = Parameters<OnMount>[1];

export function JsonEditorInner({
    value,
    onChange,
    error,
    indentation,
    onReady,
    searchTerm,
    theme = "dark",
    onMatchCountChange,
    wordWrap = false,
    readOnly = false,
}: EditorProps) {
    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
    const monacoRef = useRef<MonacoNS | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const [isEditorReady, setIsEditorReady] = useState(false);

    const defineThemes = (monaco: Parameters<OnMount>[1]) => {
        monaco.editor.defineTheme("vercel-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "string.key.json", foreground: "A1A1A1" },
                { token: "string.value.json", foreground: "4ADE80" },
                { token: "number", foreground: "FB923C" },
                { token: "keyword.json", foreground: "C084FC" },
                { token: "delimiter", foreground: "444444" },
            ],
            colors: {
                "editor.background": "#000000",
                "editor.foreground": "#eaeaea",
                "editor.lineHighlightBackground": "#111111",
                "editorCursor.foreground": "#ffffff",
                "editor.selectionBackground": "#333333",
                "editorLineNumber.foreground": "#444444",
                "editorLineNumber.activeForeground": "#888888",
                "scrollbarSlider.background": "#333333",
                "scrollbarSlider.hoverBackground": "#444444",
                "scrollbarSlider.activeBackground": "#555555",
            },
        });

        monaco.editor.defineTheme("vercel-light", {
            base: "vs",
            inherit: true,
            rules: [
                { token: "string.key.json", foreground: "555555" },
                { token: "string.value.json", foreground: "16A34A" },
                { token: "number", foreground: "EA580C" },
                { token: "keyword.json", foreground: "9333EA" },
                { token: "delimiter", foreground: "999999" },
            ],
            colors: {
                "editor.background": "#ffffff",
                "editor.foreground": "#000000",
                "editor.lineHighlightBackground": "#f5f5f5",
                "editorCursor.foreground": "#000000",
                "editor.selectionBackground": "#eeeeee",
                "editorLineNumber.foreground": "#cccccc",
                "editorLineNumber.activeForeground": "#666666",
                "scrollbarSlider.background": "#eaeaea",
                "scrollbarSlider.hoverBackground": "#d4d4d4",
                "scrollbarSlider.activeBackground": "#a3a3a3",
            },
        });
    };

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        defineThemes(monaco);
        monaco.editor.setTheme(
            theme === "dark" ? "vercel-dark" : "vercel-light",
        );
        setIsEditorReady(true);
        onReady?.();
    };

    useEffect(() => {
        if (isEditorReady && monacoRef.current) {
            monacoRef.current.editor.setTheme(
                theme === "dark" ? "vercel-dark" : "vercel-light",
            );
        }
    }, [theme, isEditorReady]);

    useEffect(() => {
        if (!editorRef.current || !isEditorReady) return;

        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return;

        if (!searchTerm) {
            decorationsRef.current = editor.deltaDecorations(
                decorationsRef.current,
                [],
            );
            onMatchCountChange?.(null);
            return;
        }

        const matches = model.findMatches(
            searchTerm,
            false,
            false,
            false,
            null,
            true,
        );

        onMatchCountChange?.(matches.length);

        const newDecorations = matches.map((match) => ({
            range: match.range,
            options: {
                isWholeLine: false,
                className: "editor-match-highlight",
                overviewRuler: {
                    color: "rgba(234, 179, 8, 0.8)",
                    position: 4,
                },
            },
        }));

        decorationsRef.current = editor.deltaDecorations(
            decorationsRef.current,
            newDecorations,
        );
    }, [searchTerm, value, isEditorReady, onMatchCountChange]);

    return (
        <div className="group relative flex size-full flex-1 overflow-hidden">
            <div
                className={`absolute inset-0 ${
                    isEditorReady ? "visible" : "invisible"
                }`}
            >
                <MonacoEditor
                    height="100%"
                    defaultLanguage="json"
                    value={value}
                    onChange={(v) => onChange(v || "")}
                    onMount={handleEditorDidMount}
                    loading={<div className="bg-background size-full" />}
                    options={{
                        minimap: { enabled: false },
                        lineNumbers: "on",
                        folding: true,
                        lineDecorationsWidth: 10,
                        lineNumbersMinChars: 3,
                        fontSize: 13,
                        fontFamily: "'Google Sans Code', monospace",
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
                        tabSize:
                            typeof indentation === "number" ? indentation : 4,
                        insertSpaces: typeof indentation === "number",
                        detectIndentation: false,
                        wordWrap: wordWrap ? "on" : "off",
                        readOnly,
                    }}
                    theme={theme === "dark" ? "vercel-dark" : "vercel-light"}
                />
            </div>

            {!isEditorReady && (
                <div className="bg-background absolute inset-0 flex items-start px-[49px] py-4">
                    <div className="flex w-full max-w-2xl flex-col gap-3">
                        <div className="bg-muted h-3 w-3/4 rounded-sm" />
                        <div className="bg-muted h-3 w-1/2 rounded-sm" />
                        <div className="bg-muted h-3 w-2/3 rounded-sm" />
                    </div>
                </div>
            )}

            {isEditorReady && !value && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-muted-foreground flex flex-col items-center gap-2 font-mono text-sm opacity-60">
                        <span className="text-4xl opacity-20">{"{ }"}</span>
                        <span>
                            Paste JSON here, load a file, or drag &amp; drop
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <div className="pointer-events-none absolute right-0 bottom-6 left-0 z-10 flex justify-center px-4 md:right-auto md:left-1/2 md:max-w-lg md:-translate-x-1/2">
                    <div className="border-destructive/20 bg-destructive/10 text-destructive pointer-events-auto flex max-w-full items-center gap-3 rounded-lg border px-4 py-3 font-mono text-xs shadow-2xl backdrop-blur-md">
                        <div className="bg-destructive size-2 shrink-0 animate-pulse rounded-full" />
                        <span className="line-clamp-2 break-all md:line-clamp-none">
                            {error}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
