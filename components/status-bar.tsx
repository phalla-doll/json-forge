"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    CheckCircle,
    XCircle,
    MinusSignCircleIcon,
} from "@hugeicons/core-free-icons";
import type { EditorStats } from "@/types";

interface StatusBarProps {
    stats: EditorStats;
    error: string | null;
}

export function StatusBar({ stats, error }: StatusBarProps) {
    const isEmpty = stats.chars === 0;
    const statusColor = error
        ? "text-destructive"
        : isEmpty
          ? "text-muted-foreground"
          : "text-green-500";
    const statusIcon = error
        ? XCircle
        : isEmpty
          ? MinusSignCircleIcon
          : CheckCircle;
    const statusLabel = error
        ? "Invalid JSON"
        : isEmpty
          ? "Empty"
          : "Valid JSON";
    const statusTitle = error
        ? error
        : isEmpty
          ? "Editor is empty"
          : "JSON syntax is valid";

    return (
        <div className="bg-muted border-border text-muted-foreground z-10 flex h-8 shrink-0 items-center justify-between border-t px-4 font-mono text-[11px] select-none">
            <div className="flex items-center gap-4">
                <div
                    className={`flex items-center gap-1.5 ${statusColor}`}
                    title={statusTitle}
                >
                    <HugeiconsIcon icon={statusIcon} className="size-3" />
                    <span className="font-medium">{statusLabel}</span>
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
                <div
                    className="hover:text-foreground flex cursor-help items-center gap-2 transition-colors"
                    title="Total number of lines"
                >
                    <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Lines
                    </span>
                    <span>{stats.lines}</span>
                </div>
                <div
                    className="hover:text-foreground flex cursor-help items-center gap-2 transition-colors"
                    title="Total character count"
                >
                    <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Chars
                    </span>
                    <span>{stats.chars}</span>
                </div>
                <div
                    className="hover:text-foreground flex cursor-help items-center gap-2 transition-colors"
                    title="Estimated file size"
                >
                    <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Size
                    </span>
                    <span>{stats.size}</span>
                </div>
            </div>
        </div>
    );
}
