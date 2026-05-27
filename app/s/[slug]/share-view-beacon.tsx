"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/utils";

interface ShareViewBeaconProps {
    slug: string;
    readOnly?: boolean;
}

export function ShareViewBeacon({ slug, readOnly }: ShareViewBeaconProps) {
    useEffect(() => {
        trackEvent("share_view", { slug, read_only: !!readOnly });
    }, [slug, readOnly]);
    return null;
}
