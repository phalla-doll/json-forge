"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckCircle, XCircle } from "@hugeicons/core-free-icons";
import type { EditorStats } from "@/types";

interface StatusBarProps {
  stats: EditorStats;
  error: string | null;
}

export function StatusBar({ stats, error }: StatusBarProps) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between bg-muted border-t border-border px-4 font-mono text-[11px] text-muted-foreground select-none z-10">
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-1.5 ${
            error ? "text-destructive" : "text-green-500"
          }`}
          title={error || "JSON syntax is valid"}
        >
          {error ? (
            <HugeiconsIcon icon={XCircle} className="size-3" />
          ) : (
            <HugeiconsIcon icon={CheckCircle} className="size-3" />
          )}
          <span className="font-medium">
            {error ? "Invalid JSON" : "Valid JSON"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div
          className="flex cursor-help items-center gap-2 transition-colors hover:text-foreground"
          title="Total number of lines"
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Lines
          </span>
          <span>{stats.lines}</span>
        </div>
        <div
          className="flex cursor-help items-center gap-2 transition-colors hover:text-foreground"
          title="Total character count"
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Chars
          </span>
          <span>{stats.chars}</span>
        </div>
        <div
          className="flex cursor-help items-center gap-2 transition-colors hover:text-foreground"
          title="Estimated file size"
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Size
          </span>
          <span>{stats.size}</span>
        </div>
      </div>
    </div>
  );
}
