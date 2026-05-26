import "server-only"
import { GoogleGenAI } from "@google/genai"

const apiKey = process.env.GEMINI_API_KEY

let cachedClient: GoogleGenAI | null = null

function getClient() {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set")
    }
    if (!cachedClient) {
        cachedClient = new GoogleGenAI({ apiKey })
    }
    return cachedClient
}

const MODEL = "gemini-2.0-flash"

export async function generateJsonOnServer(prompt: string): Promise<string> {
    const response = await getClient().models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
            systemInstruction:
                "You are a specialized JSON generator. Your output must be strictly valid JSON. Do not include markdown formatting (like ```json ... ```). Do not include any conversational text. If the user asks for a specific structure, follow it precisely.",
            responseMimeType: "application/json",
        },
    })
    return response.text || ""
}

export async function fixJsonOnServer(
    malformedJson: string,
    errorMessage: string
): Promise<string> {
    const response = await getClient().models.generateContent({
        model: MODEL,
        contents: `Error: ${errorMessage}\n\nInvalid JSON:\n${malformedJson}`,
        config: {
            systemInstruction:
                "You are a JSON syntax repair engine. You will be provided with invalid JSON and an error message. Correct the syntax errors (such as missing commas, unquoted keys, trailing commas, or mismatched brackets) and return the valid JSON. Do not change the data values unless they cause the syntax error. Return ONLY the raw JSON string without markdown.",
            responseMimeType: "application/json",
        },
    })
    return response.text || ""
}
