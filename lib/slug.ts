import "server-only";
import { randomBytes } from "node:crypto";

// URL-safe alphabet — 64 chars so each byte maps cleanly to one slug char.
const ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const SLUG_LENGTH = 10;

// 64^10 ≈ 1.15e18 combinations — collision risk is negligible at our scale,
// so the route inserts without a uniqueness retry loop.
export function generateSlug(): string {
    const bytes = randomBytes(SLUG_LENGTH);
    let out = "";
    for (let i = 0; i < SLUG_LENGTH; i++) {
        out += ALPHABET[bytes[i] & 63];
    }
    return out;
}

export const SLUG_PATTERN = /^[A-Za-z0-9_-]{10}$/;
