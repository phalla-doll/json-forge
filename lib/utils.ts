import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { EditorStats } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    gtag: (
      command: "event",
      action: string,
      params?: { [key: string]: unknown },
    ) => void;
  }
}

export const trackEvent = (
  action: string,
  params?: { [key: string]: unknown },
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, params);
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const getStats = (text: string): EditorStats => {
  return {
    chars: text.length,
    lines: text.split(/\r\n|\r|\n/).length,
    size: formatFileSize(new Blob([text]).size),
  };
};

export const isValidJson = (text: string): boolean => {
  if (!text.trim()) return true;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export function sortKeysDeep(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, JsonValue> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, JsonValue>)[key]);
    }
    return sorted;
  }
  return value;
}

export const downloadFile = (content: string, filename: string) => {
  downloadBlob(content, filename, "application/json");
};

export const downloadBlob = (
  content: string,
  filename: string,
  mime: string,
) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function csvEscape(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  let str: string;
  if (typeof cell === "object") {
    try {
      str = JSON.stringify(cell);
    } catch {
      str = String(cell);
    }
  } else {
    str = String(cell);
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: JsonValue[], columns: string[]): string {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((row) => {
    const isObject =
      typeof row === "object" && row !== null && !Array.isArray(row);
    return columns
      .map((col) => {
        if (isObject) {
          return csvEscape((row as Record<string, JsonValue>)[col]);
        }
        return csvEscape(row);
      })
      .join(",");
  });
  return [header, ...lines].join("\n");
}
