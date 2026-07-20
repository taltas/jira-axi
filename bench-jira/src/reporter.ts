import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { RunResult } from "./types.js";

const BENCH_ROOT = resolve(import.meta.dirname, "..");
const RESULTS_DIR = join(BENCH_ROOT, "results");

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items)
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

export function loadResults(): RunResult[] {
  const path = join(RESULTS_DIR, "results.jsonl");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RunResult);
}

export function markdownReport(results = loadResults()): string {
  if (results.length === 0) {
    return "# Jira CLI Benchmark Results\n\nResults pending. No authenticated benchmark runs were available; no numbers are reported.\n";
  }

  const repeats = Math.max(...results.map((result) => result.run));
  const lines = [
    "# Jira CLI Benchmark Results",
    "",
    `OpenCode agent runs with up to ${repeats} repeat${repeats === 1 ? "" : "s"} per condition/task. Cost is a fixed token-price proxy, not billed cost.`,
    "",
    "## Summary",
    "",
    "| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Avg Commands | Success% | Grading |",
    "|-----------|------|------------------|----------------|--------------|-----------|--------------|----------|---------|",
  ];

  for (const [condition, runs] of groupBy(
    results,
    (result) => result.condition,
  )) {
    const success = runs.filter((run) => run.grade.task_success).length;
    const modes = [...new Set(runs.map((run) => run.grade.grading_mode))].join(
      ", ",
    );
    lines.push(
      `| ${condition} | ${runs.length} | ${Math.round(mean(runs.map((run) => run.usage.input_tokens)))} | $${mean(runs.map((run) => run.usage.cost_proxy_usd)).toFixed(4)} | ${mean(runs.map((run) => run.usage.wall_clock_seconds)).toFixed(1)}s | ${mean(runs.map((run) => run.usage.turn_count)).toFixed(1)} | ${mean(runs.map((run) => run.usage.command_count)).toFixed(1)} | ${((success / runs.length) * 100).toFixed(0)}% | ${modes} |`,
    );
  }

  lines.push("", "## Per-Task Breakdown", "");
  for (const [task, taskRuns] of groupBy(results, (result) => result.task)) {
    lines.push(
      `### ${task}`,
      "",
      "| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |",
      "|-----------|------|------------------|----------------|--------------|-----------|---------|",
    );
    for (const [condition, runs] of groupBy(
      taskRuns,
      (result) => result.condition,
    )) {
      const success = runs.filter((run) => run.grade.task_success).length;
      lines.push(
        `| ${condition} | ${runs.length} | ${Math.round(mean(runs.map((run) => run.usage.input_tokens)))} | $${mean(runs.map((run) => run.usage.cost_proxy_usd)).toFixed(4)} | ${mean(runs.map((run) => run.usage.wall_clock_seconds)).toFixed(1)}s | ${mean(runs.map((run) => run.usage.turn_count)).toFixed(1)} | ${success}/${runs.length} |`,
      );
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function writeReports(): void {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const report = markdownReport();
  writeFileSync(join(RESULTS_DIR, "report.md"), report);
  console.log(report);
}
