"use client";

import { useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { KeyboardIcon } from "@hugeicons/core-free-icons";
import {
    ResponsiveModal,
    ResponsiveModalBody,
    ResponsiveModalContent,
    ResponsiveModalDescription,
    ResponsiveModalHeader,
    ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

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
        <ResponsiveModal
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
        >
            <ResponsiveModalContent className="sm:max-w-lg">
                <ResponsiveModalHeader>
                    <ResponsiveModalTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={KeyboardIcon} className="size-5" />
                        Keyboard shortcuts
                    </ResponsiveModalTitle>
                    <ResponsiveModalDescription>
                        Press <Kbd>?</Kbd> any time to reopen this list.
                    </ResponsiveModalDescription>
                </ResponsiveModalHeader>

                <ResponsiveModalBody>
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
                                            <KbdGroup>
                                                {b.keys.map((key, i) => (
                                                    <Kbd key={i}>{key}</Kbd>
                                                ))}
                                            </KbdGroup>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <div className="border-border text-muted-foreground flex flex-col gap-2 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Built by{" "}
                                <a
                                    href="https://manthaa.dev/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-foreground font-medium underline-offset-4 transition-colors hover:underline"
                                >
                                    Manthaa
                                </a>
                                .
                            </span>
                            <a
                                href="https://github.com/phalla-doll/json-forge/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-foreground w-fit font-medium underline-offset-4 transition-colors hover:underline"
                            >
                                Request a feature or report an issue
                            </a>
                        </div>
                    </div>
                </ResponsiveModalBody>
            </ResponsiveModalContent>
        </ResponsiveModal>
    );
}
