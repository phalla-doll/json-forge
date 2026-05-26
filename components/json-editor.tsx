"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  indentation: number | string;
  onReady?: () => void;
  searchTerm?: string;
  theme?: "light" | "dark";
  onMatchCountChange?: (count: number | null) => void;
}

const JsonEditorInner = dynamic(
  () => import("./json-editor-inner").then((mod) => mod.JsonEditorInner),
  { ssr: false, loading: () => <div className="size-full bg-background" /> },
) as ComponentType<EditorProps>;

export function JsonEditor(props: EditorProps) {
  return <JsonEditorInner {...props} />;
}
