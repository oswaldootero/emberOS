import OpenAI from "openai";
import { env } from "./env";

let _client: OpenAI | null = null;

export function openai() {
  if (_client) return _client;
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _client;
}

export const MODELS = {
  primary: () => env.OPENAI_MODEL_PRIMARY,
  fast: () => env.OPENAI_MODEL_FAST,
  embedding: () => env.OPENAI_EMBEDDING_MODEL,
} as const;

/**
 * Pricing per 1M tokens (USD) for the most common Heaven's Leaf models.
 * Adjust if/when OpenAI pricing changes. Used to estimate AIJob.costUsd.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2.0, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
) {
  const p = PRICING[model] ?? PRICING["gpt-4o"];
  return (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
}
