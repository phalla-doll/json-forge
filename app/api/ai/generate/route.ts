import { NextResponse } from "next/server";
import { generateJsonOnServer } from "@/lib/nvidia";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }
  if (prompt.length > 4000) {
    return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
  }

  try {
    const result = await generateJsonOnServer(prompt);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate JSON. Please try again." },
      { status: 502 },
    );
  }
}
