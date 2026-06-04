"use client";

import { useEffect, useRef } from "react";
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

function NumberPop({ value }: { value: string | number }) {
    const str = String(value);
    const chars = str.split("");
    const last = chars.length - 1;
    return (
        <span className="t-digit-group">
            {chars.map((ch, i) => {
                const stagger =
                    i === last - 1 ? "1" : i === last ? "2" : undefined;
                // Key on (index, char) so unchanged digits keep React identity
                // and skip the mount-driven CSS animation; only changed digits
                // remount and replay the pop-in.
                return (
                    <span
                        key={`${i}-${ch}`}
                        className="t-digit"
                        data-stagger={stagger}
                    >
                        {ch}
                    </span>
                );
            })}
        </span>
    );
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

    const shakeRef = useRef<HTMLDivElement>(null);
    const prevError = useRef<string | null>(error);
    useEffect(() => {
        // Shake on any transition into a (possibly new) error: null→error
        // and error-A→error-B both replay so distinct invalid states each
        // get acknowledged.
        const shouldShake = !!error && error !== prevError.current;
        prevError.current = error;
        const el = shakeRef.current;
        if (!el || !shouldShake) return;
        el.classList.remove("is-shaking");
        void el.offsetWidth;
        el.classList.add("is-shaking");
        const t = setTimeout(() => el.classList.remove("is-shaking"), 320);
        return () => clearTimeout(t);
    }, [error]);

    return (
        <div className="bg-muted border-border text-muted-foreground z-10 flex h-8 shrink-0 items-center justify-between border-t px-4 font-mono text-[11px] select-none">
            <div className="flex items-center gap-4">
                <div
                    ref={shakeRef}
                    className={`t-shake flex items-center gap-1.5 ${statusColor}`}
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
                    <NumberPop value={stats.lines} />
                </div>
                <div
                    className="hover:text-foreground flex cursor-help items-center gap-2 transition-colors"
                    title="Total character count"
                >
                    <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Chars
                    </span>
                    <NumberPop value={stats.chars} />
                </div>
                <div
                    className="hover:text-foreground flex cursor-help items-center gap-2 transition-colors"
                    title="Estimated file size"
                >
                    <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Size
                    </span>
                    <NumberPop value={stats.size} />
                </div>
            </div>
        </div>
    );
}
