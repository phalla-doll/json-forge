import { NextResponse } from "next/server";
import { execute, D1Error } from "@/lib/d1";
import { enforceShareRateLimit, getClientIp, hashIp } from "@/lib/ratelimit";
import { enforceSameOrigin } from "@/lib/origin";
import { generateSlug } from "@/lib/slug";

export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 KiB — safely under D1's 1 MiB row cap.
const MAX_BODY_BYTES = MAX_PAYLOAD_BYTES + 4 * 1024; // JSON envelope overhead.

const TTL_OPTIONS_MS = {
    "1h": 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
} as const;

type ExpiryOption = keyof typeof TTL_OPTIONS_MS;
const VALID_EXPIRIES = new Set(Object.keys(TTL_OPTIONS_MS) as ExpiryOption[]);

// Stream-read with a hard byte cap so a missing or spoofed Content-Length
// can't trick us into buffering the platform's max body (~4.5 MB on Vercel)
// before our inner 512 KiB check rejects it.
async function readBodyCapped(
    request: Request,
    maxBytes: number,
): Promise<string | null> {
    if (!request.body) return "";
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
            try {
                await reader.cancel();
            } catch {
                // ignore — we're rejecting anyway
            }
            return null;
        }
        chunks.push(value);
    }
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        buf.set(c, offset);
        offset += c.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

export async function POST(request: Request) {
    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const rl = await enforceShareRateLimit(request);
    if (!rl.ok) return rl.response;

    const raw = await readBodyCapped(request, MAX_BODY_BYTES);
    if (raw === null) {
        return NextResponse.json(
            { error: "Payload too large" },
            { status: 413 },
        );
    }

    let body: { json?: unknown; expiresIn?: unknown; readOnly?: unknown };
    try {
        body = raw
            ? (JSON.parse(raw) as {
                  json?: unknown;
                  expiresIn?: unknown;
                  readOnly?: unknown;
              })
            : {};
    } catch {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 },
        );
    }

    const { json, expiresIn, readOnly } = body;
    if (typeof json !== "string" || !json.trim()) {
        return NextResponse.json(
            { error: "JSON payload is required" },
            { status: 400 },
        );
    }

    const expiry: ExpiryOption =
        typeof expiresIn === "string" &&
        VALID_EXPIRIES.has(expiresIn as ExpiryOption)
            ? (expiresIn as ExpiryOption)
            : "30d";
    const readOnlyFlag = readOnly === true;

    const byteSize = Buffer.byteLength(json, "utf8");
    if (byteSize > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
            { error: "JSON too large (max 512 KB)" },
            { status: 413 },
        );
    }

    try {
        JSON.parse(json);
    } catch {
        return NextResponse.json(
            { error: "Payload is not valid JSON" },
            { status: 400 },
        );
    }

    const slug = generateSlug();
    const now = Date.now();
    const expiresAt = now + TTL_OPTIONS_MS[expiry];
    const ipHash = hashIp(getClientIp(request));

    try {
        await execute(
            "INSERT INTO shares (slug, payload, byte_size, created_at, expires_at, ip_hash, read_only) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                slug,
                json,
                byteSize,
                now,
                expiresAt,
                ipHash,
                readOnlyFlag ? 1 : 0,
            ],
        );
    } catch (err) {
        if (err instanceof D1Error) {
            console.error("D1 insert failed:", err.message);
        } else {
            console.error("Share insert error:", err);
        }
        return NextResponse.json(
            { error: "Failed to create share. Please try again." },
            { status: 503 },
        );
    }

    return NextResponse.json({
        slug,
        url: `/s/${slug}`,
        expiresAt,
        readOnly: readOnlyFlag,
        expiresIn: expiry,
        remaining: rl.remaining,
    });
}
