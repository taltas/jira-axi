#!/usr/bin/env tsx
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { writeReports } from "./reporter.js";
import {
  assertLocalJiraAxiBuild,
  checkCommand,
  LOCAL_JIRA_AXI,
  runOne,
} from "./runner.js";
import type { ConditionDef, ConditionId, TaskDef } from "./types.js";

const BENCH_ROOT = resolve(import.meta.dirname, "..");
const CONFIG_DIR = join(BENCH_ROOT, "config");
const RESULTS_PATH = join(BENCH_ROOT, "results", "results.jsonl");
const DEFAULT_MODEL = "openai/gpt-5.6-sol";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let index = 0; index < argv.length; index++) {
    if (!argv[index].startsWith("--")) continue;
    const key = argv[index].slice(2);
    const value =
      argv[index + 1] && !argv[index + 1].startsWith("--")
        ? argv[++index]
        : "true";
    args[key] = value;
  }
  return args;
}

function loadConditions(): Map<string, ConditionDef> {
  const document = parseYaml(
    readFileSync(join(CONFIG_DIR, "conditions.yaml"), "utf-8"),
  ) as { conditions: Record<string, Omit<ConditionDef, "id">> };
  return new Map(
    Object.entries(document.conditions).map(([id, condition]) => [
      id,
      { ...condition, id: id as ConditionId },
    ]),
  );
}

function loadTasks(projectKey: string): Map<string, TaskDef> {
  const raw = readFileSync(join(CONFIG_DIR, "tasks.yaml"), "utf-8").replaceAll(
    "{{project_key}}",
    projectKey,
  );
  const document = parseYaml(raw) as {
    tasks: Record<string, Omit<TaskDef, "id">>;
  };
  return new Map(
    Object.entries(document.tasks).map(([id, task]) => [id, { ...task, id }]),
  );
}

function discoverProjectKey(conditionIds: string[]): string {
  if (process.env.JIRA_BENCH_PROJECT_KEY)
    return process.env.JIRA_BENCH_PROJECT_KEY;
  const output = conditionIds.includes("jira-cli")
    ? checkCommand("jira", ["project", "list", "--plain"])
    : checkCommand("node", [LOCAL_JIRA_AXI, "project", "list"]);
  const excluded = new Set(["KEY", "NAME", "TYPE", "LEAD", "PROJECT"]);
  for (const line of output.split("\n")) {
    const candidate = line.trim().split(/[\s,]+/)[0];
    if (/^[A-Z][A-Z0-9_]*$/.test(candidate) && !excluded.has(candidate))
      return candidate;
  }
  throw new Error(
    "Could not discover a Jira project key. Set JIRA_BENCH_PROJECT_KEY explicitly.",
  );
}

function preflight(conditionIds: string[]): string {
  checkCommand("opencode", ["run", "--pure", "reply ready"]);
  if (conditionIds.includes("jira-cli")) checkCommand("jira", ["me"]);
  if (conditionIds.includes("jira-axi")) {
    assertLocalJiraAxiBuild();
  }
  const projectKey = discoverProjectKey(conditionIds);
  if (conditionIds.includes("jira-axi")) {
    checkCommand("node", [
      LOCAL_JIRA_AXI,
      "issue",
      "list",
      "--project",
      projectKey,
      "--limit",
      "1",
    ]);
  }
  console.log(`Preflight passed for Jira project ${projectKey}.`);
  return projectKey;
}

function clearResults(conditionIds: string[]): void {
  mkdirSync(join(BENCH_ROOT, "results"), { recursive: true });
  if (!existsSync(RESULTS_PATH)) return writeFileSync(RESULTS_PATH, "");
  const kept = readFileSync(RESULTS_PATH, "utf-8")
    .split("\n")
    .filter((line) => {
      if (!line) return false;
      return !conditionIds.includes(
        (JSON.parse(line) as { condition: string }).condition,
      );
    });
  writeFileSync(RESULTS_PATH, kept.length ? `${kept.join("\n")}\n` : "");
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error("--repeat must be a positive integer");
  return parsed;
}

function runMatrix(argv: string[], singleTask = false): void {
  const args = parseArgs(argv);
  const conditions = loadConditions();
  const conditionIds = args.condition
    ? args.condition.split(",")
    : [...conditions.keys()];
  for (const id of conditionIds)
    if (!conditions.has(id)) throw new Error(`Unknown condition: ${id}`);
  const projectKey = preflight(conditionIds);
  const tasks = loadTasks(projectKey);
  let taskIds = args.task ? args.task.split(",") : [...tasks.keys()];
  if (singleTask && !args.task) throw new Error("run requires --task <id>");
  if (singleTask && !args.condition)
    throw new Error("run requires --condition <id>");
  if (args.category)
    taskIds = taskIds.filter((id) => tasks.get(id)?.category === args.category);
  for (const id of taskIds)
    if (!tasks.has(id)) throw new Error(`Unknown task: ${id}`);
  const mutationTasks = taskIds.filter((id) => tasks.get(id)?.mutates);
  const includeMutations = args["include-mutations"] === "true";
  if (!includeMutations) {
    if (args.task && mutationTasks.length > 0) {
      throw new Error("Mutation tasks require --include-mutations.");
    }
    taskIds = taskIds.filter((id) => !tasks.get(id)?.mutates);
  }
  if (
    includeMutations &&
    mutationTasks.length > 0 &&
    !process.env.JIRA_BENCH_PROJECT_KEY
  ) {
    throw new Error(
      "Mutation tasks require an explicit JIRA_BENCH_PROJECT_KEY; automatic project discovery is not allowed.",
    );
  }

  const repeat = positiveInteger(args.repeat, 1);
  const model = args.model ?? DEFAULT_MODEL;
  clearResults(conditionIds);
  const total = conditionIds.length * taskIds.length * repeat;
  let completed = 0;
  for (const taskId of taskIds) {
    for (let run = 1; run <= repeat; run++) {
      for (const conditionId of conditionIds) {
        completed++;
        console.log(
          `[${completed}/${total}] ${conditionId} x ${taskId} (run ${run})`,
        );
        const result = runOne(
          { condition: conditionId as ConditionId, task: taskId, run, model },
          conditions.get(conditionId)!,
          tasks.get(taskId)!,
        );
        console.log(
          `  ${result.grade.task_success ? "PASS" : "FAIL"} | ${result.usage.input_tokens} input tokens | ${result.usage.turn_count} turns | ${result.usage.wall_clock_seconds.toFixed(1)}s | ${result.grade.grading_mode}`,
        );
      }
    }
  }
  writeReports();
}

function main(): void {
  const scriptArgs = process.argv.slice(2);
  if (scriptArgs[0] === "--") scriptArgs.shift();
  const [command, ...argv] = scriptArgs;
  if (command === "run") return runMatrix(argv, true);
  if (command === "matrix") return runMatrix(argv);
  if (command === "report") return writeReports();
  console.log(`jira-axi-bench

Commands:
  run      --condition <jira-cli|jira-axi> --task <id> [--repeat N] [--model provider/model]
  matrix   [--condition <id,id>] [--task <id,id>] [--category single_step|multi_step] [--repeat N] [--model provider/model] [--include-mutations]
  report
`);
}

try {
  main();
} catch (error) {
  const processError = error as Error & { stderr?: string };
  console.error(processError.stderr?.trim() || processError.message);
  process.exitCode = 1;
}
