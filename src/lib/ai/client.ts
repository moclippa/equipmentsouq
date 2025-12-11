import Anthropic from "@anthropic-ai/sdk";

// Singleton Anthropic client
let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Default model for different tasks
export const AI_MODELS = {
  vision: "claude-sonnet-4-20250514", // Best for image analysis
  fast: "claude-sonnet-4-20250514", // Good balance of speed and quality
  smart: "claude-sonnet-4-20250514", // Best reasoning
} as const;

// Helper to check if AI is configured
export function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
