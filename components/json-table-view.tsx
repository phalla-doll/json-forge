"use client";

import React, { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertTriangle,
  Filter,
  ChevronRight,
  Home,
  FolderOpen,
  ArrowLeft,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Download,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trackEvent, downloadBlob, toCsv } from "@/lib/utils";

interface JsonTableViewProps {
  value: string;
  searchTerm?: string;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type PathKey = string | number;

const VALUE_HEADER = "Value";

function resolvePath(
  root: JsonValue,
  path: PathKey[],
): { resolved: JsonValue | undefined; validPath: PathKey[] } {
  let curr: JsonValue | undefined = root;
  const validPath: PathKey[] = [];
  for (const key of path) {
    if (curr !== null && typeof curr === "object") {
      const nextVal: JsonValue | undefined = (
        curr as Record<string, JsonValue>
      )[String(key)];
      if (nextVal === undefined) break;
      curr = nextVal;
      validPath.push(key);
    } else {
      break;
    }
  }
  return { resolved: curr, validPath };
}

function renderCell(
  cellValue: JsonValue | undefined,
  onNavigate: (segments: PathKey[]) => void,
  targetPath?: PathKey[],
): React.ReactNode {
  if (cellValue === null) {
    return (
      <span className="text-red-500 text-[10px] font-bold opacity-70">
        null
      </span>
    );
  }
  if (cellValue === undefined) {
    return <span className="text-muted-foreground text-[10px] italic"></span>;
  }

  if (typeof cellValue === "object") {
    const isArray = Array.isArray(cellValue);
    const len = isArray ? cellValue.length : Object.keys(cellValue).length;
    const label = isArray ? `Array(${len})` : `Object(${len})`;

    return (
      <button
        onClick={() => targetPath && onNavigate(targetPath)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-border hover:bg-muted-foreground text-foreground text-[11px] font-medium transition-colors group border border-transparent hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HugeiconsIcon
          icon={FolderOpen}
          size={10}
          className="text-muted-foreground group-hover:text-foreground"
        />
        {label}
      </button>
    );
  }

  if (typeof cellValue === "boolean") {
    return (
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          cellValue
            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        }`}
      >
        {String(cellValue)}
      </span>
    );
  }

  if (typeof cellValue === "number") {
    return (
      <span className="text-orange-600 dark:text-orange-400 font-mono">
        {cellValue}
      </span>
    );
  }

  const str = String(cellValue);
  if (str.length > 80) {
    return (
      <span className="text-foreground" title={str}>
        {str.substring(0, 80)}...
      </span>
    );
  }
  if (str.length < 2048 && /^https?:\/\//i.test(str)) {
    let safeHref: string | null = null;
    try {
      const parsed = new URL(str);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        safeHref = parsed.toString();
      }
    } catch {
      safeHref = null;
    }
    if (safeHref) {
      return (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer ugc"
          className="text-blue-500 hover:underline"
        >
          {str}
        </a>
      );
    }
  }
  return <span className="text-foreground">{str}</span>;
}

interface BreadcrumbsProps {
  path: PathKey[];
  onReset: () => void;
  onClick: (index: number) => void;
}

function Breadcrumbs({ path, onReset, onClick }: BreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0 h-10">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            aria-label="Go to root"
            className={`size-7 ${
              path.length === 0 ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <HugeiconsIcon icon={Home} size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Root</TooltipContent>
      </Tooltip>
      {path.map((segment, idx) => (
        <React.Fragment key={idx}>
          <HugeiconsIcon
            icon={ChevronRight}
            size={12}
            className="text-muted-foreground shrink-0"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onClick(idx)}
            className={`h-6 px-1.5 text-xs ${
              idx === path.length - 1
                ? "text-foreground font-semibold bg-border"
                : "text-muted-foreground"
            }`}
          >
            {segment}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
}

type SortState = { column: string; direction: "asc" | "desc" } | null;

function compareValues(a: JsonValue | undefined, b: JsonValue | undefined): number {
  const undefA = a === undefined || a === null;
  const undefB = b === undefined || b === null;
  if (undefA && undefB) return 0;
  if (undefA) return 1;
  if (undefB) return -1;
  const ta = typeof a;
  const tb = typeof b;
  if (ta === "number" && tb === "number") return (a as number) - (b as number);
  if (ta === "boolean" && tb === "boolean") {
    return (a ? 1 : 0) - (b ? 1 : 0);
  }
  if (ta === "object" && tb === "object") {
    return JSON.stringify(a).length - JSON.stringify(b).length;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export const JsonTableView: React.FC<JsonTableViewProps> = ({
  value,
  searchTerm = "",
}) => {
  const [path, setPath] = useState<PathKey[]>([]);
  const [sort, setSort] = useState<SortState>(null);

  // Reset sort when navigating to a different table. Mirroring the
  // "store info from previous render" pattern used in json-tree-view.tsx:
  // React converges in one extra render without an effect.
  const [prevPath, setPrevPath] = useState(path);
  if (prevPath !== path) {
    setPrevPath(path);
    if (sort !== null) setSort(null);
  }

  const cycleSort = (column: string) => {
    setSort((prev) => {
      let next: SortState;
      if (!prev || prev.column !== column) {
        next = { column, direction: "asc" };
      } else if (prev.direction === "asc") {
        next = { column, direction: "desc" };
      } else {
        next = null;
      }
      if (next) trackEvent("table_sort_column", next);
      return next;
    });
  };

  const { rootData, error } = useMemo(() => {
    try {
      if (!value.trim()) return { rootData: null, error: null };
      const parsed = JSON.parse(value) as JsonValue;
      return { rootData: parsed, error: null };
    } catch (e) {
      return { rootData: null, error: (e as Error).message };
    }
  }, [value]);

  const { effectivePath, currentData } = useMemo(() => {
    if (rootData === null || rootData === undefined) {
      return { effectivePath: [] as PathKey[], currentData: rootData };
    }
    const { resolved, validPath } = resolvePath(rootData, path);
    return { effectivePath: validPath, currentData: resolved };
  }, [rootData, path]);

  const currentType: "array" | "object" | "primitive" | "null" = useMemo(() => {
    if (currentData === null) return "null";
    if (Array.isArray(currentData)) return "array";
    if (typeof currentData === "object") return "object";
    return "primitive";
  }, [currentData]);

  const headers = useMemo(() => {
    if (currentType !== "array") return [];
    const arr = currentData as JsonValue[];
    if (arr.length === 0) return [];

    const allKeys = new Set<string>();
    let hasPrimitives = false;

    arr.slice(0, 50).forEach((item) => {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        Object.keys(item).forEach((k) => allKeys.add(k));
      } else {
        hasPrimitives = true;
      }
    });

    const headerArray = Array.from(allKeys).sort();
    if (hasPrimitives || headerArray.length === 0) {
      headerArray.unshift(VALUE_HEADER);
    }
    return headerArray;
  }, [currentData, currentType]);

  const handleNavigate = (segments: PathKey[]) => {
    setPath((prev) => {
      const nextPath = [...prev, ...segments];
      trackEvent("table_navigate", { depth: nextPath.length });
      return nextPath;
    });
  };

  const handleBreadcrumbClick = (index: number) => {
    trackEvent("table_breadcrumb_click", { index });
    setPath((prev) => prev.slice(0, index + 1));
  };

  const handleReset = () => {
    trackEvent("table_reset_root");
    setPath([]);
  };
  const handleBack = () => {
    trackEvent("table_back");
    setPath((prev) => prev.slice(0, -1));
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive gap-4 p-8 text-center bg-background">
        <div className="bg-destructive/10 p-4 rounded-full">
          <HugeiconsIcon icon={AlertTriangle} size={32} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Invalid JSON</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Please fix errors in Code view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <Breadcrumbs
        path={effectivePath}
        onReset={handleReset}
        onClick={handleBreadcrumbClick}
      />

      <div className="flex-1 overflow-auto bg-background relative">
        {currentType === "array" &&
          (() => {
            const arr = currentData as JsonValue[];
            if (arr.length === 0) {
              return (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Empty Array
                </div>
              );
            }

            const indexed = arr.map((row, i) => ({ row, i }));
            const filtered = searchTerm
              ? indexed.filter(({ row }) =>
                  JSON.stringify(row)
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()),
                )
              : indexed;

            const sorted = sort
              ? [...filtered].sort((a, b) => {
                  const av =
                    typeof a.row === "object" &&
                    a.row !== null &&
                    !Array.isArray(a.row)
                      ? (a.row as Record<string, JsonValue>)[sort.column]
                      : sort.column === VALUE_HEADER
                        ? (a.row as JsonValue)
                        : undefined;
                  const bv =
                    typeof b.row === "object" &&
                    b.row !== null &&
                    !Array.isArray(b.row)
                      ? (b.row as Record<string, JsonValue>)[sort.column]
                      : sort.column === VALUE_HEADER
                        ? (b.row as JsonValue)
                        : undefined;
                  const cmp = compareValues(av, bv);
                  return sort.direction === "asc" ? cmp : -cmp;
                })
              : filtered;

            if (filtered.length === 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <HugeiconsIcon icon={Filter} size={24} />
                  <span>No matches</span>
                </div>
              );
            }

            const handleExportCsv = () => {
              const exportRows = sorted.map((entry) => entry.row);
              const csv = toCsv(exportRows, headers);
              downloadBlob(csv, "table.csv", "text/csv;charset=utf-8");
              trackEvent("table_export_csv", {
                rows: exportRows.length,
                columns: headers.length,
              });
            };

            return (
              <>
                <div className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-background px-3 py-2 border-b border-border">
                  <span className="text-[11px] text-muted-foreground">
                    {sorted.length.toLocaleString()} row
                    {sorted.length === 1 ? "" : "s"}
                    {sort && (
                      <>
                        {" "}· sorted by{" "}
                        <span className="font-semibold text-foreground">
                          {sort.column}
                        </span>{" "}
                        {sort.direction}
                      </>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    className="h-7"
                  >
                    <HugeiconsIcon icon={Download} className="size-3.5" />
                    <span className="hidden sm:inline">Export CSV</span>
                  </Button>
                </div>
                <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted shadow-sm">
                    <th className="p-2 border-b border-border font-medium text-muted-foreground text-[11px] uppercase tracking-wider w-12 text-center sticky left-0 bg-muted border-r">
                      #
                    </th>
                    {headers.map((h) => {
                      const isActive = sort?.column === h;
                      return (
                        <th
                          key={h}
                          className="p-0 border-b border-border font-medium text-muted-foreground text-[11px] uppercase tracking-wider min-w-[120px] whitespace-nowrap"
                        >
                          <button
                            type="button"
                            onClick={() => cycleSort(h)}
                            className={`flex w-full items-center justify-between gap-1 px-2 py-2 text-left hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              isActive ? "text-foreground" : ""
                            }`}
                            aria-label={`Sort by ${h}`}
                          >
                            <span>{h}</span>
                            {isActive && (
                              <HugeiconsIcon
                                icon={
                                  sort.direction === "asc"
                                    ? ArrowUp01Icon
                                    : ArrowDown01Icon
                                }
                                size={12}
                              />
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map(({ row, i: realIndex }) => (
                    <tr
                      key={realIndex}
                      className="hover:bg-muted/50 transition-colors group"
                    >
                      <td className="p-2 text-muted-foreground text-[11px] font-mono text-center border-r border-border bg-background sticky left-0 group-hover:bg-muted/50">
                        {realIndex + 1}
                      </td>
                      {headers.map((col) => {
                        const isRowObject =
                          typeof row === "object" &&
                          row !== null &&
                          !Array.isArray(row);
                        const val: JsonValue | undefined = isRowObject
                          ? (row as Record<string, JsonValue>)[col]
                          : col === VALUE_HEADER
                            ? (row as JsonValue)
                            : undefined;
                        return (
                          <td
                            key={`${realIndex}-${col}`}
                            className="p-2 font-mono text-xs align-top max-w-xs break-words"
                          >
                            {renderCell(
                              val,
                              handleNavigate,
                              col === VALUE_HEADER
                                ? [realIndex]
                                : [realIndex, col],
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            );
          })()}

        {currentType === "object" &&
          (() => {
            const obj = currentData as Record<string, JsonValue>;
            const keys = Object.keys(obj);
            if (keys.length === 0) {
              return (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Empty Object
                </div>
              );
            }

            const filteredKeys = searchTerm
              ? keys.filter(
                  (k) =>
                    k.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(obj[k])
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()),
                )
              : keys;

            if (filteredKeys.length === 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <HugeiconsIcon icon={Filter} size={24} />
                  <span>No matches</span>
                </div>
              );
            }

            return (
              <div className="flex justify-center p-4">
                <div className="w-full max-w-3xl border border-border rounded-lg overflow-hidden shadow-sm bg-background">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 border-b border-border font-medium text-muted-foreground text-[11px] uppercase tracking-wider w-1/3 border-r">
                          Key
                        </th>
                        <th className="p-2 border-b border-border font-medium text-muted-foreground text-[11px] uppercase tracking-wider">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredKeys.map((key) => (
                        <tr
                          key={key}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-2 font-semibold text-foreground font-mono text-xs align-top border-r border-border select-text">
                            {key}
                          </td>
                          <td className="p-2 font-mono text-xs align-top select-text">
                            {renderCell(obj[key], handleNavigate, [key])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        {currentType === "primitive" && (
          <div className="h-full flex flex-col items-center justify-center p-8 bg-background">
            <div className="bg-muted p-8 rounded-xl border border-border shadow-sm text-center max-w-md w-full relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="absolute top-4 left-4 size-7 text-muted-foreground"
                  >
                    <HugeiconsIcon icon={ArrowLeft} size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back</TooltipContent>
              </Tooltip>
              <div className="mb-4 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border pb-2">
                Value
              </div>
              <div className="text-xl font-mono text-foreground break-all select-all max-h-60 overflow-y-auto">
                {String(currentData)}
              </div>
              <div className="mt-4 pt-2 text-[10px] text-muted-foreground border-t border-border flex justify-between">
                <span>
                  Type:{" "}
                  <span className="font-semibold text-foreground">
                    {typeof currentData}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
