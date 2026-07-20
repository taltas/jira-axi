import { describe, expect, it } from "vitest";
import { buildGradingPrompt, formatTrajectory } from "../src/grader.js";

describe("grader formatting", () => {
  it("extracts OpenCode commands and answers", () => {
    const raw = [
      JSON.stringify({
        type: "tool_use",
        part: {
          type: "tool",
          tool: "bash",
          state: {
            input: { command: "jira me" },
            output: "Captain",
            metadata: { exit: 0 },
          },
        },
      }),
      JSON.stringify({ type: "text", part: { type: "text", text: "Captain" } }),
    ].join("\n");
    const trajectory = formatTrajectory(raw);
    expect(trajectory).toContain("COMMAND: jira me");
    expect(trajectory).toContain("OUTPUT: Captain");
    expect(trajectory).toContain("AGENT: Captain");
  });

  it("builds a constrained judge prompt", () => {
    const prompt = buildGradingPrompt(
      "List issues",
      "COMMAND: jira issue list",
      "Must report a key",
    );
    expect(prompt).toContain("TASK: List issues");
    expect(prompt).toContain("GRADING HINT: Must report a key");
    expect(prompt).toContain("Do not run commands");
  });
});
