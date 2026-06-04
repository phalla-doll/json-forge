"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Drives the .t-tabs-pill sliding indicator: positions the pill over the
 * element whose [aria-selected="true"] is set inside `barRef`, snaps without
 * animation on first paint / resize / font-load, and tweens between active
 * tabs on subsequent `active` changes.
 *
 * Pass `enabled=false` to defer measurement (e.g. modal is closed) — when it
 * flips back to true the first run snaps again instead of tweening from the
 * previous position.
 */
export function useTabsPill<T>(active: T, enabled: boolean = true) {
    const barRef = useRef<HTMLDivElement | null>(null);
    const pillRef = useRef<HTMLSpanElement | null>(null);
    const mountedRef = useRef(false);

    useLayoutEffect(() => {
        if (!enabled) {
            mountedRef.current = false;
            return;
        }
        const bar = barRef.current;
        const pill = pillRef.current;
        if (!bar || !pill) return;

        const snap = () => {
            const el = bar.querySelector<HTMLElement>(
                '[aria-selected="true"]',
            );
            if (!el || el.offsetWidth === 0) return false;
            const prev = pill.style.transition;
            pill.style.transition = "none";
            pill.style.transform = `translateX(${el.offsetLeft}px)`;
            pill.style.width = `${el.offsetWidth}px`;
            void pill.offsetWidth;
            pill.style.transition = prev;
            return true;
        };

        const tween = () => {
            const el = bar.querySelector<HTMLElement>(
                '[aria-selected="true"]',
            );
            if (!el || el.offsetWidth === 0) return;
            pill.style.transform = `translateX(${el.offsetLeft}px)`;
            pill.style.width = `${el.offsetWidth}px`;
        };

        if (mountedRef.current) {
            tween();
        } else if (snap()) {
            mountedRef.current = true;
        }

        const ro = new ResizeObserver(() => snap());
        ro.observe(bar);

        let cancelled = false;
        if (typeof document !== "undefined" && document.fonts?.ready) {
            document.fonts.ready
                .then(() => {
                    if (!cancelled) snap();
                })
                .catch(() => {});
        }

        return () => {
            cancelled = true;
            ro.disconnect();
        };
    }, [active, enabled]);

    return { barRef, pillRef };
}
