import type { AIProvider } from "./types";
import { HeuristicProvider } from "./heuristic-provider";
import { OpenAIProvider } from "./openai-provider";

let cached: AIProvider | null = null;

/**
 * Factory that selects the intelligence strategy at runtime.
 * Uses the LLM provider only when explicitly enabled AND a key is present;
 * otherwise the fully-functional heuristic engine.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const wantsLLM =
    process.env.AI_PROVIDER === "openai" && !!process.env.OPENAI_API_KEY;
  cached = wantsLLM ? new OpenAIProvider() : new HeuristicProvider();
  return cached;
}

export type { AIProvider } from "./types";
