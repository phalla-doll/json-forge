"use client";

import { useRef, useEffect, useState } from "react";
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
}

export function Toolbar({
  onFormat,
  onMinify,
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
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shortcutLabel, setShortcutLabel] = useState<string | null>(null);

  useEffect(() => {
    setShortcutLabel(
      /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl+K",
    );
  }, []);

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
    <div className="flex h-12 shrink-0 items-center justify-between overflow-x-auto border-b border-border bg-background px-4">
      <div className="flex items-center gap-4 min-w-max">
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <Select
            value={indentation === "\t" ? "tab" : String(indentation)}
            onValueChange={(val) => {
              onIndentChange(val === "tab" ? "\t" : Number(val));
            }}
          >
            <SelectTrigger size="sm" className="h-7 w-20 text-xs lg:w-24">
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
            disabled={!hasContent}
          >
            <HugeiconsIcon icon={PaintBrush04Icon} className="size-3.5" />
            <span className="hidden lg:inline">Prettify</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onMinify}
            disabled={!hasContent}
          >
            <HugeiconsIcon icon={ArrowShrinkIcon} className="size-3.5" />
            <span className="hidden lg:inline">Minify</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <div className="relative">
            <HugeiconsIcon
              icon={Search}
              className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={
                shortcutLabel ? `Search... (${shortcutLabel})` : "Search..."
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
            accept=".json,application/json"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <HugeiconsIcon icon={Upload} className="size-3.5" />
            <span className="hidden sm:inline">Import</span>
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
            disabled={!canShare || isSharing}
            title={
              canShare
                ? "Create a shareable link"
                : "Editor is empty or invalid"
            }
          >
            <HugeiconsIcon icon={Share05Icon} className="size-3.5" />
            <span className="hidden sm:inline">
              {isSharing ? "Sharing…" : "Share"}
            </span>
          </Button>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-2 min-w-max">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasContent}
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
