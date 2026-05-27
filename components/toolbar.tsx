"use client";

import { useRef, useEffect, useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PaintBrush04Icon,
    ArrowShrinkIcon,
    Copy,
    Download,
    Upload,
    Trash2,
    Search,
    Share05Icon,
    SortByDown01Icon,
    TextWrapIcon,
    ClipboardClockIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ToolbarProps {
    onFormat: () => void;
    onMinify: () => void;
    onSortKeys: () => void;
    onCopy: () => void;
    onClear: () => void;
    onDownload: () => void;
    onUpload: (file: File) => void;
    onShare: () => void;
    canShare: boolean;
    isSharing: boolean;
    hasContent: boolean;
    indentation: number | string;
    onIndentChange: (value: number | string) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSearchEnter: () => void;
    hasMatches: boolean | null;
    wordWrap: boolean;
    onWordWrapChange: (value: boolean) => void;
    readOnly?: boolean;
    onOpenRecents: () => void;
}

export function Toolbar({
    onFormat,
    onMinify,
    onSortKeys,
    onCopy,
    onClear,
    onDownload,
    onUpload,
    onShare,
    canShare,
    isSharing,
    hasContent,
    indentation,
    onIndentChange,
    searchTerm,
    onSearchChange,
    onSearchEnter,
    hasMatches,
    wordWrap,
    onWordWrapChange,
    readOnly = false,
    onOpenRecents,
}: ToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const shortcutLabel = useSyncExternalStore(
        () => () => {},
        () =>
            /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl+K",
        () => null,
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
            e.target.value = "";
        }
    };

    return (
        <div className="border-border bg-background flex h-12 shrink-0 items-center justify-between overflow-x-auto border-b px-4">
            <div className="flex min-w-max items-center gap-4">
                <div className="border-border flex items-center gap-2 border-r pr-4">
                    <Select
                        value={
                            indentation === "\t" ? "tab" : String(indentation)
                        }
                        onValueChange={(val) => {
                            onIndentChange(val === "tab" ? "\t" : Number(val));
                        }}
                        disabled={readOnly}
                    >
                        <SelectTrigger
                            size="sm"
                            className="h-7 w-20 text-xs lg:w-24"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2">
                                2 <span className="lg:hidden">Sp</span>
                                <span className="hidden lg:inline">Spaces</span>
                            </SelectItem>
                            <SelectItem value="4">
                                4 <span className="lg:hidden">Sp</span>
                                <span className="hidden lg:inline">Spaces</span>
                            </SelectItem>
                            <SelectItem value="tab">Tabs</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onFormat}
                        disabled={!hasContent || readOnly}
                    >
                        <HugeiconsIcon
                            icon={PaintBrush04Icon}
                            className="size-3.5"
                        />
                        <span className="hidden lg:inline">Prettify</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onMinify}
                        disabled={!hasContent || readOnly}
                    >
                        <HugeiconsIcon
                            icon={ArrowShrinkIcon}
                            className="size-3.5"
                        />
                        <span className="hidden lg:inline">Minify</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSortKeys}
                        disabled={!hasContent || readOnly}
                        title="Sort object keys alphabetically (deep)"
                    >
                        <HugeiconsIcon
                            icon={SortByDown01Icon}
                            className="size-3.5"
                        />
                        <span className="hidden lg:inline">Sort Keys</span>
                    </Button>

                    <Button
                        variant={wordWrap ? "default" : "outline"}
                        size="sm"
                        onClick={() => onWordWrapChange(!wordWrap)}
                        aria-pressed={wordWrap}
                        title={
                            wordWrap ? "Disable word wrap" : "Enable word wrap"
                        }
                    >
                        <HugeiconsIcon
                            icon={TextWrapIcon}
                            className="size-3.5"
                        />
                        <span className="hidden lg:inline">Wrap</span>
                    </Button>
                </div>

                <div className="border-border flex items-center gap-2 border-r pr-4">
                    <div className="relative">
                        <HugeiconsIcon
                            icon={Search}
                            className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                        />
                        <Input
                            ref={searchInputRef}
                            type="text"
                            placeholder={
                                shortcutLabel
                                    ? `Search... (${shortcutLabel})`
                                    : "Search..."
                            }
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onSearchEnter();
                                }
                            }}
                            className={`h-7 w-36 pl-8 text-xs transition-all focus:w-48 lg:focus:w-64 ${
                                hasMatches === false
                                    ? "border-destructive focus-visible:border-destructive"
                                    : ""
                            }`}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".json,.jsonl,.ndjson,.yaml,.yml,application/json,text/yaml"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={readOnly}
                    >
                        <HugeiconsIcon icon={Upload} className="size-3.5" />
                        <span className="hidden sm:inline">Import</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenRecents}
                        disabled={readOnly}
                        title="Recent local documents"
                    >
                        <HugeiconsIcon
                            icon={ClipboardClockIcon}
                            className="size-3.5"
                        />
                        <span className="hidden sm:inline">Recent</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDownload}
                        disabled={!hasContent}
                    >
                        <HugeiconsIcon icon={Download} className="size-3.5" />
                        <span className="hidden sm:inline">Export</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onShare}
                        disabled={!canShare || isSharing || readOnly}
                        title={
                            canShare
                                ? "Create a shareable link"
                                : "Editor is empty or invalid"
                        }
                    >
                        <HugeiconsIcon
                            icon={Share05Icon}
                            className="size-3.5"
                        />
                        <span className="hidden sm:inline">
                            {isSharing ? "Sharing…" : "Share"}
                        </span>
                    </Button>
                </div>
            </div>

            <div className="ml-4 flex min-w-max items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    disabled={!hasContent || readOnly}
                    className="text-muted-foreground hover:text-destructive"
                >
                    <HugeiconsIcon icon={Trash2} className="size-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                </Button>

                <Button size="sm" onClick={onCopy} disabled={!hasContent}>
                    <HugeiconsIcon icon={Copy} className="size-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                </Button>
            </div>
        </div>
    );
}
