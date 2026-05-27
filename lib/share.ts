export type ShareExpiry = "1h" | "1d" | "7d" | "30d";

export type ShareOptions = {
    expiresIn?: ShareExpiry;
    readOnly?: boolean;
};

export type ShareResult = {
    slug: string;
    url: string;
    expiresAt: number;
    readOnly: boolean;
    expiresIn: ShareExpiry;
};

export async function createShare(
    json: string,
    options: ShareOptions = {},
): Promise<ShareResult> {
    const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            json,
            expiresIn: options.expiresIn ?? "30d",
            readOnly: options.readOnly === true,
        }),
    });
    const data = (await res
        .json()
        .catch(() => ({}))) as Partial<ShareResult> & {
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
        readOnly: data.readOnly === true,
        expiresIn: (data.expiresIn as ShareExpiry) ?? "30d",
    };
}
