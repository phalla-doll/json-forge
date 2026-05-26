"use client"

import { useRef, useEffect, useState } from "react"
import {
    Sparkles,
    Minimize2,
    Copy,
    Download,
    Upload,
    Trash2,
    Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

interface ToolbarProps {
    onFormat: () => void
    onMinify: () => void
    onCopy: () => void
    onClear: () => void
    onDownload: () => void
    onUpload: (file: File) => void
    hasContent: boolean
    indentation: number | string
    onIndentChange: (value: number | string) => void
    searchTerm: string
    onSearchChange: (value: string) => void
    onSearchEnter: () => void
    hasMatches: boolean | null
}

export function Toolbar({
    onFormat,
    onMinify,
    onCopy,
    onClear,
    onDownload,
    onUpload,
    hasContent,
    indentation,
    onIndentChange,
    searchTerm,
    onSearchChange,
    onSearchEnter,
    hasMatches,
}: ToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [shortcutLabel, setShortcutLabel] = useState("Ctrl+K")

    useEffect(() => {
        if (
            typeof navigator !== "undefined" &&
            /Mac|iPod|iPhone|iPad/.test(navigator.platform)
        ) {
            setShortcutLabel("⌘K")
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0])
            e.target.value = ""
        }
    }

    return (
        <div className="flex h-14 shrink-0 items-center justify-between overflow-x-auto border-b border-border bg-background px-4">
            <div className="flex items-center gap-4 min-w-max">
                <div className="flex items-center gap-2 pr-4 border-r border-border">
                    <Select
                        value={indentation === "\t" ? "tab" : String(indentation)}
                        onValueChange={(val) => {
                            onIndentChange(val === "tab" ? "\t" : Number(val))
                        }}
                    >
                        <SelectTrigger className="h-8 w-20 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2">2 Sp</SelectItem>
                            <SelectItem value="4">4 Sp</SelectItem>
                            <SelectItem value="tab">Tabs</SelectItem>
                        </SelectContent>
                    </Select>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onFormat}
                                disabled={!hasContent}
                            >
                                <Sparkles className="size-3.5" />
                                <span className="hidden lg:inline">Prettify</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Format JSON</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onMinify}
                                disabled={!hasContent}
                            >
                                <Minimize2 className="size-3.5" />
                                <span className="hidden lg:inline">Minify</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Minify JSON</TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex items-center gap-2 pr-4 border-r border-border">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            type="text"
                            placeholder={`Search... (${shortcutLabel})`}
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onSearchEnter()
                                }
                            }}
                            className={`h-8 w-24 pl-8 text-xs transition-all focus:w-48 lg:focus:w-64 ${
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
                        accept=".json,application/json"
                    />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="size-3.5" />
                                <span className="hidden sm:inline">Import</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Import File</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onDownload}
                                disabled={!hasContent}
                            >
                                <Download className="size-3.5" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download File</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="ml-4 flex items-center gap-2 min-w-max">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClear}
                            disabled={!hasContent}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="size-3.5" />
                            <span className="hidden sm:inline">Clear</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear All</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="sm" onClick={onCopy} disabled={!hasContent}>
                            <Copy className="size-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy to Clipboard</TooltipContent>
                </Tooltip>
            </div>
        </div>
    )
}
