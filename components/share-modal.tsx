"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Copy,
    LoaderCircle,
    Share05Icon,
    CheckCircle,
    EyeIcon,
} from "@hugeicons/core-free-icons";
import { QRCodeSVG } from "qrcode.react";
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
import type { ShareResult, ShareExpiry, ShareOptions } from "@/lib/share";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: ShareResult | null;
    onCreate: (options: ShareOptions) => void;
}

const EXPIRY_OPTIONS: { value: ShareExpiry; label: string }[] = [
    { value: "1h", label: "1 hour" },
    { value: "1d", label: "1 day" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
];

// Parent should pass `key={result?.slug ?? "pending"}` so a new share remounts
// this component, naturally resetting copy state without a reset effect.
export function ShareModal({
    isOpen,
    onClose,
    isLoading,
    result,
    onCreate,
}: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const [expiresIn, setExpiresIn] = useState<ShareExpiry>("30d");
    const [readOnly, setReadOnly] = useState(false);

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

    const handleConfirm = () => {
        onCreate({ expiresIn, readOnly });
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
                        {result
                            ? "Send this link to anyone — they'll see a snapshot of your JSON."
                            : "Pick how long the link should live, then create it."}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
                        <HugeiconsIcon
                            icon={LoaderCircle}
                            className="size-4 animate-spin"
                        />
                        <span className="ml-2">Creating share link…</span>
                    </div>
                ) : !result ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <span className="text-foreground text-xs font-medium">
                                Expires after
                            </span>
                            <div className="border-border bg-muted flex items-center gap-1 rounded-md border p-0.5">
                                {EXPIRY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setExpiresIn(opt.value)}
                                        className={`flex-1 rounded-[calc(var(--radius-md)-2px)] px-2 py-1.5 text-xs font-medium transition-colors ${
                                            expiresIn === opt.value
                                                ? "bg-foreground text-background shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="border-border bg-muted/40 flex cursor-pointer items-start gap-2 rounded-md border p-3">
                            <input
                                type="checkbox"
                                checked={readOnly}
                                onChange={(e) => setReadOnly(e.target.checked)}
                                className="mt-0.5"
                            />
                            <span className="flex flex-col text-xs">
                                <span className="text-foreground flex items-center gap-1.5 font-medium">
                                    <HugeiconsIcon
                                        icon={EyeIcon}
                                        className="size-3.5"
                                    />
                                    View-only mode
                                </span>
                                <span className="text-muted-foreground">
                                    Recipients cannot edit, prettify, or import.
                                    They can still view, copy, and download.
                                </span>
                            </span>
                        </label>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirm}>
                                <HugeiconsIcon
                                    icon={Share05Icon}
                                    className="size-3.5"
                                />
                                Create link
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col items-center gap-2">
                            <div className="rounded-lg border bg-white p-3 shadow-sm">
                                <QRCodeSVG
                                    value={absoluteUrl}
                                    size={180}
                                    level="M"
                                    marginSize={0}
                                    bgColor="#ffffff"
                                    fgColor="#0a0a0a"
                                    aria-label="QR code for share link"
                                />
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Scan to open on another device
                            </p>
                        </div>
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
                                    className={
                                        copied
                                            ? "size-3.5 text-green-500"
                                            : "size-3.5"
                                    }
                                />
                                <span className="hidden sm:inline">
                                    {copied ? "Copied" : "Copy"}
                                </span>
                            </Button>
                        </div>
                        <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                            <span>Expires {expiryText}.</span>
                            {result.readOnly && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-300">
                                    <HugeiconsIcon
                                        icon={EyeIcon}
                                        className="size-3"
                                    />
                                    View-only
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
