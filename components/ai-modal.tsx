"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AiContentGenerator02Icon,
    LoaderCircle,
    Sparkles,
} from "@hugeicons/core-free-icons";
import {
    ResponsiveModal,
    ResponsiveModalBody,
    ResponsiveModalContent,
    ResponsiveModalHeader,
    ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface AiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
    remaining: number | null;
}

export function AiModal({
    isOpen,
    onClose,
    onGenerate,
    isLoading,
    remaining,
}: AiModalProps) {
    const [prompt, setPrompt] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };

    return (
        <ResponsiveModal
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
        >
            <ResponsiveModalContent className="sm:max-w-lg">
                <ResponsiveModalHeader>
                    <ResponsiveModalTitle className="flex items-center gap-2">
                        <HugeiconsIcon
                            icon={AiContentGenerator02Icon}
                            className="size-5 text-purple-500"
                        />
                        Generate JSON with AI
                    </ResponsiveModalTitle>
                </ResponsiveModalHeader>

                <ResponsiveModalBody>
                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-4"
                    >
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="ai-prompt">
                                Describe the data you need
                            </Label>
                            <Textarea
                                id="ai-prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Create a list of 5 users with names, emails, and realistic addresses..."
                                className="h-32 resize-none"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!prompt.trim() || isLoading}
                                variant="default"
                            >
                                {isLoading ? (
                                    <>
                                        <HugeiconsIcon
                                            icon={LoaderCircle}
                                            className="size-4 animate-spin"
                                        />
                                        <span
                                            className="t-shimmer"
                                            data-text="Generating..."
                                        >
                                            Generating...
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <HugeiconsIcon
                                            icon={Sparkles}
                                            className="size-4"
                                        />
                                        Generate
                                        {remaining !== null
                                            ? ` (${remaining}/5)`
                                            : ""}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </ResponsiveModalBody>
            </ResponsiveModalContent>
        </ResponsiveModal>
    );
}
