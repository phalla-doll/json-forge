import { NextResponse } from "next/server";
import { D1Error, query } from "@/lib/d1";
import { SLUG_PATTERN } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShareRow = {
  payload: string;
  created_at: number;
  expires_at: number;
  read_only: number | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  let rows: ShareRow[];
  try {
    rows = await query<ShareRow>(
      "SELECT payload, created_at, expires_at, read_only FROM shares WHERE slug = ? LIMIT 1",
      [slug],
    );
  } catch (err) {
    if (err instanceof D1Error) {
      console.error("D1 read failed:", err.message);
    } else {
      console.error("Share read error:", err);
    }
    return NextResponse.json(
      { error: "Failed to load share. Please try again." },
      { status: 503 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const row = rows[0];
  if (row.expires_at < Date.now()) {
    return NextResponse.json({ error: "Share expired" }, { status: 410 });
  }

  return NextResponse.json(
    {
      json: row.payload,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      readOnly: row.read_only === 1,
    },
    {
      // Don't cache: shares can be deleted by cron at any time and the CDN
      // would otherwise serve a tombstone for up to its TTL. The page route
      // at /s/[slug] is already force-dynamic and reads D1 directly, so this
      // endpoint isn't on a hot path.
      headers: { "Cache-Control": "no-store" },
    },
  );
}
