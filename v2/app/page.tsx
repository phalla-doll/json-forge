"use client"

import { useState, useCallback, useEffect } from "react"
import {
    Braces,
    Code,
    GitGraph,
    Table,
    Sun,
    Moon,
    ExternalLink,
    UploadCloud,
    Sparkles,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Toolbar } from "@/components/toolbar"
import { StatusBar } from "@/components/status-bar"
import { JsonEditor } from "@/components/json-editor"
import { AiModal } from "@/components/ai-modal"
import { JsonTreeView } from "@/components/json-tree-view"
import { JsonTableView } from "@/components/json-table-view"
import {
    getStats,
    downloadFile,
    isValidJson,
    trackEvent,
} from "@/lib/utils"
import { generateJson, fixJson } from "@/lib/ai"
import type { EditorStats } from "@/types"

const INITIAL_DATA = {
    manufacturers: [
        {
            id: "bmw",
            name: "BMW Group",
            country: "Germany",
            isActive: true,
            foundedYear: 1916,
            website: "https://www.bmwgroup.com",
            rating: 4.6,
            lastUpdated: "2025-01-15T10:30:00Z",
            brands: [
                {
                    id: "bmw-brand",
                    name: "BMW",
                    isLuxury: true,
                    supportsEV: true,
                    models: [
                        {
                            id: "bmw-3-series",
                            name: "3 Series",
                            segment: "Sedan",
                            isDiscontinued: false,
                            releaseYears: [2021, 2022, 2023, 2024],
                            availableMarkets: ["US", "EU", "JP"],
                            defaultCurrency: "USD",
                        },
                    ],
                },
            ],
        },
    ],
}

type ViewMode = "code" | "graph" | "table"

