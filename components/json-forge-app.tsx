"use client";

import {
    useState,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Code,
    GitGraph,
    Table,
    Sun,
    Moon,
    CloudUpload,
    AiContentGenerator02Icon,
    Share05Icon,
    X,
    HelpCircleIcon,
    GitCompareIcon,
    DocumentCodeIcon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/components/toolbar";
import { StatusBar } from "@/components/status-bar";
import { JsonEditor } from "@/components/json-editor";
import { AiModal } from "@/components/ai-modal";
import { ShareModal } from "@/components/share-modal";
import { JsonTreeView } from "@/components/json-tree-view";
import { JsonTableView } from "@/components/json-table-view";
import { JsonDiffView } from "@/components/json-diff-view";
import { KeyboardCheatsheetModal } from "@/components/keyboard-cheatsheet-modal";
import { SchemaModal } from "@/components/schema-modal";
import {
    getStats,
    downloadFile,
    isValidJson,
    trackEvent,
    sortKeysDeep,
} from "@/lib/utils";
import {
    parseJsonl,
    parseYaml,
    detectFormat,
    ConversionError,
} from "@/lib/converters";
import { generateJson, fixJson } from "@/lib/ai";
import { createShare, type ShareResult, type ShareOptions } from "@/lib/share";
import { saveCurrent, loadCurrent, pushRecent } from "@/lib/storage";
import { RecentDocsModal } from "@/components/recent-docs-modal";
import type { EditorStats } from "@/types";

type ViewMode = "code" | "graph" | "table" | "diff";

export type SharedSnapshotInfo = {
    createdAt: number;
    expiresAt: number;
    readOnly?: boolean;
};

type JsonForgeAppProps = {
    initialJson: string;
    sharedSnapshot?: SharedSnapshotInfo;
};

export function JsonForgeApp({
    initialJson,
    sharedSnapshot,
}: JsonForgeAppProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    const activeTheme = mounted ? (resolvedTheme ?? theme) : undefined;
    const isDarkTheme = activeTheme === "dark";

    const [indentation, setIndentation] = useState<number | string>(4);
    const [jsonInput, setJsonInput] = useState<string>(initialJson);
    const [debouncedInput, setDebouncedInput] = useState<string>(jsonInput);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [searchTrigger, setSearchTrigger] = useState(0);
    const [searchMatchCount, setSearchMatchCount] = useState<number | null>(
        null,
    );
    const [viewMode, setViewMode] = useState<ViewMode>("code");
    const [wordWrap, setWordWrap] = useState(false);
    const [diffRight, setDiffRight] = useState<string>("");
    const currentInputRef = useRef<string>(initialJson);
    useEffect(() => {
        currentInputRef.current = jsonInput;
    }, [jsonInput]);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiRemaining, setAiRemaining] = useState<number | null>(null);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isShareLoading, setIsShareLoading] = useState(false);
    const [shareResult, setShareResult] = useState<ShareResult | null>(null);
    const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
    const [isRecentsOpen, setIsRecentsOpen] = useState(false);
    const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedInput(jsonInput), 800);
        return () => clearTimeout(handler);
    }, [jsonInput]);

    const lastTrackedSearchRef = useRef<string>("");

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            const trimmed = searchTerm.trim();
            if (trimmed && trimmed !== lastTrackedSearchRef.current) {
                lastTrackedSearchRef.current = trimmed;
                trackEvent("search_used", { length: trimmed.length });
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const stats: EditorStats = useMemo(
        () => getStats(debouncedInput),
        [debouncedInput],
    );

    const error = useMemo<string | null>(() => {
        if (!debouncedInput.trim()) return null;
        try {
            JSON.parse(debouncedInput);
            return null;
        } catch (e) {
            return (e as Error).message;
        }
    }, [debouncedInput]);

    const previousErrorRef = useRef<string | null>(null);
    useEffect(() => {
        const handler = setTimeout(() => {
            if (error && error !== previousErrorRef.current) {
                trackEvent("invalid_json_observed");
            }
            previousErrorRef.current = error;
        }, 500);
        return () => clearTimeout(handler);
    }, [error]);

    // Restore last-saved document on mount (skip when viewing a shared snapshot
    // so that opening /s/<slug> doesn't overwrite the shared payload with the
    // local browser's previous work).
    const restoredRef = useRef(false);
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;
        if (sharedSnapshot) return;
        loadCurrent().then((saved) => {
            if (saved && saved !== initialJson) {
                setJsonInput(saved);
                setDebouncedInput(saved);
                trackEvent("autosave_restored", { size: saved.length });
            }
        });
    }, [sharedSnapshot, initialJson]);

    // Persist the current document on debounced changes. Skip for shared
    // snapshots so a viewer's local edits don't replace their saved doc.
    useEffect(() => {
        if (sharedSnapshot) return;
        saveCurrent(debouncedInput);
    }, [debouncedInput, sharedSnapshot]);

    useEffect(() => {
        const VIEW_KEYS: Record<string, ViewMode> = {
            "1": "code",
            "2": "graph",
            "3": "table",
            "4": "diff",
        };

        const isTypingTarget = (target: EventTarget | null) => {
            if (!(target instanceof HTMLElement)) return false;
            if (target.isContentEditable) return true;
            const tag = target.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                return true;
            }
            // Monaco renders into a contentEditable textarea inside .monaco-editor
            return !!target.closest(".monaco-editor");
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat) return;

            // Cmd/Ctrl + 1..4 — switch view (works even when editor has focus).
            if (
                (event.metaKey || event.ctrlKey) &&
                !event.altKey &&
                !event.shiftKey &&
                VIEW_KEYS[event.key]
            ) {
                event.preventDefault();
                const mode = VIEW_KEYS[event.key];
                setViewMode(mode);
                trackEvent("view_switch_hotkey", { mode });
                return;
            }

            // ? — open cheatsheet. Skip when typing.
            if (
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey &&
                event.key === "?" &&
                !isTypingTarget(event.target)
            ) {
                event.preventDefault();
                trackEvent("open_cheatsheet", { source: "hotkey" });
                setIsCheatsheetOpen(true);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const handleInputChange = (value: string) => {
        setJsonInput(value);
    };

    const handleIndentChange = (newIndent: number | string) => {
        trackEvent("change_indentation", {
            value: newIndent === "\t" ? "tab" : newIndent,
        });
        setIndentation(newIndent);
        if (jsonInput.trim() && isValidJson(jsonInput)) {
            try {
                const parsed = JSON.parse(jsonInput);
                const formatted = JSON.stringify(parsed, null, newIndent);
                setJsonInput(formatted);
                setDebouncedInput(formatted);
            } catch {
                // silent
            }
        }
    };

    const handleFormat = () => {
        trackEvent("click_prettify");
        try {
            if (!jsonInput.trim()) return;
            const parsed = JSON.parse(jsonInput);
            const formatted = JSON.stringify(parsed, null, indentation);
            setJsonInput(formatted);
            setDebouncedInput(formatted);
            toast.success("Formatted successfully");
        } catch {
            toast.error("Invalid JSON format");
        }
    };

    const handleMinify = () => {
        trackEvent("click_minify");
        try {
            if (!jsonInput.trim()) return;
            const parsed = JSON.parse(jsonInput);
            const minified = JSON.stringify(parsed);
            setJsonInput(minified);
            setDebouncedInput(minified);
            toast.success("Minified successfully");
        } catch {
            toast.error("Invalid JSON format");
        }
    };

    const handleSortKeys = () => {
        trackEvent("click_sort_keys");
        try {
            if (!jsonInput.trim()) return;
            const parsed = JSON.parse(jsonInput);
            const sorted = JSON.stringify(
                sortKeysDeep(parsed),
                null,
                indentation,
            );
            setJsonInput(sorted);
            setDebouncedInput(sorted);
            toast.success("Keys sorted alphabetically");
        } catch {
            toast.error("Invalid JSON format");
        }
    };

    const handleWordWrapChange = (next: boolean) => {
        trackEvent("toggle_word_wrap", { enabled: next });
        setWordWrap(next);
    };

    const handleCopy = async () => {
        trackEvent("click_copy");
        if (!jsonInput) return;
        try {
            await navigator.clipboard.writeText(jsonInput);
            toast.success("Copied to clipboard");
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    };

    const handleClear = () => {
        trackEvent("click_clear_attempt");
        if (!jsonInput) return;
        if (jsonInput.length > 50) {
            if (!window.confirm("Are you sure you want to clear the editor?")) {
                trackEvent("click_clear_cancel");
                return;
            }
        }
        trackEvent("click_clear_confirm");
        if (jsonInput.trim()) {
            void pushRecent(jsonInput);
        }
        setJsonInput("");
        setDebouncedInput("");
        toast.info("Editor cleared");
    };

    const handleDownload = () => {
        trackEvent("click_export");
        if (!jsonInput) return;
        try {
            JSON.parse(jsonInput);
            downloadFile(jsonInput, "data.json");
            toast.success("File downloaded");
        } catch {
            if (window.confirm("The JSON is invalid. Save anyway?")) {
                trackEvent("click_export_invalid");
                downloadFile(jsonInput, "invalid-data.json");
            }
        }
    };

    const handleUpload = useCallback(
        (file: File) => {
            const format = detectFormat(file.name);
            trackEvent("click_import", {
                file_type: file.type,
                size: file.size,
                format: format ?? "unknown",
            });
            if (!format) {
                toast.error(
                    "Unsupported file type. Use .json, .jsonl, .ndjson, .yaml, or .yml.",
                );
                return;
            }
            const MAX_FILE_BYTES = 25 * 1024 * 1024;
            if (file.size > MAX_FILE_BYTES) {
                toast.error("File too large. Maximum size is 25 MB.");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.info("Large file detected. Graph view may be slow.");
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                if (!event.target?.result) return;
                const rawText = event.target.result as string;
                try {
                    let parsed: string;
                    if (format === "json") {
                        parsed = rawText;
                    } else if (format === "jsonl") {
                        parsed = parseJsonl(rawText, indentation);
                    } else {
                        parsed = parseYaml(rawText, indentation);
                    }
                    // Archive the previous doc into recents before replacing it so the
                    // user can flip back to it.
                    if (currentInputRef.current.trim()) {
                        void pushRecent(currentInputRef.current);
                    }
                    setJsonInput(parsed);
                    setDebouncedInput(parsed);
                    toast.success(`Loaded ${file.name}`);
                } catch (err) {
                    const message =
                        err instanceof ConversionError
                            ? err.message
                            : err instanceof Error
                              ? err.message
                              : "Failed to parse file";
                    toast.error(
                        `Failed to parse ${format.toUpperCase()}: ${message}`,
                    );
                }
            };
            reader.onerror = () => toast.error("Failed to read file");
            reader.readAsText(file);
        },
        [indentation],
    );

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            trackEvent("drag_drop_import", {
                file_type: file.type,
                size: file.size,
            });
            handleUpload(file);
        }
    };

    const handleAiGenerate = async (prompt: string) => {
        trackEvent("ai_generate");
        setIsAiLoading(true);
        try {
            const { result, remaining } = await generateJson(prompt);
            setAiRemaining(remaining);
            if (remaining === 0) {
                trackEvent("ai_quota_exhausted", { endpoint: "generate" });
            }
            if (result) {
                try {
                    const formatted = JSON.stringify(
                        JSON.parse(result),
                        null,
                        indentation,
                    );
                    setJsonInput(formatted);
                    setDebouncedInput(formatted);
                    toast.success("JSON generated successfully");
                } catch {
                    setJsonInput(result);
                    setDebouncedInput(result);
                    toast.warning(
                        "Generated output wasn't valid JSON — loaded as-is.",
                    );
                }
            }
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to generate JSON",
            );
        } finally {
            setIsAiLoading(false);
            setIsAiModalOpen(false);
        }
    };

    const handleOpenShareModal = () => {
        if (!jsonInput.trim() || error || isShareLoading) return;
        setShareResult(null);
        setIsShareModalOpen(true);
    };

    const handleCreateShare = async (options: ShareOptions) => {
        if (!jsonInput.trim() || error || isShareLoading) return;
        trackEvent("share_create_attempt", {
            expires_in: options.expiresIn ?? "30d",
            read_only: options.readOnly === true,
        });
        setIsShareLoading(true);
        try {
            const result = await createShare(jsonInput, options);
            setShareResult(result);
            trackEvent("share_create_success", {
                expires_in: result.expiresIn,
                read_only: result.readOnly,
            });
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to create share link";
            toast.error(message);
            trackEvent("share_create_failure", { message });
            setIsShareModalOpen(false);
        } finally {
            setIsShareLoading(false);
        }
    };

    const handleAiFix = async () => {
        if (!error || !jsonInput.trim()) return;
        trackEvent("ai_fix");
        setIsAiLoading(true);
        try {
            const { result, remaining } = await fixJson(jsonInput, error);
            setAiRemaining(remaining);
            if (remaining === 0) {
                trackEvent("ai_quota_exhausted", { endpoint: "fix" });
            }
            if (result) {
                try {
                    const formatted = JSON.stringify(
                        JSON.parse(result),
                        null,
                        indentation,
                    );
                    setJsonInput(formatted);
                    setDebouncedInput(formatted);
                    toast.success("JSON fixed successfully");
                } catch {
                    toast.warning(
                        "AI returned non-JSON output — original kept.",
                    );
                }
            }
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to fix JSON",
            );
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div
            className="bg-background text-foreground selection:bg-accents-2 flex h-dvh flex-col font-sans"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <header className="border-border bg-background/50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 backdrop-blur-md sm:px-4 md:px-6">
                <div className="flex items-center gap-2 overflow-hidden sm:gap-3 md:gap-4">
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
                    <div className="hidden min-w-0 flex-col sm:flex">
                        <h1 className="truncate text-sm font-semibold tracking-wide">
                            JSON Forge
                        </h1>
                        <span className="text-muted-foreground hidden text-xs sm:block">
                            JSON editor & visualizer
                        </span>
                    </div>
                    <div className="bg-border mx-1 hidden h-6 w-px md:mx-2 md:block" />

                    <ToggleGroup
                        type="single"
                        size="sm"
                        value={viewMode}
                        onValueChange={(val) => {
                            if (val) {
                                setViewMode(val as ViewMode);
                                trackEvent("switch_view", { mode: val });
                            }
                        }}
                        className="border-border bg-muted shrink-0 rounded-md border p-px sm:ml-2 md:ml-0"
                    >
                        <ToggleGroupItem
                            value="code"
                            aria-label="Code view"
                            className="data-[state=on]:bg-foreground data-[state=on]:text-background h-6 gap-2 rounded-[calc(var(--radius-md)-1px)] px-2 text-xs data-[state=on]:shadow-sm md:px-3"
                        >
                            <HugeiconsIcon icon={Code} className="size-3.5" />
                            <span className="hidden sm:inline">Code</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="graph"
                            aria-label="Graph view"
                            className="data-[state=on]:bg-foreground data-[state=on]:text-background h-6 gap-2 rounded-[calc(var(--radius-md)-1px)] px-2 text-xs data-[state=on]:shadow-sm md:px-3"
                        >
                            <HugeiconsIcon
                                icon={GitGraph}
                                className="size-3.5"
                            />
                            <span className="hidden sm:inline">Graph</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="table"
                            aria-label="Table view"
                            className="data-[state=on]:bg-foreground data-[state=on]:text-background h-6 gap-2 rounded-[calc(var(--radius-md)-1px)] px-2 text-xs data-[state=on]:shadow-sm md:px-3"
                        >
                            <HugeiconsIcon icon={Table} className="size-3.5" />
                            <span className="hidden sm:inline">Table</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="diff"
                            aria-label="Diff view"
                            className="data-[state=on]:bg-foreground data-[state=on]:text-background h-6 gap-2 rounded-[calc(var(--radius-md)-1px)] px-2 text-xs data-[state=on]:shadow-sm md:px-3"
                        >
                            <HugeiconsIcon
                                icon={GitCompareIcon}
                                className="size-3.5"
                            />
                            <span className="hidden sm:inline">Diff</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (error) {
                                handleAiFix();
                            } else {
                                setIsAiModalOpen(true);
                            }
                        }}
                        disabled={sharedSnapshot?.readOnly === true}
                        className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                    >
                        <HugeiconsIcon
                            icon={AiContentGenerator02Icon}
                            className="size-3.5"
                        />
                        <span className="hidden sm:inline">
                            {error
                                ? `AI Fix${aiRemaining !== null ? ` (${aiRemaining}/5)` : ""}`
                                : `Generate JSON${aiRemaining !== null ? ` (${aiRemaining}/5)` : ""}`}
                        </span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSchemaModalOpen(true)}
                        disabled={!jsonInput.trim() || !!error}
                        title={
                            error
                                ? "Fix JSON first to generate a schema"
                                : "Generate a TypeScript / Zod / JSON Schema from current JSON"
                        }
                    >
                        <HugeiconsIcon
                            icon={DocumentCodeIcon}
                            className="size-3.5"
                        />
                        <span className="hidden md:inline">Schema</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const next = isDarkTheme ? "light" : "dark";
                            trackEvent("theme_toggle", {
                                source: "button",
                                next,
                            });
                            setTheme(next);
                        }}
                        aria-label={
                            mounted
                                ? isDarkTheme
                                    ? "Switch to light mode"
                                    : "Switch to dark mode"
                                : "Toggle theme"
                        }
                        className="text-muted-foreground hover:text-foreground"
                        suppressHydrationWarning
                    >
                        <span suppressHydrationWarning>
                            {mounted ? (
                                isDarkTheme ? (
                                    <HugeiconsIcon
                                        icon={Sun}
                                        className="size-4"
                                    />
                                ) : (
                                    <HugeiconsIcon
                                        icon={Moon}
                                        className="size-4"
                                    />
                                )
                            ) : (
                                <span
                                    className="block size-4"
                                    aria-hidden="true"
                                />
                            )}
                        </span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            trackEvent("open_cheatsheet", { source: "button" });
                            setIsCheatsheetOpen(true);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Keyboard shortcuts"
                        title="Keyboard shortcuts (?)"
                    >
                        <HugeiconsIcon
                            icon={HelpCircleIcon}
                            className="size-4"
                        />
                    </Button>
                </div>
            </header>

            {sharedSnapshot && !bannerDismissed && (
                <SharedSnapshotBanner
                    info={sharedSnapshot}
                    onDismiss={() => setBannerDismissed(true)}
                />
            )}

            <Toolbar
                onFormat={handleFormat}
                onMinify={handleMinify}
                onSortKeys={handleSortKeys}
                onCopy={handleCopy}
                onClear={handleClear}
                onDownload={handleDownload}
                onUpload={handleUpload}
                onShare={handleOpenShareModal}
                canShare={jsonInput.trim().length > 0 && !error}
                isSharing={isShareLoading}
                hasContent={jsonInput.length > 0}
                indentation={indentation}
                onIndentChange={handleIndentChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSearchEnter={() => setSearchTrigger((p) => p + 1)}
                hasMatches={
                    searchMatchCount === null ? null : searchMatchCount > 0
                }
                wordWrap={wordWrap}
                onWordWrapChange={handleWordWrapChange}
                readOnly={sharedSnapshot?.readOnly === true}
                onOpenRecents={() => setIsRecentsOpen(true)}
            />

            <main className="bg-background relative min-h-0 flex-1">
                {isDragging && (
                    <div className="animate-in fade-in border-muted-foreground bg-background/80 pointer-events-none absolute inset-0 z-50 m-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed backdrop-blur-sm duration-200">
                        <div className="bg-muted mb-4 rounded-full p-6">
                            <HugeiconsIcon
                                icon={CloudUpload}
                                className="size-12"
                            />
                        </div>
                        <h3 className="mb-2 text-xl font-bold">
                            Drop JSON file here
                        </h3>
                        <p className="text-muted-foreground">
                            Release to load content
                        </p>
                    </div>
                )}

                <div
                    className={`absolute inset-0 ${
                        viewMode === "code" ? "block" : "hidden"
                    }`}
                >
                    <JsonEditor
                        value={jsonInput}
                        onChange={handleInputChange}
                        error={error}
                        indentation={indentation}
                        searchTerm={debouncedSearchTerm}
                        theme={isDarkTheme ? "dark" : "light"}
                        onMatchCountChange={setSearchMatchCount}
                        wordWrap={wordWrap}
                        readOnly={sharedSnapshot?.readOnly === true}
                    />
                </div>

                {viewMode !== "code" && (
                    <div className="absolute inset-0">
                        {viewMode === "graph" && (
                            <JsonTreeView
                                value={debouncedInput}
                                searchTerm={debouncedSearchTerm}
                                searchTrigger={searchTrigger}
                                onMatchCountChange={setSearchMatchCount}
                            />
                        )}
                        {viewMode === "table" && (
                            <JsonTableView
                                value={debouncedInput}
                                searchTerm={debouncedSearchTerm}
                            />
                        )}
                        {viewMode === "diff" && (
                            <JsonDiffView
                                original={debouncedInput}
                                modified={diffRight}
                                onModifiedChange={setDiffRight}
                                theme={isDarkTheme ? "dark" : "light"}
                            />
                        )}
                    </div>
                )}
            </main>

            <StatusBar stats={stats} error={error} />

            <AiModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onGenerate={handleAiGenerate}
                isLoading={isAiLoading}
                remaining={aiRemaining}
            />

            <ShareModal
                key={shareResult?.slug ?? "pending"}
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                isLoading={isShareLoading}
                result={shareResult}
                onCreate={handleCreateShare}
            />

            <KeyboardCheatsheetModal
                isOpen={isCheatsheetOpen}
                onClose={() => setIsCheatsheetOpen(false)}
            />

            <RecentDocsModal
                isOpen={isRecentsOpen}
                onClose={() => setIsRecentsOpen(false)}
                onOpen={(text) => {
                    if (currentInputRef.current.trim()) {
                        void pushRecent(currentInputRef.current);
                    }
                    setJsonInput(text);
                    setDebouncedInput(text);
                    toast.success("Recent document loaded");
                }}
            />

            <SchemaModal
                isOpen={isSchemaModalOpen}
                onClose={() => setIsSchemaModalOpen(false)}
                json={jsonInput}
                remaining={aiRemaining}
                onRemainingChange={setAiRemaining}
            />
        </div>
    );
}

