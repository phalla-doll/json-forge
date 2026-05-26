import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const url =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let warned = false;

type Limiters = {
  perMinute: Ratelimit;
  perDay: Ratelimit;
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
      perMinute: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        prefix: "json-forge:ai:min",
        analytics: false,
      }),
      perDay: new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(50, "1 d"),
        prefix: "json-forge:ai:day",
        analytics: false,
      }),
    };
  }
  return cached;
}

function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "anonymous";
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function enforceAiRateLimit(
  request: Request,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return { ok: true };

  const ip = getClientIp(request);
  const [minute, day] = await Promise.all([
    limiters.perMinute.limit(ip),
    limiters.perDay.limit(ip),
  ]);

  if (minute.success && day.success) return { ok: true };

  const blocker = !day.success ? day : minute;
  const retryAfterSec = Math.max(
    1,
    Math.ceil((blocker.reset - Date.now()) / 1000),
  );
  const message = !day.success
    ? "Daily AI limit reached. Try again tomorrow."
    : "Too many requests. Slow down for a moment.";

  return {
    ok: false,
    response: NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit-Minute": String(minute.limit),
          "X-RateLimit-Remaining-Minute": String(Math.max(0, minute.remaining)),
          "X-RateLimit-Limit-Day": String(day.limit),
          "X-RateLimit-Remaining-Day": String(Math.max(0, day.remaining)),
        },
      },
    ),
  };
}
