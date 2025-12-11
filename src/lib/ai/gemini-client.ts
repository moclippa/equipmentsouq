import { GoogleGenerativeAI } from "@google/generative-ai";

// Singleton Gemini client
let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// Model IDs - using stable Gemini 2.5 Flash (June 2025 release)
export const GEMINI_MODELS = {
  // Flash: Fast and capable, good for classification
  flashLite: "gemini-2.5-flash",
  // Flash: Same stable model
  flash: "gemini-2.5-flash",
} as const;

// Helper to check if Gemini is configured
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}
