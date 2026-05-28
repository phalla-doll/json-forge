"use client";

import { useRef, useEffect, useState, useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PaintBrush04Icon,
    ArrowShrinkIcon,
    CheckCircle,
    Copy,
    Download,
    Upload,
    Trash2,
    Search,
    Share05Icon,
    SortByDown01Icon,
    TextWrapIcon,
    ClipboardClockIcon,
    MoreHorizontalIcon,
    CopyCheckIcon,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerTrigger,
    DrawerClose,
} from "@/components/ui/drawer";

interface ToolbarProps {
    onFormat: () => void;
    onMinify: () => void;
    onSortKeys: () => void;
    onCopy: () => Promise<boolean> | void;
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
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
    }, [copied]);

    const handleCopyClick = async () => {
        const result = await onCopy();
        if (result === true) setCopied(true);
    };
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

    const closeDrawer = () => setIsMoreOpen(false);

    const runAndClose = (fn: () => void) => () => {
        fn();
        closeDrawer();
    };

    return (
        <div className="border-border bg-background flex h-12 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".json,.jsonl,.ndjson,.yaml,.yml,application/json,text/yaml"
            />

            {/* ─── Mobile layout (< sm): compact row + drawer ─── */}
            <div className="flex w-full items-center gap-2 sm:hidden">
                <div className="relative min-w-0 flex-1">
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
                            if (e.key === "Enter") onSearchEnter();
                        }}
                        className={`h-7 w-full pl-8 text-xs ${
                            hasMatches === false
                                ? "border-destructive focus-visible:border-destructive"
                                : ""
                        }`}
                    />
                </div>

                <Button
                    size="sm"
                    onClick={handleCopyClick}
                    disabled={!hasContent}
                    aria-label={copied ? "Copied" : "Copy"}
                >
                    <HugeiconsIcon
                        icon={copied ? CopyCheckIcon : Copy}
                        className="size-3.5"
                    />
                </Button>

                <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
                    <DrawerTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            aria-label="More actions"
                        >
                            <HugeiconsIcon
                                icon={MoreHorizontalIcon}
                                className="size-3.5"
                            />
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Actions</DrawerTitle>
                            <DrawerDescription>
                                Format, transform, and share your JSON.
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="flex flex-col gap-5 px-4 pb-6">
                            <ToolbarSection title="Format">
                                <div className="grid grid-cols-2 gap-2">
                                    <DrawerAction
                                        icon={PaintBrush04Icon}
                                        label="Prettify"
                                        onClick={runAndClose(onFormat)}
                                        disabled={!hasContent || readOnly}
                                    />
                                    <DrawerAction
                                        icon={ArrowShrinkIcon}
                                        label="Minify"
                                        onClick={runAndClose(onMinify)}
                                        disabled={!hasContent || readOnly}
                                    />
                                    <DrawerAction
                                        icon={SortByDown01Icon}
                                        label="Sort Keys"
                                        onClick={runAndClose(onSortKeys)}
                                        disabled={!hasContent || readOnly}
                                    />
                                    <DrawerAction
                                        icon={TextWrapIcon}
                                        label={wordWrap ? "Wrap: On" : "Wrap"}
                                        onClick={() =>
                                            onWordWrapChange(!wordWrap)
                                        }
                                        active={wordWrap}
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <span className="text-muted-foreground text-xs">
                                        Indentation
                                    </span>
                                    <ToggleGroup
                                        type="single"
                                        size="sm"
                                        value={
                                            indentation === "\t"
                                                ? "tab"
                                                : String(indentation)
                                        }
                                        onValueChange={(val) => {
                                            if (!val) return;
                                            onIndentChange(
                                                val === "tab"
                                                    ? "\t"
                                                    : Number(val),
                                            );
                                        }}
                                        disabled={readOnly}
                                        className="border-border bg-muted rounded-md border p-px"
                                    >
                                        <ToggleGroupItem
                                            value="2"
                                            aria-label="2 spaces"
                                            className="data-[state=on]:bg-foreground data-[state=on]:text-background h-6 rounded-[calc(var(--radius-md)-1px)] px-2.5 text-xs data-[state=on]:shadow-sm"
                                        >
                                            2 Sp
                                        </ToggleGroupItem>
                                        <ToggleGroupItem
                                            value="4"
                                            aria-label="4 spaces"
                                            className="data-[state=on]:bg-foreground data-[state=on]:text-background h-6 rounded-[calc(var(--radius-md)-1px)] px-2.5 text-xs data-[state=on]:shadow-sm"
                                        >
                                            4 Sp
                                        </ToggleGroupItem>
                                        <ToggleGroupItem
                                            value="tab"
                                            aria-label="Tabs"
                                            className="data-[state=on]:bg-foreground data-[state=on]:text-background h-6 rounded-[calc(var(--radius-md)-1px)] px-2.5 text-xs data-[state=on]:shadow-sm"
                                        >
                                            Tab
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                </div>
                            </ToolbarSection>

                            <ToolbarSection title="File">
                                <div className="grid grid-cols-3 gap-2">
                                    <DrawerAction
                                        icon={Upload}
                                        label="Import"
                                        onClick={() => {
                                            fileInputRef.current?.click();
                                            closeDrawer();
                                        }}
                                        disabled={readOnly}
                                    />
                                    <DrawerAction
                                        icon={ClipboardClockIcon}
                                        label="Recent"
                                        onClick={runAndClose(onOpenRecents)}
                                        disabled={readOnly}
                                    />
                                    <DrawerAction
                                        icon={Download}
                                        label="Export"
                                        onClick={runAndClose(onDownload)}
                                        disabled={!hasContent}
                                    />
                                </div>
                            </ToolbarSection>

                            <ToolbarSection title="Share">
                                <DrawerAction
                                    icon={Share05Icon}
                                    label={isSharing ? "Sharing…" : "Share"}
                                    onClick={runAndClose(onShare)}
                                    disabled={
                                        !canShare || isSharing || readOnly
                                    }
                                    fullWidth
                                />
                            </ToolbarSection>

                            <div className="border-border border-t pt-3">
                                <DrawerClose asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClear}
                                        disabled={!hasContent || readOnly}
                                        className="text-muted-foreground hover:text-destructive w-full justify-center"
                                    >
                                        <HugeiconsIcon
                                            icon={Trash2}
                                            className="size-3.5"
                                        />
                                        Clear editor
                                    </Button>
                                </DrawerClose>
                            </div>
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>

            {/* ─── Desktop layout (sm+): full toolbar ─── */}
            <div className="hidden w-full items-center justify-between gap-4 overflow-x-auto overflow-y-clip sm:flex">
                <div className="flex min-w-max items-center gap-4">
                    <div className="border-border flex items-center gap-2 border-r pr-4">
                        <Select
                            value={
                                indentation === "\t"
                                    ? "tab"
                                    : String(indentation)
                            }
                            onValueChange={(val) => {
                                onIndentChange(
                                    val === "tab" ? "\t" : Number(val),
                                );
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
                                    <span className="hidden lg:inline">
                                        Spaces
                                    </span>
                                </SelectItem>
                                <SelectItem value="4">
                                    4 <span className="lg:hidden">Sp</span>
                                    <span className="hidden lg:inline">
                                        Spaces
                                    </span>
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
                                wordWrap
                                    ? "Disable word wrap"
                                    : "Enable word wrap"
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
                                className={`h-7 w-33 pl-8 text-xs transition-all focus:w-48 lg:focus:w-64 ${
                                    hasMatches === false
                                        ? "border-destructive focus-visible:border-destructive"
                                        : ""
                                }`}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={readOnly}
                        >
                            <HugeiconsIcon icon={Upload} className="size-3.5" />
                            <span className="hidden lg:inline">Import</span>
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
                            <span className="hidden lg:inline">Recent</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDownload}
                            disabled={!hasContent}
                        >
                            <HugeiconsIcon
                                icon={Download}
                                className="size-3.5"
                            />
                            <span className="hidden lg:inline">Export</span>
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
                            <span className="hidden lg:inline">
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
                        <span className="hidden lg:inline">Clear</span>
                    </Button>

                    <Button
                        size="sm"
                        onClick={handleCopyClick}
                        disabled={!hasContent}
                    >
                        <HugeiconsIcon
                            icon={copied ? CopyCheckIcon : Copy}
                            className="size-3.5"
                        />
                        <span className="hidden lg:inline">
                            {copied ? "Copied" : "Copy"}
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ToolbarSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {title}
            </h3>
            {children}
        </section>
    );
}

function DrawerAction({
    icon,
    label,
    onClick,
    disabled,
    active,
    fullWidth,
}: {
    icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
    label: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    fullWidth?: boolean;
}) {
    return (
        <Button
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            className={`h-10 justify-center gap-2 text-xs ${
                fullWidth ? "w-full" : ""
            }`}
        >
            <HugeiconsIcon icon={icon} className="size-3.5" />
            {label}
        </Button>
    );
}
