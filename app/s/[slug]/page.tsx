import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { D1Error, query } from "@/lib/d1";
import { SLUG_PATTERN } from "@/lib/slug";
import { JsonForgeApp } from "@/components/json-forge-app";
import { ExpiredShareView } from "./expired-view";
import { ShareViewBeacon } from "./share-view-beacon";

export const dynamic = "force-dynamic";

type ShareRow = {
  payload: string;
  created_at: number;
  expires_at: number;
  read_only: number | null;
};

export const metadata: Metadata = {
  title: "Shared JSON · JSON Forge",
  robots: { index: false, follow: false },
};

type LoadResult =
  | { kind: "found"; row: ShareRow }
  | { kind: "expired" }
  | { kind: "not-found" };

async function loadShare(slug: string): Promise<LoadResult> {
  if (!SLUG_PATTERN.test(slug)) return { kind: "not-found" };
  try {
    const rows = await query<ShareRow>(
      "SELECT payload, created_at, expires_at, read_only FROM shares WHERE slug = ? LIMIT 1",
      [slug],
    );
    const row = rows[0];
    if (!row) return { kind: "not-found" };
    // Resolve expiry here, outside the React render path, so the page renderer
    // stays pure (no Date.now() during render).
    if (row.expires_at < Date.now()) return { kind: "expired" };
    return { kind: "found", row };
  } catch (err) {
    // Treat infra errors as not-found at the page layer — the user sees a
    // generic 404 rather than a stack trace. The cause is still logged.
    if (err instanceof D1Error) {
      console.error("D1 read failed in /s/[slug]:", err.message);
    } else {
      console.error("Share page error:", err);
    }
    return { kind: "not-found" };
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadShare(slug);
  if (result.kind === "not-found") notFound();
  if (result.kind === "expired") return <ExpiredShareView />;

  const readOnly = result.row.read_only === 1;
  return (
    <>
      <ShareViewBeacon slug={slug} readOnly={readOnly} />
      <JsonForgeApp
        initialJson={result.row.payload}
        sharedSnapshot={{
          createdAt: result.row.created_at,
          expiresAt: result.row.expires_at,
          readOnly,
        }}
      />
    </>
  );
}
