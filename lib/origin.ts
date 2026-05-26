import "server-only";
import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

function allowedHosts(): Set<string> {
  const hosts = new Set<string>();

  const add = (value: string | undefined) => {
    if (!value) return;
    for (const raw of value.split(",")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        // Accept bare hosts or full URLs.
        const url = trimmed.includes("://")
          ? new URL(trimmed)
          : new URL(`https://${trimmed}`);
        hosts.add(url.host.toLowerCase());
      } catch {
        // ignore malformed entries
      }
    }
  };

  // Vercel-provided URLs (no protocol).
  add(process.env.VERCEL_URL);
  add(process.env.VERCEL_BRANCH_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  // Operator-provided allowlist.
  add(process.env.ALLOWED_ORIGIN);
  add(process.env.NEXT_PUBLIC_SITE_URL);

  return hosts;
}

let cachedHosts: Set<string> | null = null;

function getAllowedHosts(): Set<string> {
  if (!cachedHosts) cachedHosts = allowedHosts();
  return cachedHosts;
}

export function enforceSameOrigin(request: Request): NextResponse | null {
  // In non-production environments we accept anything to keep the dev loop fast.
  if (!isProd) return null;

  const allowed = getAllowedHosts();
  // If no allowlist is configured in production, fall back to the request host
  // so the check still rejects cross-origin requests.
  const fallbackHost = request.headers.get("host")?.toLowerCase();
  if (allowed.size === 0 && fallbackHost) allowed.add(fallbackHost);

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const candidate = origin || referer;
  if (!candidate) {
    return NextResponse.json(
      { error: "Missing Origin/Referer" },
      { status: 403 },
    );
  }

  let host: string;
  try {
    host = new URL(candidate).host.toLowerCase();
  } catch {
    return NextResponse.json(
      { error: "Invalid Origin/Referer" },
      { status: 403 },
    );
  }

  if (!allowed.has(host)) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 },
    );
  }

  return null;
}
