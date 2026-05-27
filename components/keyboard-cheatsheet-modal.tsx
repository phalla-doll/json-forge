"use client";

import { useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { KeyboardIcon } from "@hugeicons/core-free-icons";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardCheatsheetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Binding = { keys: string[]; label: string };
type Section = { name: string; bindings: Binding[] };

function getModKey(): string {
    if (typeof navigator === "undefined") return "Ctrl";
    return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

const SECTIONS = (mod: string): Section[] => [
    {
        name: "Views",
        bindings: [
            { keys: [`${mod}`, "1"], label: "Code view" },
            { keys: [`${mod}`, "2"], label: "Graph view" },
            { keys: [`${mod}`, "3"], label: "Table view" },
            { keys: [`${mod}`, "4"], label: "Diff view" },
        ],
    },
    {
        name: "Editor",
        bindings: [
            { keys: [`${mod}`, "K"], label: "Focus search" },
            { keys: ["D"], label: "Toggle dark / light theme" },
        ],
    },
    {
        name: "Graph view",
        bindings: [
            { keys: ["+"], label: "Zoom in" },
            { keys: ["-"], label: "Zoom out" },
            { keys: ["0"], label: "Reset zoom" },
            { keys: ["↑", "↓", "←", "→"], label: "Pan" },
        ],
    },
    {
        name: "Help",
        bindings: [{ keys: ["?"], label: "Open this cheatsheet" }],
    },
];

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="border-border bg-muted text-foreground inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 font-mono text-[11px] font-semibold shadow-sm">
            {children}
        </kbd>
    );
}

export function KeyboardCheatsheetModal({
    isOpen,
    onClose,
}: KeyboardCheatsheetModalProps) {
    const mod = useSyncExternalStore(
        () => () => {},
        getModKey,
        () => "Ctrl",
    );

    const sections = SECTIONS(mod);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={KeyboardIcon} className="size-5" />
                        Keyboard shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Press <Kbd>?</Kbd> any time to reopen this list.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    {sections.map((section) => (
                        <div
                            key={section.name}
                            className="flex flex-col gap-1.5"
                        >
                            <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                                {section.name}
                            </h3>
                            <ul className="flex flex-col gap-1">
                                {section.bindings.map((b) => (
                                    <li
                                        key={b.label}
                                        className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm"
                                    >
                                        <span className="text-foreground">
                                            {b.label}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {b.keys.map((key, i) => (
                                                <Kbd key={i}>{key}</Kbd>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
