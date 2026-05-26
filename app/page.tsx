"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Code,
  GitGraph,
  Table,
  Sun,
  Moon,
  ExternalLink,
  CloudUpload,
  AiContentGenerator02Icon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/components/toolbar";
import { StatusBar } from "@/components/status-bar";
import { JsonEditor } from "@/components/json-editor";
import { AiModal } from "@/components/ai-modal";
import { JsonTreeView } from "@/components/json-tree-view";
import { JsonTableView } from "@/components/json-table-view";
import { getStats, downloadFile, isValidJson, trackEvent } from "@/lib/utils";
import { generateJson, fixJson } from "@/lib/ai";
import type { EditorStats } from "@/types";

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
};

type ViewMode = "code" | "graph" | "table";

export default function Page() {
  const { theme, setTheme } = useTheme();

  const [indentation, setIndentation] = useState<number | string>(4);
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(INITIAL_DATA, null, 4),
  );
  const [debouncedInput, setDebouncedInput] = useState<string>(jsonInput);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("code");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedInput(jsonInput), 800);
    return () => clearTimeout(handler);
  }, [jsonInput]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
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

  const handleUpload = useCallback((file: File) => {
    trackEvent("click_import", {
      file_type: file.type,
      size: file.size,
    });
    if (
      !file.name.toLowerCase().endsWith(".json") &&
      file.type !== "application/json"
    ) {
      toast.error("Invalid file type. Only .json files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.info("Large file detected. Graph view may be slow.");
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const result = event.target.result as string;
        setJsonInput(result);
        setDebouncedInput(result);
        toast.success(`Loaded ${file.name}`);
      }
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }, []);

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
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleAiGenerate = async (prompt: string) => {
    trackEvent("ai_generate");
    setIsAiLoading(true);
    try {
      const result = await generateJson(prompt);
      if (result) {
        const formatted = JSON.stringify(JSON.parse(result), null, indentation);
        setJsonInput(formatted);
        setDebouncedInput(formatted);
        toast.success("JSON generated successfully");
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

  const handleAiFix = async () => {
    if (!error || !jsonInput.trim()) return;
    trackEvent("ai_fix");
    setIsAiLoading(true);
    try {
      const result = await fixJson(jsonInput, error);
      if (result) {
        const formatted = JSON.stringify(JSON.parse(result), null, indentation);
        setJsonInput(formatted);
        setDebouncedInput(formatted);
        toast.success("JSON fixed successfully");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fix JSON");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div
      className="flex h-dvh flex-col bg-background text-foreground font-sans selection:bg-accents-2"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/50 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3 overflow-hidden md:gap-4">
          <div className="shrink-0 rounded-md bg-foreground p-1.5 shadow-sm">
            <svg
              viewBox="0 0 32 32"
              className="size-4 text-background"
              aria-hidden="true"
            >
              <path
                d="M12 7 C9 7 9 11 9 13 C9 15 7 16 7 16 C7 16 9 17 9 19 C9 21 9 25 12 25"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 7 C23 7 23 11 23 13 C23 15 25 16 25 16 C25 16 23 17 23 19 C23 21 23 25 20 25"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 11.5 L17 15 L20.5 16 L17 17 L16 20.5 L15 17 L11.5 16 L15 15 Z"
                fill="#f59e0b"
              />
            </svg>
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
            size="sm"
            value={viewMode}
            onValueChange={(val) => {
              if (val) {
                setViewMode(val as ViewMode);
                trackEvent("switch_view", { mode: val });
              }
            }}
            className="ml-2 shrink-0 rounded-md border border-border bg-muted p-0.5 md:ml-0"
          >
            <ToggleGroupItem
              value="code"
              aria-label="Code view"
              className="gap-2 rounded px-2 text-xs data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm md:px-3"
            >
              <HugeiconsIcon icon={Code} className="size-3.5" />
              <span className="hidden sm:inline">Code</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="graph"
              aria-label="Graph view"
              className="gap-2 rounded px-2 text-xs data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm md:px-3"
            >
              <HugeiconsIcon icon={GitGraph} className="size-3.5" />
              <span className="hidden sm:inline">Graph</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="table"
              aria-label="Table view"
              className="gap-2 rounded px-2 text-xs data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm md:px-3"
            >
              <HugeiconsIcon icon={Table} className="size-3.5" />
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
                    handleAiFix();
                  } else {
                    setIsAiModalOpen(true);
                  }
                }}
                className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
              >
                <HugeiconsIcon
                  icon={AiContentGenerator02Icon}
                  className="size-3.5"
                />
                <span className="hidden sm:inline">
                  {error ? "AI Fix" : "AI Generate"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {error ? "Fix JSON with AI" : "Generate JSON with AI"}
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <HugeiconsIcon icon={Sun} className="size-4" />
            ) : (
              <HugeiconsIcon icon={Moon} className="size-4" />
            )}
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <a
              href="https://github.com/phalla-doll/json-forge"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
            >
              <HugeiconsIcon icon={ExternalLink} className="size-4" />
            </a>
          </Button>
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
        hasMatches={searchMatchCount === null ? null : searchMatchCount > 0}
      />

      <main className="relative flex-1 min-h-0 bg-background">
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-50 m-4 flex animate-in fade-in flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground bg-background/80 backdrop-blur-sm duration-200">
            <div className="mb-4 rounded-full bg-muted p-6">
              <HugeiconsIcon icon={CloudUpload} className="size-12" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Drop JSON file here</h3>
            <p className="text-muted-foreground">Release to load content</p>
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
  );
}