function SharedSnapshotBanner({
    info,
    onDismiss,
}: {
    info: SharedSnapshotInfo;
    onDismiss: () => void;
}) {
    // Dates are formatted with the client's locale, so SSR and CSR can disagree.
    // suppressHydrationWarning lets the client's rendered text win without React
    // flagging a hydration mismatch.
    const createdText = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(info.createdAt));
    const expiresText = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(info.expiresAt));

    return (
        <div
            role="status"
            className="border-border flex shrink-0 items-center justify-between gap-3 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 md:px-6 dark:text-amber-300"
        >
            <div className="flex items-center gap-2">
                <HugeiconsIcon
                    icon={Share05Icon}
                    className="size-3.5 shrink-0"
                />
                <span suppressHydrationWarning>
                    {info.readOnly ? (
                        <>
                            <strong>View-only</strong> snapshot from{" "}
                            <strong>{createdText}</strong>. Expires{" "}
                            {expiresText}. The creator disabled editing.
                        </>
                    ) : (
                        <>
                            Viewing a shared snapshot from{" "}
                            <strong>{createdText}</strong>. Expires{" "}
                            {expiresText}. Edits stay local — they won&apos;t
                            update the shared link.
                        </>
                    )}
                </span>
            </div>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss banner"
                className="shrink-0 rounded-md p-1 text-amber-700/70 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-300/70 dark:hover:text-amber-300"
            >
                <HugeiconsIcon icon={X} className="size-3.5" />
            </button>
        </div>
    );
}
