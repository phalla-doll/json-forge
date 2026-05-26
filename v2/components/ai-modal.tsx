"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiContentGenerator02Icon, LoaderCircle, Sparkles } from "@hugeicons/core-free-icons"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface AiModalProps {
    isOpen: boolean
    onClose: () => void
    onGenerate: (prompt: string) => void
    isLoading: boolean
}

export function AiModal({
    isOpen,
    onClose,
    onGenerate,
    isLoading,
}: AiModalProps) {
    const [prompt, setPrompt] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (prompt.trim()) {
            onGenerate(prompt)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={AiContentGenerator02Icon} className="size-5 text-purple-500" />
                        Generate JSON with AI
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

                    <div className="flex justify-end gap-3 pt-2">
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
                            className="border-transparent bg-purple-600 text-white hover:bg-purple-700"
                        >
                            {isLoading ? (
                                <>
                                    <HugeiconsIcon icon={LoaderCircle} className="size-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <HugeiconsIcon icon={Sparkles} className="size-4" />
                                    Generate
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
