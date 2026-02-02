import { GoogleGenAI } from "@google/genai";

// Initialize the client
// The API key is guaranteed to be available in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates JSON data based on a natural language prompt.
 */
export const generateJson = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized JSON generator. Your output must be strictly valid JSON. Do not include markdown formatting (like ```json ... ```). Do not include any conversational text. If the user asks for a specific structure, follow it precisely.",
        responseMimeType: "application/json",
      },
    });
    return response.text || '';
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate JSON. Please try again.");
  }
};

/**
 * Attempts to fix invalid JSON syntax.
 */
export const fixJson = async (malformedJson: string, errorMessage: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Error: ${errorMessage}\n\nInvalid JSON:\n${malformedJson}`,
      config: {
        systemInstruction: "You are a JSON syntax repair engine. You will be provided with invalid JSON and an error message. Correct the syntax errors (such as missing commas, unquoted keys, trailing commas, or mismatched brackets) and return the valid JSON. Do not change the data values unless they cause the syntax error. Return ONLY the raw JSON string without markdown.",
        responseMimeType: "application/json",
      },
    });
    return response.text || '';
  } catch (error) {
    console.error("AI Fix Error:", error);
    throw new Error("Failed to fix JSON syntax.");
  }
};
