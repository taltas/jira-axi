import { describe, expect, it } from "vitest";
import { extractFinalOutput, parseOpenCodeJsonl } from "../src/usage.js";

describe("parseOpenCodeJsonl", () => {
  it("parses usage, cache, turns, and bash commands", () => {
    const raw = [
      JSON.stringify({
        type: "tool_use",
        part: {
          type: "tool",
          tool: "bash",
          state: {
            status: "completed",
            input: { command: "jira issue list" },
            metadata: { exit: 0 },
          },
        },
      }),
      JSON.stringify({
        type: "step_finish",
        part: {
          type: "step-finish",
          tokens: { input: 800, output: 50, cache: { read: 200 } },
        },
      }),
      JSON.stringify({ type: "text", part: { type: "text", text: "ABC-1" } }),
    ].join("\n");
    const usage = parseOpenCodeJsonl(raw, { wallClockSeconds: 2 });
    expect(usage.input_tokens).toBe(1000);
    expect(usage.input_tokens_cached).toBe(200);
    expect(usage.output_tokens).toBe(50);
    expect(usage.turn_count).toBe(1);
    expect(usage.command_count).toBe(1);
    expect(usage.command_log).toEqual(["jira issue list"]);
    expect(usage.wall_clock_seconds).toBe(2);
    expect(usage.cost_proxy_usd).toBeGreaterThan(0);
    expect(extractFinalOutput(raw)).toBe("ABC-1");
  });

  it("counts failed commands", () => {
    const raw = JSON.stringify({
      type: "tool_use",
      part: {
        type: "tool",
        tool: "bash",
        state: {
          status: "completed",
          input: { command: "jira issue view BAD-1" },
          metadata: { exit: 1 },
        },
      },
    });
    expect(parseOpenCodeJsonl(raw).error_count).toBe(1);
  });
});
