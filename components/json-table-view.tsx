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
            <span className="text-[10px] font-bold text-red-500 opacity-70">
                null
            </span>
        );
    }
    if (cellValue === undefined) {
        return (
            <span className="text-muted-foreground text-[10px] italic"></span>
        );
    }

    if (typeof cellValue === "object") {
        const isArray = Array.isArray(cellValue);
        const len = isArray ? cellValue.length : Object.keys(cellValue).length;
        const label = isArray ? `Array(${len})` : `Object(${len})`;

        return (
            <button
                onClick={() => targetPath && onNavigate(targetPath)}
                className="bg-border hover:bg-muted-foreground text-foreground group hover:border-muted-foreground focus-visible:ring-ring flex items-center gap-1.5 rounded border border-transparent px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    cellValue
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}
            >
                {String(cellValue)}
            </span>
        );
    }

    if (typeof cellValue === "number") {
        return (
            <span className="font-mono text-orange-600 dark:text-orange-400">
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
        <div className="border-border bg-muted scrollbar-hide flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b px-4 py-2 whitespace-nowrap">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onReset}
                        aria-label="Go to root"
                        className={`size-7 ${
                            path.length === 0
                                ? "text-foreground"
                                : "text-muted-foreground"
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
                                ? "text-foreground bg-border font-semibold"
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

function compareValues(
    a: JsonValue | undefined,
    b: JsonValue | undefined,
): number {
    const undefA = a === undefined || a === null;
    const undefB = b === undefined || b === null;
    if (undefA && undefB) return 0;
    if (undefA) return 1;
    if (undefB) return -1;
    const ta = typeof a;
    const tb = typeof b;
    if (ta === "number" && tb === "number")
        return (a as number) - (b as number);
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

    const currentType: "array" | "object" | "primitive" | "null" =
        useMemo(() => {
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

        // Scan every row: sparse arrays (typical of API dumps where new fields
        // appear in later items) used to lose columns past row 50.
        for (const item of arr) {
            if (
                typeof item === "object" &&
                item !== null &&
                !Array.isArray(item)
            ) {
                Object.keys(item).forEach((k) => allKeys.add(k));
            } else {
                hasPrimitives = true;
            }
        }

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
            <div className="text-destructive bg-background flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="bg-destructive/10 rounded-full p-4">
                    <HugeiconsIcon icon={AlertTriangle} size={32} />
                </div>
                <div>
                    <h3 className="mb-2 text-lg font-medium">Invalid JSON</h3>
                    <p className="text-muted-foreground max-w-md text-sm">
                        Please fix errors in Code view.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background flex h-full w-full flex-col">
            <Breadcrumbs
                path={effectivePath}
                onReset={handleReset}
                onClick={handleBreadcrumbClick}
            />

            <div className="bg-background relative flex-1 overflow-auto">
                {currentType === "array" &&
                    (() => {
                        const arr = currentData as JsonValue[];
                        if (arr.length === 0) {
                            return (
                                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
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
                                          ? (
                                                a.row as Record<
                                                    string,
                                                    JsonValue
                                                >
                                            )[sort.column]
                                          : sort.column === VALUE_HEADER
                                            ? (a.row as JsonValue)
                                            : undefined;
                                  const bv =
                                      typeof b.row === "object" &&
                                      b.row !== null &&
                                      !Array.isArray(b.row)
                                          ? (
                                                b.row as Record<
                                                    string,
                                                    JsonValue
                                                >
                                            )[sort.column]
                                          : sort.column === VALUE_HEADER
                                            ? (b.row as JsonValue)
                                            : undefined;
                                  const cmp = compareValues(av, bv);
                                  return sort.direction === "asc" ? cmp : -cmp;
                              })
                            : filtered;

                        if (filtered.length === 0) {
                            return (
                                <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2">
                                    <HugeiconsIcon icon={Filter} size={24} />
                                    <span>No matches</span>
                                </div>
                            );
                        }

                        const handleExportCsv = () => {
                            const exportRows = sorted.map((entry) => entry.row);
                            const csv = toCsv(exportRows, headers);
                            downloadBlob(
                                csv,
                                "table.csv",
                                "text/csv;charset=utf-8",
                            );
                            trackEvent("table_export_csv", {
                                rows: exportRows.length,
                                columns: headers.length,
                            });
                        };

                        return (
                            <>
                                <div className="bg-background border-border sticky top-0 z-20 flex items-center justify-between gap-2 border-b px-3 py-2">
                                    <span className="text-muted-foreground text-[11px]">
                                        {sorted.length.toLocaleString()} row
                                        {sorted.length === 1 ? "" : "s"}
                                        {sort && (
                                            <>
                                                {" "}
                                                · sorted by{" "}
                                                <span className="text-foreground font-semibold">
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
                                        <HugeiconsIcon
                                            icon={Download}
                                            className="size-3.5"
                                        />
                                        <span className="hidden sm:inline">
                                            Export CSV
                                        </span>
                                    </Button>
                                </div>
                                <table className="w-full border-collapse text-left">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-muted shadow-sm">
                                            <th className="border-border text-muted-foreground bg-muted sticky left-0 w-12 border-r border-b p-2 text-center text-[11px] font-medium tracking-wider uppercase">
                                                #
                                            </th>
                                            {headers.map((h) => {
                                                const isActive =
                                                    sort?.column === h;
                                                return (
                                                    <th
                                                        key={h}
                                                        className="border-border text-muted-foreground min-w-[120px] border-b p-0 text-[11px] font-medium tracking-wider whitespace-nowrap uppercase"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                cycleSort(h)
                                                            }
                                                            className={`hover:bg-border focus-visible:ring-ring flex w-full items-center justify-between gap-1 px-2 py-2 text-left focus-visible:ring-2 focus-visible:outline-none ${
                                                                isActive
                                                                    ? "text-foreground"
                                                                    : ""
                                                            }`}
                                                            aria-label={`Sort by ${h}`}
                                                        >
                                                            <span>{h}</span>
                                                            {isActive && (
                                                                <HugeiconsIcon
                                                                    icon={
                                                                        sort.direction ===
                                                                        "asc"
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
                                    <tbody className="divide-border divide-y">
                                        {sorted.map(({ row, i: realIndex }) => (
                                            <tr
                                                key={realIndex}
                                                className="hover:bg-muted/50 group transition-colors"
                                            >
                                                <td className="text-muted-foreground border-border bg-background group-hover:bg-muted/50 sticky left-0 border-r p-2 text-center font-mono text-[11px]">
                                                    {realIndex + 1}
                                                </td>
                                                {headers.map((col) => {
                                                    const isRowObject =
                                                        typeof row ===
                                                            "object" &&
                                                        row !== null &&
                                                        !Array.isArray(row);
                                                    const val:
                                                        | JsonValue
                                                        | undefined =
                                                        isRowObject
                                                            ? (
                                                                  row as Record<
                                                                      string,
                                                                      JsonValue
                                                                  >
                                                              )[col]
                                                            : col ===
                                                                VALUE_HEADER
                                                              ? (row as JsonValue)
                                                              : undefined;
                                                    return (
                                                        <td
                                                            key={`${realIndex}-${col}`}
                                                            className="max-w-xs p-2 align-top font-mono text-xs break-words"
                                                        >
                                                            {renderCell(
                                                                val,
                                                                handleNavigate,
                                                                col ===
                                                                    VALUE_HEADER
                                                                    ? [
                                                                          realIndex,
                                                                      ]
                                                                    : [
                                                                          realIndex,
                                                                          col,
                                                                      ],
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
                                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                                    Empty Object
                                </div>
                            );
                        }

                        const filteredKeys = searchTerm
                            ? keys.filter(
                                  (k) =>
                                      k
                                          .toLowerCase()
                                          .includes(searchTerm.toLowerCase()) ||
                                      String(obj[k])
                                          .toLowerCase()
                                          .includes(searchTerm.toLowerCase()),
                              )
                            : keys;

                        if (filteredKeys.length === 0) {
                            return (
                                <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2">
                                    <HugeiconsIcon icon={Filter} size={24} />
                                    <span>No matches</span>
                                </div>
                            );
                        }

                        return (
                            <div className="flex justify-center p-4">
                                <div className="border-border bg-background w-full max-w-3xl overflow-hidden rounded-lg border shadow-sm">
                                    <table className="w-full border-collapse text-left">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="border-border text-muted-foreground w-1/3 border-r border-b p-2 text-[11px] font-medium tracking-wider uppercase">
                                                    Key
                                                </th>
                                                <th className="border-border text-muted-foreground border-b p-2 text-[11px] font-medium tracking-wider uppercase">
                                                    Value
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-border divide-y">
                                            {filteredKeys.map((key) => (
                                                <tr
                                                    key={key}
                                                    className="hover:bg-muted/50 transition-colors"
                                                >
                                                    <td className="text-foreground border-border border-r p-2 align-top font-mono text-xs font-semibold select-text">
                                                        {key}
                                                    </td>
                                                    <td className="p-2 align-top font-mono text-xs select-text">
                                                        {renderCell(
                                                            obj[key],
                                                            handleNavigate,
                                                            [key],
                                                        )}
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
                    <div className="bg-background flex h-full flex-col items-center justify-center p-8">
                        <div className="bg-muted border-border relative w-full max-w-md rounded-xl border p-8 text-center shadow-sm">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleBack}
                                        aria-label="Go back"
                                        className="text-muted-foreground absolute top-4 left-4 size-7"
                                    >
                                        <HugeiconsIcon
                                            icon={ArrowLeft}
                                            size={16}
                                        />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Back</TooltipContent>
                            </Tooltip>
                            <div className="text-muted-foreground border-border mb-4 border-b pb-2 text-xs font-semibold tracking-wider uppercase">
                                Value
                            </div>
                            <div className="text-foreground max-h-60 overflow-y-auto font-mono text-xl break-all select-all">
                                {String(currentData)}
                            </div>
                            <div className="text-muted-foreground border-border mt-4 flex justify-between border-t pt-2 text-[10px]">
                                <span>
                                    Type:{" "}
                                    <span className="text-foreground font-semibold">
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
