"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy,
  LoaderCircle,
  Share05Icon,
  CheckCircle,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/utils";
import type { ShareResult } from "@/lib/share";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  result: ShareResult | null;
}

// Parent should pass `key={result?.slug ?? "pending"}` so a new share remounts
// this component, naturally resetting copy state without a reset effect.
export function ShareModal({
  isOpen,
  onClose,
  isLoading,
  result,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // Dialog content is portaled, so this only renders post-mount when window
  // is defined. The typeof guard keeps the read pure at SSR-eval time.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const absoluteUrl = result ? `${origin}${result.url}` : "";

  const expiryText = result
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(result.expiresAt))
    : "";

  const handleCopy = async () => {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success("Link copied");
      trackEvent("share_link_copy");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Share05Icon}
              className="size-5 text-amber-500"
            />
            Share this JSON
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view a snapshot of the current editor. The
            link expires after 30 days.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !result ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            <HugeiconsIcon
              icon={LoaderCircle}
              className="size-4 animate-spin"
            />
            <span className="ml-2">Creating share link…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={absoluteUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 font-mono text-xs"
                aria-label="Share URL"
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleCopy}
                aria-label="Copy share link"
              >
                <HugeiconsIcon
                  icon={copied ? CheckCircle : Copy}
                  className={copied ? "size-3.5 text-green-500" : "size-3.5"}
                />
                <span className="hidden sm:inline">
                  {copied ? "Copied" : "Copy"}
                </span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {expiryText}. Recipients can edit locally, but their
              changes won&apos;t update this link.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
