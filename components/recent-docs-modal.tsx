"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ClipboardClockIcon, Trash2, FolderOpen } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  loadRecents,
  deleteRecent,
  deleteRecentBody,
  getRecentByHash,
  type RecentDoc,
} from "@/lib/storage";
import { trackEvent, formatFileSize } from "@/lib/utils";

interface RecentDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: (text: string) => void;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000)
    return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function RecentDocsModal({
  isOpen,
  onClose,
  onOpen,
}: RecentDocsModalProps) {
  // `null` means "loading"; an array (possibly empty) means "loaded".
  const [recents, setRecents] = useState<RecentDoc[] | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadRecents().then((list) => {
      if (!cancelled) setRecents(list);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const loading = recents === null;

  const handleOpen = async (doc: RecentDoc, index: number) => {
    const body = await getRecentByHash(doc.hash);
    if (body === null) {
      // Body was never stored — remove the stale metadata.
      await deleteRecent(doc.hash);
      setRecents((prev) => prev?.filter((d) => d.hash !== doc.hash) ?? []);
      return;
    }
    trackEvent("recent_open", { position: index });
    onOpen(body);
    onClose();
  };

  const handleDelete = async (doc: RecentDoc) => {
    trackEvent("recent_delete");
    await Promise.all([deleteRecent(doc.hash), deleteRecentBody(doc.hash)]);
    setRecents((prev) => prev?.filter((d) => d.hash !== doc.hash) ?? []);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={ClipboardClockIcon} className="size-5" />
            Recent documents
          </DialogTitle>
          <DialogDescription>
            Local-only history. Up to 10 distinct documents are kept in this
            browser.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (recents ?? []).length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <HugeiconsIcon icon={FolderOpen} className="size-5" />
            No recent documents yet
          </div>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {(recents ?? []).map((doc, i) => (
              <li
                key={doc.hash}
                className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => handleOpen(doc, i)}
                  className="flex flex-1 flex-col items-start gap-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <span className="line-clamp-1 font-mono text-xs font-medium text-foreground">
                    {doc.title}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatRelative(doc.savedAt)}</span>
                    <span>·</span>
                    <span>{formatFileSize(doc.size)}</span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc)}
                  aria-label={`Delete ${doc.title}`}
                  className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <HugeiconsIcon icon={Trash2} className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
