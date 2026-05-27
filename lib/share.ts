export type ShareResult = {
  slug: string;
  url: string;
  expiresAt: number;
};

export async function createShare(json: string): Promise<ShareResult> {
  const res = await fetch("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<ShareResult> & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  if (!data.slug || !data.url || typeof data.expiresAt !== "number") {
    throw new Error("Malformed share response");
  }
  return {
    slug: data.slug,
    url: data.url,
    expiresAt: data.expiresAt,
  };
}
