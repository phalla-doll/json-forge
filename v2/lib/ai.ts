async function postJson<T>(url: string, payload: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    const data = (await res.json().catch(() => ({}))) as {
        result?: string
        error?: string
    }
    if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`)
    }
    return data as T
}

export const generateJson = async (prompt: string): Promise<string> => {
    const data = await postJson<{ result: string }>("/api/ai/generate", { prompt })
    return data.result || ""
}

export const fixJson = async (
    malformedJson: string,
    errorMessage: string
): Promise<string> => {
    const data = await postJson<{ result: string }>("/api/ai/fix", {
        json: malformedJson,
        error: errorMessage,
    })
    return data.result || ""
}
