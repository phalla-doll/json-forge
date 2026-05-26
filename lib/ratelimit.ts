import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

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
  | { ok: true; remaining: number }
  | { ok: false; response: NextResponse };

export async function enforceAiRateLimit(
  request: Request,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return { ok: true, remaining: 5 };

  const ip = getClientIp(request);
  const hour = await limiters.perHour.limit(ip);

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
