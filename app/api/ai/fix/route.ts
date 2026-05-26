import { NextResponse } from "next/server"
import { fixJsonOnServer } from "@/lib/nvidia"

export const runtime = "nodejs"

const MAX_JSON_BYTES = 1_000_000

export async function POST(request: Request) {
    let body: { json?: unknown; error?: unknown }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { json, error } = body
    if (typeof json !== "string" || !json.trim()) {
        return NextResponse.json({ error: "JSON is required" }, { status: 400 })
    }
    if (json.length > MAX_JSON_BYTES) {
        return NextResponse.json({ error: "JSON too large" }, { status: 413 })
    }
    if (typeof error !== "string") {
        return NextResponse.json({ error: "Error message is required" }, { status: 400 })
    }

    try {
        const result = await fixJsonOnServer(json, error)
        return NextResponse.json({ result })
    } catch (err) {
        console.error("AI fix error:", err)
        return NextResponse.json(
            { error: "Failed to fix JSON syntax." },
            { status: 502 }
        )
    }
}
