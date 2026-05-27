"use client";

import { useRef, useEffect, useState } from "react";
import { DiffEditor, type DiffOnMount } from "@monaco-editor/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ClipboardPasteIcon, Trash2 } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/utils";
import type { DiffViewProps } from "./json-diff-view";

type MonacoNS = Parameters<DiffOnMount>[1];

export function JsonDiffViewInner({
    original,
    modified,
    onModifiedChange,
    theme = "dark",
}: DiffViewProps) {
    const monacoRef = useRef<MonacoNS | null>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);

    const defineThemes = (monaco: MonacoNS) => {
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

    const handleMount: DiffOnMount = (editor, monaco) => {
        monacoRef.current = monaco;
        defineThemes(monaco);
        monaco.editor.setTheme(
            theme === "dark" ? "vercel-dark" : "vercel-light",
        );
        setIsEditorReady(true);

        const modifiedEditor = editor.getModifiedEditor();
        modifiedEditor.onDidChangeModelContent(() => {
            onModifiedChange(modifiedEditor.getValue());
        });
    };

    useEffect(() => {
        if (isEditorReady && monacoRef.current) {
            monacoRef.current.editor.setTheme(
                theme === "dark" ? "vercel-dark" : "vercel-light",
            );
        }
    }, [theme, isEditorReady]);

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            onModifiedChange(text);
            trackEvent("diff_paste_right", { length: text.length });
        } catch {
            // clipboard read may be denied; user can paste manually
        }
    };

    const handleClearRight = () => {
        onModifiedChange("");
        trackEvent("diff_clear");
    };

    return (
        <div className="bg-background flex size-full flex-col">
            <div className="border-border bg-muted/40 flex h-10 shrink-0 items-center justify-between gap-2 border-b px-4 text-xs">
                <div className="text-muted-foreground flex items-center gap-4">
                    <span className="font-medium">Left:</span>
                    <span>Current editor</span>
                    <span className="text-border">·</span>
                    <span className="font-medium">Right:</span>
                    <span>
                        Comparison ({modified.length.toLocaleString()} chars)
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePasteFromClipboard}
                    >
                        <HugeiconsIcon
                            icon={ClipboardPasteIcon}
                            className="size-3.5"
                        />
                        <span className="hidden sm:inline">Paste right</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearRight}
                        disabled={!modified}
                    >
                        <HugeiconsIcon icon={Trash2} className="size-3.5" />
                        <span className="hidden sm:inline">Clear right</span>
                    </Button>
                </div>
            </div>
            <div className="min-h-0 flex-1">
                <DiffEditor
                    height="100%"
                    language="json"
                    original={original}
                    modified={modified}
                    onMount={handleMount}
                    loading={<div className="bg-background size-full" />}
                    options={{
                        renderSideBySide: true,
                        originalEditable: false,
                        readOnly: false,
                        fontSize: 13,
                        fontFamily: "'Google Sans Code', monospace",
                        lineHeight: 24,
                        minimap: { enabled: false },
                        padding: { top: 16, bottom: 16 },
                        scrollBeyondLastLine: false,
                        renderLineHighlight: "all",
                        scrollbar: {
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10,
                        },
                    }}
                    theme={theme === "dark" ? "vercel-dark" : "vercel-light"}
                />
            </div>
        </div>
    );
}
