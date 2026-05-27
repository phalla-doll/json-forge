import { HugeiconsIcon } from "@hugeicons/react";
import {
    Code,
    GitGraph,
    Table,
    GitCompareIcon,
    Loading03Icon,
} from "@hugeicons/core-free-icons";

const VIEW_PLACEHOLDERS = [
    { icon: Code, label: "Code", active: true },
    { icon: GitGraph, label: "Graph", active: false },
    { icon: Table, label: "Table", active: false },
    { icon: GitCompareIcon, label: "Diff", active: false },
];

export default function Loading() {
    return (
        <div className="bg-background text-foreground flex h-dvh flex-col font-sans">
            <header className="border-border bg-background/50 flex h-14 shrink-0 items-center border-b px-4 backdrop-blur-md md:px-6">
                <div className="flex items-center gap-3 overflow-hidden md:gap-4">
                    <div className="bg-foreground shrink-0 rounded-md p-1.5 shadow-sm">
                        <svg
                            viewBox="0 0 32 32"
                            className="text-background size-4"
                            aria-hidden="true"
                        >
                            <path
                                d="M13 6 C9 6 9 11 9 13 C9 15 6 16 6 16 C6 16 9 17 9 19 C9 21 9 26 13 26"
                                stroke="currentColor"
                                strokeWidth="2.75"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M19 6 C23 6 23 11 23 13 C23 15 26 16 26 16 C26 16 23 17 23 19 C23 21 23 26 19 26"
                                stroke="currentColor"
                                strokeWidth="2.75"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M16 11 L17.2 14.8 L21 16 L17.2 17.2 L16 21 L14.8 17.2 L11 16 L14.8 14.8 Z"
                                fill="#f59e0b"
                            />
                        </svg>
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <h1 className="truncate text-sm font-semibold tracking-wide">
                            JSON Forge
                        </h1>
                        <span className="text-muted-foreground hidden text-xs sm:block">
                            JSON editor & visualizer
                        </span>
                    </div>
                    <div className="bg-border mx-1 hidden h-6 w-px md:mx-2 md:block" />

                    <div
                        className="border-border bg-muted ml-2 inline-flex shrink-0 items-center rounded-md border p-px md:ml-0"
                        aria-hidden="true"
                    >
                        {VIEW_PLACEHOLDERS.map((view) => (
                            <span
                                key={view.label}
                                className={`inline-flex h-6 items-center gap-2 rounded px-2 text-xs md:px-3 ${
                                    view.active
                                        ? "bg-foreground text-background shadow-sm"
                                        : "text-muted-foreground"
                                }`}
                            >
                                <HugeiconsIcon
                                    icon={view.icon}
                                    className="size-3.5"
                                />
                                <span className="hidden sm:inline">
                                    {view.label}
                                </span>
                            </span>
                        ))}
                    </div>

                    <div
                        className="text-muted-foreground flex items-center gap-2 pl-1 text-xs"
                        role="status"
                        aria-live="polite"
                    >
                        <HugeiconsIcon
                            icon={Loading03Icon}
                            className="size-4 animate-spin"
                        />
                        <span className="hidden sm:inline">
                            Loading shared snapshot…
                        </span>
                    </div>
                </div>
            </header>

            <div className="border-border bg-background h-12 shrink-0 border-b" />

            <main className="bg-background flex-1" />
        </div>
    );
}
