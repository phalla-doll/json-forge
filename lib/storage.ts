import { createStore, get, set, del } from "idb-keyval";

export type RecentDoc = {
  hash: string;
  title: string;
  preview: string;
  savedAt: number;
  size: number;
};

const STORE = typeof window !== "undefined"
  ? createStore("json-forge", "kv")
  : null;

const CURRENT_KEY = "current-doc";
const RECENTS_KEY = "recent-docs";
const MAX_RECENTS = 10;

async function shortHash(text: string): Promise<string> {
  // Hash the first 4 KiB — close enough for "is this the same doc" without
  // hashing 25 MB of payload. Falls back to a length+sample string when the
  // SubtleCrypto API is unavailable (old browsers, insecure contexts).
  const sample = text.slice(0, 4096);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const buf = new TextEncoder().encode(sample);
      const digest = await crypto.subtle.digest("SHA-1", buf);
      return Array.from(new Uint8Array(digest))
        .slice(0, 8)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // fall through
    }
  }
  return `${text.length.toString(36)}_${sample.slice(0, 16)}`;
}

function inferTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "(empty)";
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return `Array (${parsed.length} items)`;
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed);
      if (keys.length === 0) return "(empty object)";
      return `{ ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", …" : ""} }`;
    }
    return String(parsed).slice(0, 40);
  } catch {
    return trimmed.slice(0, 40);
  }
}

export async function saveCurrent(text: string): Promise<void> {
  if (!STORE) return;
  try {
    await set(CURRENT_KEY, text, STORE);
  } catch {
    // IndexedDB may be disabled in private mode; degrade silently.
  }
}

export async function loadCurrent(): Promise<string | null> {
  if (!STORE) return null;
  try {
    const v = await get<string>(CURRENT_KEY, STORE);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function loadRecents(): Promise<RecentDoc[]> {
  if (!STORE) return [];
  try {
    const v = await get<RecentDoc[]>(RECENTS_KEY, STORE);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function pushRecent(text: string): Promise<void> {
  if (!STORE) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    const hash = await shortHash(trimmed);
    const existing = await loadRecents();
    const filtered = existing.filter((d) => d.hash !== hash);
    const next: RecentDoc = {
      hash,
      title: inferTitle(trimmed),
      preview: trimmed.slice(0, 120),
      savedAt: Date.now(),
      size: new Blob([text]).size,
    };
    const updated = [next, ...filtered].slice(0, MAX_RECENTS);
    // Persist body separately so the modal can reopen the doc. Prune bodies
    // for entries that fell out of the top-10 window.
    await Promise.all([
      set(RECENTS_KEY, updated, STORE),
      set(`recent:${hash}`, text, STORE),
      ...existing
        .filter(
          (d) =>
            d.hash !== hash && !updated.some((u) => u.hash === d.hash),
        )
        .map((d) => del(`recent:${d.hash}`, STORE!)),
    ]);
  } catch {
    // ignore
  }
}

export async function deleteRecent(hash: string): Promise<void> {
  if (!STORE) return;
  try {
    const existing = await loadRecents();
    const updated = existing.filter((d) => d.hash !== hash);
    await set(RECENTS_KEY, updated, STORE);
  } catch {
    // ignore
  }
}

export async function getRecentByHash(hash: string): Promise<string | null> {
  if (!STORE) return null;
  try {
    const v = await get<string>(`recent:${hash}`, STORE);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export async function setRecentBody(hash: string, text: string): Promise<void> {
  if (!STORE) return;
  try {
    await set(`recent:${hash}`, text, STORE);
  } catch {
    // ignore
  }
}

export async function deleteRecentBody(hash: string): Promise<void> {
  if (!STORE) return;
  try {
    await del(`recent:${hash}`, STORE);
  } catch {
    // ignore
  }
}

export { shortHash };
