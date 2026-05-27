import { NextResponse } from "next/server";
import {
    AiOutputError,
    generateTypesOnServer,
    type SchemaTarget,
} from "@/lib/nvidia";
import { enforceAiRateLimit } from "@/lib/ratelimit";
import { enforceSameOrigin } from "@/lib/origin";

export const runtime = "nodejs";

const MAX_JSON_LENGTH = 256 * 1024; // 256 KiB of input JSON
const MAX_BODY_BYTES = MAX_JSON_LENGTH + 4 * 1024;
const VALID_TARGETS: ReadonlySet<SchemaTarget> = new Set([
    "typescript",
    "zod",
    "json-schema",
]);

export async function POST(request: Request) {
    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > MAX_BODY_BYTES) {
        return NextResponse.json(
            { error: "Request too large" },
            { status: 413 },
        );
    }

    const rl = await enforceAiRateLimit(request);
    if (!rl.ok) return rl.response;

    let body: { json?: unknown; target?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 },
        );
    }

    const { json, target } = body;
    if (typeof json !== "string" || !json.trim()) {
        return NextResponse.json(
            { error: "JSON input is required" },
            { status: 400 },
        );
    }
    if (json.length > MAX_JSON_LENGTH) {
        return NextResponse.json({ error: "JSON too large" }, { status: 400 });
    }
    if (
        typeof target !== "string" ||
        !VALID_TARGETS.has(target as SchemaTarget)
    ) {
        return NextResponse.json(
            { error: "Unknown target. Use typescript, zod, or json-schema." },
            { status: 400 },
        );
    }

    // Validate JSON parses — saves a model call on garbage input.
    try {
        JSON.parse(json);
    } catch {
        return NextResponse.json(
            { error: "Input is not valid JSON" },
            { status: 400 },
        );
    }

    try {
        const result = await generateTypesOnServer(
            json,
            target as SchemaTarget,
        );
        return NextResponse.json({ result, remaining: rl.remaining });
    } catch (error) {
        if (error instanceof AiOutputError) {
            console.error("AI types output error:", error.message);
            return NextResponse.json(
                { error: "Model returned invalid output. Please try again." },
                { status: 502 },
            );
        }
        console.error("AI types error:", error);
        return NextResponse.json(
            { error: "Failed to generate schema. Please try again." },
            { status: 502 },
        );
    }
}
