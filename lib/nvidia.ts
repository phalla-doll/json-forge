import "server-only";
import OpenAI from "openai";

const apiKey = process.env.NVIDIA_API_KEY;

let cachedClient: OpenAI | null = null;

function getClient() {
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not set");
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return cachedClient;
}

const MODEL = process.env.NVIDIA_MODEL || "openai/gpt-oss-120b";

export async function generateJsonOnServer(prompt: string): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a specialized JSON generator. Your output must be strictly valid JSON. Do not include markdown formatting (like ```json ... ```). Do not include any conversational text. If the user asks for a specific structure, follow it precisely.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 1,
    top_p: 1,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || "";
}

export async function fixJsonOnServer(
  malformedJson: string,
  errorMessage: string,
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a JSON syntax repair engine. You will be provided with invalid JSON and an error message. Correct the syntax errors (such as missing commas, unquoted keys, trailing commas, or mismatched brackets) and return the valid JSON. Do not change the data values unless they cause the syntax error. Return ONLY the raw JSON string without markdown.",
      },
      {
        role: "user",
        content: `Error: ${errorMessage}\n\nInvalid JSON:\n${malformedJson}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    top_p: 1,
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || "";
}