export default function Page() {
    const { theme, setTheme } = useTheme()

    const [indentation, setIndentation] = useState<number | string>(4)
    const [jsonInput, setJsonInput] = useState<string>(
        JSON.stringify(INITIAL_DATA, null, 4)
    )
    const [debouncedInput, setDebouncedInput] = useState<string>(jsonInput)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
    const [searchTrigger, setSearchTrigger] = useState(0)
    const [searchMatchCount, setSearchMatchCount] = useState<number | null>(
        null
    )
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>("code")
    const [isDragging, setIsDragging] = useState(false)
    const [dragCounter, setDragCounter] = useState(0)
    const [isEditorReady, setIsEditorReady] = useState(false)
    const [isAiModalOpen, setIsAiModalOpen] = useState(false)
    const [isAiLoading, setIsAiLoading] = useState(false)

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedInput(jsonInput), 800)
        return () => clearTimeout(handler)
    }, [jsonInput])

    useEffect(() => {
        const handler = setTimeout(
            () => setDebouncedSearchTerm(searchTerm),
            300
        )
        return () => clearTimeout(handler)
    }, [searchTerm])

    useEffect(() => setSearchMatchCount(null), [searchTerm])
    useEffect(() => setSearchMatchCount(null), [viewMode])

    const stats: EditorStats = getStats(debouncedInput)

    useEffect(() => {
        if (!debouncedInput.trim()) {
            setError(null)
            return
        }
        if (isValidJson(debouncedInput)) {
            setError(null)
        } else {
            try {
                JSON.parse(debouncedInput)
            } catch (e) {
                setError((e as Error).message)
            }
        }
    }, [debouncedInput])

    const handleInputChange = (value: string) => {
        setJsonInput(value)
        if (!value) setError(null)
    }

    const handleIndentChange = (newIndent: number | string) => {
        trackEvent("change_indentation", {
            value: newIndent === "\t" ? "tab" : newIndent,
        })
        setIndentation(newIndent)
        if (jsonInput.trim() && isValidJson(jsonInput)) {
            try {
                const parsed = JSON.parse(jsonInput)
                const formatted = JSON.stringify(parsed, null, newIndent)
                setJsonInput(formatted)
                setDebouncedInput(formatted)
            } catch {
                // silent
            }
        }
    }

    const handleFormat = () => {
        trackEvent("click_prettify")
        try {
            if (!jsonInput.trim()) return
            const parsed = JSON.parse(jsonInput)
            const formatted = JSON.stringify(parsed, null, indentation)
            setJsonInput(formatted)
            setDebouncedInput(formatted)
            setError(null)
            toast.success("Formatted successfully")
        } catch (err) {
            setError((err as Error).message)
            toast.error("Invalid JSON format")
        }
    }

    const handleMinify = () => {
        trackEvent("click_minify")
        try {
            if (!jsonInput.trim()) return
            const parsed = JSON.parse(jsonInput)
            const minified = JSON.stringify(parsed)
            setJsonInput(minified)
            setDebouncedInput(minified)
            setError(null)
            toast.success("Minified successfully")
        } catch (err) {
            setError((err as Error).message)
            toast.error("Invalid JSON format")
        }
    }

    const handleCopy = async () => {
        trackEvent("click_copy")
        if (!jsonInput) return
        try {
            await navigator.clipboard.writeText(jsonInput)
            toast.success("Copied to clipboard")
        } catch {
            toast.error("Failed to copy to clipboard")
        }
    }

    const handleClear = () => {
        trackEvent("click_clear_attempt")
        if (!jsonInput) return
        if (jsonInput.length > 50) {
            if (!window.confirm("Are you sure you want to clear the editor?")) {
                trackEvent("click_clear_cancel")
                return
            }
        }
        trackEvent("click_clear_confirm")
        setJsonInput("")
        setDebouncedInput("")
        setError(null)
        toast.info("Editor cleared")
    }

    const handleDownload = () => {
        trackEvent("click_export")
        if (!jsonInput) return
        try {
            JSON.parse(jsonInput)
            downloadFile(jsonInput, "data.json")
            toast.success("File downloaded")
        } catch {
            if (window.confirm("The JSON is invalid. Save anyway?")) {
                trackEvent("click_export_invalid")
                downloadFile(jsonInput, "invalid-data.json")
            }
        }
    }

    const handleUpload = useCallback(
        (file: File) => {
            trackEvent("click_import", {
                file_type: file.type,
                size: file.size,
            })
            if (
                !file.name.toLowerCase().endsWith(".json") &&
                file.type !== "application/json"
            ) {
                toast.error(
                    "Invalid file type. Only .json files are allowed."
                )
                return
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.info("Large file detected. Graph view may be slow.")
            }
            const reader = new FileReader()
            reader.onload = (event) => {
                if (event.target?.result) {
                    const result = event.target.result as string
                    setJsonInput(result)
                    setDebouncedInput(result)
                    setError(null)
                    toast.success(`Loaded ${file.name}`)
                }
            }
            reader.onerror = () => toast.error("Failed to read file")
            reader.readAsText(file)
        },
        []
    )

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragCounter((c) => c + 1)
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true)
        }
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragCounter((c) => {
            const next = c - 1
            if (next === 0) setIsDragging(false)
            return next
        })
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        setDragCounter(0)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0])
        }
    }

    const handleAiGenerate = async (prompt: string) => {
        trackEvent("ai_generate")
        setIsAiLoading(true)
        try {
            const result = await generateJson(prompt)
            if (result) {
                const formatted = JSON.stringify(
                    JSON.parse(result),
                    null,
                    indentation
                )
                setJsonInput(formatted)
                setDebouncedInput(formatted)
                setError(null)
                toast.success("JSON generated successfully")
            }
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to generate JSON"
            )
        } finally {
            setIsAiLoading(false)
            setIsAiModalOpen(false)
        }
    }

    const handleAiFix = async () => {
        if (!error || !jsonInput.trim()) return
        trackEvent("ai_fix")
        setIsAiLoading(true)
        try {
            const result = await fixJson(jsonInput, error)
            if (result) {
                const formatted = JSON.stringify(
                    JSON.parse(result),
                    null,
                    indentation
                )
                setJsonInput(formatted)
                setDebouncedInput(formatted)
                setError(null)
                toast.success("JSON fixed successfully")
            }
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to fix JSON"
            )
        } finally {
            setIsAiLoading(false)
        }
    }

    return (
        <div
            className="flex h-dvh flex-col bg-background text-foreground font-sans selection:bg-accents-2"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/50 px-4 backdrop-blur-md md:px-6">
                <div className="flex items-center gap-3 overflow-hidden md:gap-4">
                    <div className="shrink-0 rounded-md bg-green-600 p-1.5 text-white shadow-sm">
                        <Braces className="size-4" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <h1 className="truncate text-sm font-semibold tracking-wide">
                            JSON Forge
                        </h1>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                            Open-source JSON visualizer
                        </span>
                    </div>
                    <div className="mx-1 hidden h-6 w-px bg-border md:mx-2 md:block" />

                    <ToggleGroup
                        type="single"
                        value={viewMode}
                        onValueChange={(val) => {
                            if (val) {
                                setViewMode(val as ViewMode)
                                trackEvent("switch_view", { mode: val })
                            }
                        }}
                        className="ml-2 shrink-0 rounded-md border border-border bg-muted p-0.5 md:ml-0"
                    >
                        <ToggleGroupItem
                            value="code"
                            className="gap-2 rounded px-2 text-xs data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm md:px-3"
                        >
                            <Code className="size-3.5" />
                            <span className="hidden sm:inline">Code</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="graph"
                            className="gap-2 rounded px-2 text-xs data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm md:px-3"
                        >
                            <GitGraph className="size-3.5" />
                            <span className="hidden sm:inline">Graph</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem
                            value="table"
                            className="gap-2 rounded px-2 text-xs data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm md:px-3"
                        >
                            <Table className="size-3.5" />
                            <span className="hidden sm:inline">Table</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                <div className="flex shrink-0 items-center gap-3 pl-2 md:gap-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (error) {
                                        handleAiFix()
                                    } else {
                                        setIsAiModalOpen(true)
                                    }
                                }}
                                className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                            >
                                <Sparkles className="size-3.5" />
                                <span className="hidden sm:inline">
                                    {error ? "AI Fix" : "AI Generate"}
                                </span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {error ? "Fix JSON with AI" : "Generate JSON with AI"}
                        </TooltipContent>
                    </Tooltip>

                    <button
                        onClick={() =>
                            setTheme(theme === "dark" ? "light" : "dark")
                        }
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        {theme === "dark" ? (
                            <Sun className="size-5" />
                        ) : (
                            <Moon className="size-5" />
                        )}
                    </button>
                    <a
                        href="https://github.com/phalla-doll/json-forge"
                        target="_blank"
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ExternalLink className="size-5" />
                    </a>
                </div>
            </header>

            <Toolbar
                onFormat={handleFormat}
                onMinify={handleMinify}
                onCopy={handleCopy}
                onClear={handleClear}
                onDownload={handleDownload}
                onUpload={handleUpload}
                hasContent={jsonInput.length > 0}
                indentation={indentation}
                onIndentChange={handleIndentChange}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSearchEnter={() => setSearchTrigger((p) => p + 1)}
                hasMatches={
                    searchMatchCount === null ? null : searchMatchCount > 0
                }
            />

            <main className="relative flex-1 min-h-0 bg-background">
                {isDragging && (
                    <div className="pointer-events-none absolute inset-0 z-50 m-4 flex animate-in fade-in flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground bg-background/80 backdrop-blur-sm duration-200">
                        <div className="mb-4 rounded-full bg-muted p-6">
                            <UploadCloud className="size-12" />
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
                        onReady={() =>
                            setTimeout(() => setIsEditorReady(true), 400)
                        }
                        searchTerm={debouncedSearchTerm}
                        theme={theme === "dark" ? "dark" : "light"}
                        onMatchCountChange={setSearchMatchCount}
                    />
                </div>

                {viewMode !== "code" && (
                    <div className="absolute inset-0">
                        {viewMode === "graph" ? (
                            <JsonTreeView
                                value={debouncedInput}
                                searchTerm={debouncedSearchTerm}
                                searchTrigger={searchTrigger}
                                onMatchCountChange={setSearchMatchCount}
                            />
                        ) : (
                            <JsonTableView
                                value={debouncedInput}
                                searchTerm={debouncedSearchTerm}
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
            />
        </div>
    )
}
