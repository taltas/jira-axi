import type { UsageMetrics } from "./types.js";

const INPUT_PER_TOKEN = 2.5 / 1_000_000;
const CACHED_INPUT_PER_TOKEN = 0.25 / 1_000_000;
const OUTPUT_PER_TOKEN = 15 / 1_000_000;

interface ParseOptions {
  wallClockSeconds?: number;
}

export function parseOpenCodeJsonl(
  raw: string,
  options: ParseOptions = {},
): UsageMetrics {
  let inputTokensUncached = 0;
  let inputTokensCached = 0;
  let outputTokens = 0;
  let turnCount = 0;
  let commandCount = 0;
  let errorCount = 0;
  const commandLog: string[] = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    const part = (event.part ?? {}) as Record<string, unknown>;
    if (event.type === "step_finish" && part.type === "step-finish") {
      turnCount++;
      const tokens = (part.tokens ?? {}) as Record<string, unknown>;
      const cache = (tokens.cache ?? {}) as Record<string, unknown>;
      inputTokensUncached += Number(tokens.input ?? 0);
      inputTokensCached += Number(cache.read ?? 0);
      outputTokens += Number(tokens.output ?? 0);
    }

    if (
      event.type === "tool_use" &&
      part.type === "tool" &&
      part.tool === "bash"
    ) {
      commandCount++;
      const state = (part.state ?? {}) as Record<string, unknown>;
      const input = (state.input ?? {}) as Record<string, unknown>;
      const metadata = (state.metadata ?? {}) as Record<string, unknown>;
      if (typeof input.command === "string") commandLog.push(input.command);
      if (state.status === "error" || Number(metadata.exit ?? 0) !== 0)
        errorCount++;
    }
  }

  const inputTokens = inputTokensUncached + inputTokensCached;
  const costProxy =
    inputTokensUncached * INPUT_PER_TOKEN +
    inputTokensCached * CACHED_INPUT_PER_TOKEN +
    outputTokens * OUTPUT_PER_TOKEN;

  return {
    input_tokens: inputTokens,
    input_tokens_cached: inputTokensCached,
    input_tokens_uncached: inputTokensUncached,
    output_tokens: outputTokens,
    cost_proxy_usd: costProxy,
    wall_clock_seconds: options.wallClockSeconds ?? 0,
    turn_count: turnCount,
    command_count: commandCount,
    error_count: errorCount,
    command_log: commandLog,
  };
}

export function extractFinalOutput(raw: string): string {
  const parts: string[] = [];
  for (const line of raw.split("\n")) {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const part = (event.part ?? {}) as Record<string, unknown>;
      if (
        event.type === "text" &&
        part.type === "text" &&
        typeof part.text === "string"
      ) {
        parts.push(part.text);
      }
    } catch {
      continue;
    }
  }
  return parts.join("\n").trim();
}
