"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DocumentCodeIcon,
    Copy,
    LoaderCircle,
    CheckCircle,
    Sparkles,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import {
    ResponsiveModal,
    ResponsiveModalBody,
    ResponsiveModalContent,
    ResponsiveModalDescription,
    ResponsiveModalHeader,
    ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/utils";
import { generateTypes, type SchemaTarget } from "@/lib/ai";

interface SchemaModalProps {
    isOpen: boolean;
    onClose: () => void;
    json: string;
    remaining: number | null;
    onRemainingChange: (n: number | null) => void;
}

const TARGETS: { value: SchemaTarget; label: string }[] = [
    { value: "typescript", label: "TypeScript" },
    { value: "zod", label: "Zod" },
    { value: "json-schema", label: "JSON Schema" },
];

export function SchemaModal({
    isOpen,
    onClose,
    json,
    remaining,
    onRemainingChange,
}: SchemaModalProps) {
    const [target, setTarget] = useState<SchemaTarget>("typescript");
    const [results, setResults] = useState<
        Partial<Record<SchemaTarget, string>>
    >({});
    const [loading, setLoading] = useState<SchemaTarget | null>(null);
    const [copied, setCopied] = useState(false);

    const code = results[target];

    const handleGenerate = async () => {
        if (!json.trim() || loading) return;
        setLoading(target);
        trackEvent("ai_schema_generate", { target });
        try {
            const { result, remaining: r } = await generateTypes(json, target);
            onRemainingChange(r);
            if (r === 0)
                trackEvent("ai_quota_exhausted", { endpoint: "types" });
            setResults((prev) => ({ ...prev, [target]: result }));
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to generate schema",
            );
        } finally {
            setLoading(null);
        }
    };

    const handleCopy = async () => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            trackEvent("ai_schema_copy", { target });
            toast.success("Copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    const handleClose = () => {
        onClose();
        // Reset only ephemeral copy state; keep results so reopening preserves work.
        setCopied(false);
    };

    return (
        <ResponsiveModal
            open={isOpen}
            onOpenChange={(open) => !open && handleClose()}
        >
            <ResponsiveModalContent className="sm:max-w-2xl">
                <ResponsiveModalHeader>
                    <ResponsiveModalTitle className="flex items-center gap-2">
                        <HugeiconsIcon
                            icon={DocumentCodeIcon}
                            className="size-5"
                        />
                        Generate schema from JSON
                    </ResponsiveModalTitle>
                    <ResponsiveModalDescription>
                        Pick a target — the model reads your current JSON and
                        returns a schema in that language.
                    </ResponsiveModalDescription>
                </ResponsiveModalHeader>

                <ResponsiveModalBody>
                    <div className="flex flex-col gap-3">
                        <div className="border-border bg-muted flex items-center gap-1 rounded-md border p-0.5">
                            {TARGETS.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setTarget(t.value)}
                                    className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                                        target === t.value
                                            ? "bg-foreground text-background shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="border-border bg-muted/30 min-h-[14rem] rounded-md border p-3">
                            {loading === target ? (
                                <div className="text-muted-foreground flex h-56 items-center justify-center text-sm">
                                    <HugeiconsIcon
                                        icon={LoaderCircle}
                                        className="size-4 animate-spin"
                                    />
                                    <span className="ml-2">Generating…</span>
                                </div>
                            ) : code ? (
                                <pre className="text-foreground max-h-80 overflow-auto font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
                                    {code}
                                </pre>
                            ) : (
                                <div className="text-muted-foreground flex h-56 flex-col items-center justify-center gap-2 text-sm">
                                    <HugeiconsIcon
                                        icon={Sparkles}
                                        className="size-5"
                                    />
                                    <span>
                                        Click <strong>Generate</strong> to
                                        produce{" "}
                                        {
                                            TARGETS.find(
                                                (t) => t.value === target,
                                            )?.label
                                        }
                                        .
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-muted-foreground text-xs">
                                {remaining !== null
                                    ? `${remaining}/5 AI requests left this hour`
                                    : ""}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopy}
                                    disabled={!code || loading !== null}
                                    className="flex-1 sm:flex-none"
                                >
                                    <HugeiconsIcon
                                        icon={copied ? CheckCircle : Copy}
                                        className={
                                            copied
                                                ? "size-3.5 text-green-500"
                                                : "size-3.5"
                                        }
                                    />
                                    {copied ? "Copied" : "Copy"}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleGenerate}
                                    disabled={!json.trim() || loading !== null}
                                    className="flex-1 sm:flex-none"
                                >
                                    {loading === target ? (
                                        <>
                                            <HugeiconsIcon
                                                icon={LoaderCircle}
                                                className="size-4 animate-spin"
                                            />
                                            Generating
                                        </>
                                    ) : (
                                        <>
                                            <HugeiconsIcon
                                                icon={Sparkles}
                                                className="size-4"
                                            />
                                            {code ? "Regenerate" : "Generate"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ResponsiveModalBody>
            </ResponsiveModalContent>
        </ResponsiveModal>
    );
}
