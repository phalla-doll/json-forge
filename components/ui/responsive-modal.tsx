"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const MOBILE_QUERY = "(max-width: 639px)";

function subscribe(callback: () => void) {
    const mql = window.matchMedia(MOBILE_QUERY);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
}

function useIsMobile() {
    return React.useSyncExternalStore(
        subscribe,
        () => window.matchMedia(MOBILE_QUERY).matches,
        () => false,
    );
}

const ResponsiveModalContext = React.createContext<boolean>(false);

interface ResponsiveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

function ResponsiveModal({
    open,
    onOpenChange,
    children,
}: ResponsiveModalProps) {
    const isMobile = useIsMobile();
    return (
        <ResponsiveModalContext.Provider value={isMobile}>
            {isMobile ? (
                <Drawer open={open} onOpenChange={onOpenChange}>
                    {children}
                </Drawer>
            ) : (
                <Dialog open={open} onOpenChange={onOpenChange}>
                    {children}
                </Dialog>
            )}
        </ResponsiveModalContext.Provider>
    );
}

function ResponsiveModalContent({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const isMobile = React.useContext(ResponsiveModalContext);
    if (isMobile) {
        return <DrawerContent className={className}>{children}</DrawerContent>;
    }
    return <DialogContent className={className}>{children}</DialogContent>;
}

function ResponsiveModalHeader({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const isMobile = React.useContext(ResponsiveModalContext);
    return isMobile ? (
        <DrawerHeader className={cn("text-left", className)}>
            {children}
        </DrawerHeader>
    ) : (
        <DialogHeader className={className}>{children}</DialogHeader>
    );
}

function ResponsiveModalTitle({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const isMobile = React.useContext(ResponsiveModalContext);
    return isMobile ? (
        <DrawerTitle className={className}>{children}</DrawerTitle>
    ) : (
        <DialogTitle className={className}>{children}</DialogTitle>
    );
}

function ResponsiveModalDescription({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const isMobile = React.useContext(ResponsiveModalContext);
    return isMobile ? (
        <DrawerDescription className={className}>{children}</DrawerDescription>
    ) : (
        <DialogDescription className={className}>{children}</DialogDescription>
    );
}

function ResponsiveModalBody({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const isMobile = React.useContext(ResponsiveModalContext);
    return (
        <div className={cn(isMobile && "overflow-y-auto px-4 pb-6", className)}>
            {children}
        </div>
    );
}

export {
    ResponsiveModal,
    ResponsiveModalContent,
    ResponsiveModalHeader,
    ResponsiveModalTitle,
    ResponsiveModalDescription,
    ResponsiveModalBody,
};
