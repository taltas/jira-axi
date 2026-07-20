import { describe, expect, it } from "vitest";
import { markdownReport } from "../src/reporter.js";

describe("markdownReport", () => {
  it("does not invent pending metrics", () => {
    const report = markdownReport([]);
    expect(report).toContain("Results pending");
    expect(report).not.toContain("| jira-cli |");
  });

  it("summarizes real run records", () => {
    const report = markdownReport([
      {
        condition: "jira-axi",
        task: "newest_open_issue",
        run: 1,
        model: "openai/test",
        timestamp: "2026-07-20T00:00:00.000Z",
        usage: {
          input_tokens: 100,
          input_tokens_cached: 20,
          input_tokens_uncached: 80,
          output_tokens: 10,
          cost_proxy_usd: 0.001,
          wall_clock_seconds: 2,
          turn_count: 1,
          command_count: 1,
          error_count: 0,
          command_log: [],
        },
        grade: {
          task_success: true,
          details: "ok",
          grading_mode: "llm-graded",
        },
        agent_output: "ABC-1",
      },
    ]);
    expect(report).toContain(
      "| jira-axi | 1 | 100 | $0.0010 | 2.0s | 1.0 | 1.0 | 100% | llm-graded |",
    );
  });
});
