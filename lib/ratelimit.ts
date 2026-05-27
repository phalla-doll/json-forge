import "server-only";
import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const isProd = process.env.NODE_ENV === "production";
const allowUnlimited = process.env.ALLOW_UNLIMITED_AI === "1";
const trustProxyHeaders = process.env.TRUSTED_PROXY === "1";
const onVercel = !!process.env.VERCEL;

let warned = false;

type Limiters = {
  ai: Ratelimit;
  share: Ratelimit;
};

let cached: Limiters | null = null;

function getLimiters(): Limiters | null {
  if (!url || !token) {
    if (!warned) {
      console.warn(
        "[ratelimit] Upstash creds missing (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN) — rate limiting disabled.",
      );
      warned = true;
    }
    return null;
  }
  if (!cached) {
    const redis = new Redis({ url, token });
    cached = {
      ai: new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(5, "1 h"),
        prefix: "json-forge:ai:hour",
        analytics: false,
      }),
      share: new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(10, "1 h"),
        prefix: "json-forge:share:hour",
        analytics: false,
      }),
    };
  }
  return cached;
}

export function getClientIp(request: Request): string {
  // Vercel sets x-vercel-forwarded-for to the real client IP after stripping
  // any client-supplied value. This is the only header we can trust on Vercel.
  if (onVercel) {
    const vercelFwd = request.headers.get("x-vercel-forwarded-for");
    if (vercelFwd) {
      const first = vercelFwd.split(",")[0]?.trim();
      if (first) return first;
    }
    return "anonymous";
  }

  // Off Vercel: only trust XFF/X-Real-IP when an operator explicitly opts in
  // via TRUSTED_PROXY=1, signalling a known proxy is in front of the app.
  if (trustProxyHeaders) {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) {
      const first = fwd.split(",")[0]?.trim();
      if (first) return first;
    }
    const real = request.headers.get("x-real-ip");
    if (real) return real;
  }

  return "anonymous";
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; response: NextResponse };

const UPSTASH_TIMEOUT_MS = 2000;

function failClosedResponse(reason: string): NextResponse {
  console.error(`[ratelimit] failing closed: ${reason}`);
  return NextResponse.json(
    { error: "Service temporarily unavailable. Please try again later." },
    { status: 503, headers: { "Retry-After": "30" } },
  );
}

type RunOpts = {
  pick: (l: Limiters) => Ratelimit;
  defaultLimit: number;
  quotaMessage: string;
};

async function runLimiter(
  request: Request,
  opts: RunOpts,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) {
    if (isProd && !allowUnlimited) {
      return {
        ok: false,
        response: failClosedResponse("Upstash creds missing in production"),
      };
    }
    return { ok: true, remaining: opts.defaultLimit };
  }

  const ip = getClientIp(request);
  const limiter = opts.pick(limiters);

  let hour: Awaited<ReturnType<typeof limiter.limit>>;
  try {
    hour = await Promise.race([
      limiter.limit(ip),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("upstash-timeout")),
          UPSTASH_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    if (isProd && !allowUnlimited) {
      return {
        ok: false,
        response: failClosedResponse(
          err instanceof Error ? err.message : "upstash-error",
        ),
      };
    }
    return { ok: true, remaining: opts.defaultLimit };
  }

  if (hour.success) return { ok: true, remaining: hour.remaining };

  const retryAfterSec = Math.max(
    1,
    Math.ceil((hour.reset - Date.now()) / 1000),
  );

  return {
    ok: false,
    response: NextResponse.json(
      { error: opts.quotaMessage },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit-Hour": String(hour.limit),
          "X-RateLimit-Remaining-Hour": String(Math.max(0, hour.remaining)),
        },
      },
    ),
  };
}

export function enforceAiRateLimit(request: Request): Promise<RateLimitResult> {
  return runLimiter(request, {
    pick: (l) => l.ai,
    defaultLimit: 5,
    quotaMessage:
      "Hourly limit reached. You have 5 AI generations per hour. Try again later.",
  });
}

export function enforceShareRateLimit(
  request: Request,
): Promise<RateLimitResult> {
  return runLimiter(request, {
    pick: (l) => l.share,
    defaultLimit: 10,
    quotaMessage:
      "Hourly limit reached. You can create up to 10 share links per hour. Try again later.",
  });
}

// Salted IP hash for abuse triage. Stored on the row so a DB leak doesn't
// expose raw IPs. CRON_SECRET doubles as the salt — if it rotates, existing
// rows just become un-correlatable to new ones (acceptable for triage use).
// In production we refuse to fall back to a literal salt — a known salt
// defeats the hash. Callers should treat `null` as "store NULL for ip_hash".
export function hashIp(ip: string): string | null {
  const salt = process.env.CRON_SECRET;
  if (!salt) {
    if (isProd) return null;
    return createHash("sha256")
      .update(`${ip}:json-forge-dev-salt`)
      .digest("hex")
      .slice(0, 16);
  }
  return createHash("sha256")
    .update(`${ip}:${salt}`)
    .digest("hex")
    .slice(0, 16);
}
