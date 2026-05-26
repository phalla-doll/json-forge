import "server-only";
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
  perHour: Ratelimit;
};

let cached: Limiters | null = null;

function getLimiters(): Limiters | null {
  if (!url || !token) {
    if (!warned) {
      console.warn(
        "[ratelimit] Upstash creds missing (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN) — AI rate limiting disabled.",
      );
      warned = true;
    }
    return null;
  }
  if (!cached) {
    const redis = new Redis({ url, token });
    cached = {
      perHour: new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(5, "1 h"),
        prefix: "json-forge:ai:hour",
        analytics: false,
      }),
    };
  }
  return cached;
}

function getClientIp(request: Request): string {
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

export async function enforceAiRateLimit(
  request: Request,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) {
    // Fail closed in production unless the operator explicitly opts out.
    if (isProd && !allowUnlimited) {
      return {
        ok: false,
        response: failClosedResponse("Upstash creds missing in production"),
      };
    }
    return { ok: true, remaining: 5 };
  }

  const ip = getClientIp(request);

  let hour: Awaited<ReturnType<typeof limiters.perHour.limit>>;
  try {
    hour = await Promise.race([
      limiters.perHour.limit(ip),
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
    return { ok: true, remaining: 5 };
  }

  if (hour.success) return { ok: true, remaining: hour.remaining };

  const retryAfterSec = Math.max(
    1,
    Math.ceil((hour.reset - Date.now()) / 1000),
  );

  return {
    ok: false,
    response: NextResponse.json(
      {
        error:
          "Hourly limit reached. You have 5 AI generations per hour. Try again later.",
      },
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
