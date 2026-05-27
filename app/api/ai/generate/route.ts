import { NextResponse } from "next/server";
import { AiOutputError, generateJsonOnServer } from "@/lib/nvidia";
import { enforceAiRateLimit } from "@/lib/ratelimit";
import { enforceSameOrigin } from "@/lib/origin";

export const runtime = "nodejs";

const MAX_PROMPT_LENGTH = 4000;
const MAX_BODY_BYTES = 16 * 1024; // 16 KiB — prompts are short.

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

    let body: { prompt?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 },
        );
    }

    const { prompt } = body;
    if (typeof prompt !== "string" || !prompt.trim()) {
        return NextResponse.json(
            { error: "Prompt is required" },
            { status: 400 },
        );
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
        return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
    }
    // Reject ASCII control characters (except \t \n \r) — they have no business
    // in a user-typed prompt and are a common smuggling vector.
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(prompt)) {
        return NextResponse.json(
            { error: "Prompt contains invalid control characters" },
            { status: 400 },
        );
    }

    try {
        const result = await generateJsonOnServer(prompt);
        return NextResponse.json({ result, remaining: rl.remaining });
    } catch (error) {
        if (error instanceof AiOutputError) {
            console.error("AI generate output error:", error.message);
            return NextResponse.json(
                {
                    error: "Model returned invalid output. Please try a different prompt.",
                },
                { status: 502 },
            );
        }
        console.error("AI generate error:", error);
        return NextResponse.json(
            { error: "Failed to generate JSON. Please try again." },
            { status: 502 },
        );
    }
}
