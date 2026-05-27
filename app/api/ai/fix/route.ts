import { NextResponse } from "next/server";
import { AiOutputError, fixJsonOnServer } from "@/lib/nvidia";
import { enforceAiRateLimit } from "@/lib/ratelimit";
import { enforceSameOrigin } from "@/lib/origin";

export const runtime = "nodejs";

const MAX_JSON_BYTES = 200_000;
const MAX_ERROR_LENGTH = 2_000;
const MAX_BODY_BYTES = MAX_JSON_BYTES + 16 * 1024;

export async function POST(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const rl = await enforceAiRateLimit(request);
  if (!rl.ok) return rl.response;

  let body: { json?: unknown; error?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { json, error } = body;
  if (typeof json !== "string" || !json.trim()) {
    return NextResponse.json({ error: "JSON is required" }, { status: 400 });
  }
  if (json.length > MAX_JSON_BYTES) {
    return NextResponse.json({ error: "JSON too large" }, { status: 413 });
  }
  if (typeof error !== "string") {
    return NextResponse.json(
      { error: "Error message is required" },
      { status: 400 },
    );
  }
  if (error.length > MAX_ERROR_LENGTH) {
    return NextResponse.json(
      { error: "Error message too long" },
      { status: 400 },
    );
  }

  try {
    const result = await fixJsonOnServer(json, error);
    return NextResponse.json({ result, remaining: rl.remaining });
  } catch (err) {
    if (err instanceof AiOutputError) {
      console.error("AI fix output error:", err.message);
      return NextResponse.json(
        {
          error:
            "Model returned invalid output. Please edit the JSON manually.",
        },
        { status: 502 },
      );
    }
    console.error("AI fix error:", err);
    return NextResponse.json(
      { error: "Failed to fix JSON syntax." },
      { status: 502 },
    );
  }
}
