"use client";

import { useCallback, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
};

type PendingState = {
    opts: ConfirmOptions;
    resolve: (ok: boolean) => void;
};

export function useConfirm() {
    const [pending, setPending] = useState<PendingState | null>(null);

    const confirm = useCallback(
        (opts: ConfirmOptions): Promise<boolean> =>
            new Promise((resolve) => setPending({ opts, resolve })),
        [],
    );

    const resolveWith = (ok: boolean) => {
        if (!pending) return;
        pending.resolve(ok);
        setPending(null);
    };

    const dialog = (
        <AlertDialog
            open={pending !== null}
            onOpenChange={(open) => {
                if (!open) resolveWith(false);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{pending?.opts.title}</AlertDialogTitle>
                    {pending?.opts.description ? (
                        <AlertDialogDescription>
                            {pending.opts.description}
                        </AlertDialogDescription>
                    ) : null}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => resolveWith(false)}>
                        {pending?.opts.cancelLabel ?? "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => resolveWith(true)}
                        className={
                            pending?.opts.destructive
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : undefined
                        }
                    >
                        {pending?.opts.confirmLabel ?? "Continue"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return [confirm, dialog] as const;
}
