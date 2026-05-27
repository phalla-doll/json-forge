import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { D1Error, execute } from "@/lib/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron triggers this with `Authorization: Bearer ${CRON_SECRET}`.
// On length mismatch we still perform a same-length compare against a
// zero-filled buffer so the rejection path doesn't run faster than a true
// length-matching mismatch.
function authorize(request: Request): boolean {
    const expected = process.env.CRON_SECRET;
    if (!expected) return false;
    const header = request.headers.get("authorization") || "";
    const presented = header.startsWith("Bearer ") ? header.slice(7) : "";

    const expectedBuf = Buffer.from(expected, "utf8");
    const presentedBuf = Buffer.from(presented, "utf8");

    if (presentedBuf.length !== expectedBuf.length) {
        timingSafeEqual(expectedBuf, Buffer.alloc(expectedBuf.length));
        return false;
    }
    return timingSafeEqual(expectedBuf, presentedBuf);
}

export async function GET(request: Request) {
    if (!authorize(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { changes } = await execute(
            "DELETE FROM shares WHERE expires_at < ?",
            [Date.now()],
        );
        return NextResponse.json({ deleted: changes });
    } catch (err) {
        const message =
            err instanceof D1Error ? err.message : "Unexpected cleanup error";
        console.error("Cron cleanup failed:", message);
        return NextResponse.json({ error: "Cleanup failed" }, { status: 503 });
    }
}
