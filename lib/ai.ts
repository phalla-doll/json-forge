export type AiResponse = {
    result: string;
    remaining: number;
};

async function postJson<T>(url: string, payload: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
        result?: string;
        error?: string;
        remaining?: number;
    };
    if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data as T;
}

export const generateJson = async (prompt: string): Promise<AiResponse> => {
    const data = await postJson<AiResponse>("/api/ai/generate", {
        prompt,
    });
    return { result: data.result || "", remaining: data.remaining ?? 0 };
};

export const fixJson = async (
    malformedJson: string,
    errorMessage: string,
): Promise<AiResponse> => {
    const data = await postJson<AiResponse>("/api/ai/fix", {
        json: malformedJson,
        error: errorMessage,
    });
    return { result: data.result || "", remaining: data.remaining ?? 0 };
};

export type SchemaTarget = "typescript" | "zod" | "json-schema";

export const generateTypes = async (
    json: string,
    target: SchemaTarget,
): Promise<AiResponse> => {
    const data = await postJson<AiResponse>("/api/ai/types", {
        json,
        target,
    });
    return { result: data.result || "", remaining: data.remaining ?? 0 };
};
