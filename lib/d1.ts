import "server-only";

// Thin wrapper around the Cloudflare D1 REST API. Lets us call D1 from a
// Vercel-hosted Next.js runtime without migrating off Vercel.
//
// Auth: bearer token with scope `Account → D1 → Edit`.
// Docs: https://developers.cloudflare.com/api/operations/cloudflare-d1-query-database

const D1_TIMEOUT_MS = 5000;

type D1QueryResult<T> = {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
};

type D1Envelope<T> = {
  success: boolean;
  errors: { code?: number; message: string }[];
  messages: { code?: number; message: string }[];
  result: D1QueryResult<T>[];
};

export type D1Param = string | number | null;

export class D1Error extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "D1Error";
  }
}

type Config = {
  accountId: string;
  databaseId: string;
  token: string;
};

let cachedConfig: Config | null = null;
let warnedMisconfig = false;

function getConfig(): Config {
  if (cachedConfig) return cachedConfig;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_D1_API_TOKEN;
  if (!accountId || !databaseId || !token) {
    if (!warnedMisconfig) {
      console.warn(
        "[d1] D1 not configured: set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_API_TOKEN. Share routes will return 503 until set.",
      );
      warnedMisconfig = true;
    }
    throw new D1Error("D1 not configured");
  }
  cachedConfig = { accountId, databaseId, token };
  return cachedConfig;
}

async function callD1<T>(
  sql: string,
  params: D1Param[],
): Promise<D1QueryResult<T>> {
  const cfg = getConfig();
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), D1_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? "timeout"
        : err instanceof Error
          ? err.message
          : "network-error";
    throw new D1Error(`D1 request failed: ${reason}`);
  } finally {
    clearTimeout(timer);
  }

  let envelope: D1Envelope<T>;
  try {
    envelope = (await res.json()) as D1Envelope<T>;
  } catch {
    throw new D1Error(
      `D1 returned non-JSON response (status ${res.status})`,
      res.status,
    );
  }

  if (!res.ok || !envelope.success) {
    const msg =
      envelope.errors?.map((e) => e.message).join("; ") ||
      `D1 request rejected (status ${res.status})`;
    throw new D1Error(msg, res.status);
  }

  const first = envelope.result?.[0];
  if (!first) throw new D1Error("D1 returned empty result envelope");
  return first;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: D1Param[] = [],
): Promise<T[]> {
  const result = await callD1<T>(sql, params);
  return result.results;
}

export async function execute(
  sql: string,
  params: D1Param[] = [],
): Promise<{ changes: number }> {
  const result = await callD1<never>(sql, params);
  return { changes: result.meta.changes ?? 0 };
}
