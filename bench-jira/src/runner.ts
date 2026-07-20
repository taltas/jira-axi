import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { delimiter, join, resolve } from "node:path";
import type { ConditionDef, RunResult, RunSpec, TaskDef } from "./types.js";
import { grade } from "./grader.js";
import { extractFinalOutput, parseOpenCodeJsonl } from "./usage.js";

const BENCH_ROOT = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(BENCH_ROOT, "..");
const RESULTS_DIR = join(BENCH_ROOT, "results");
const LOCAL_JIRA_AXI = join(REPO_ROOT, "dist", "bin", "jira-axi.js");

function agentEnvironment(condition: ConditionDef): NodeJS.ProcessEnv {
  const names = [
    "HOME",
    "PATH",
    "USER",
    "LOGNAME",
    "SHELL",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "XDG_CONFIG_HOME",
    "TERM",
    "NO_COLOR",
  ];
  if (condition.id === "jira-axi") {
    names.push("JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN");
  }
  return Object.fromEntries(
    names.flatMap((name) =>
      process.env[name] === undefined ? [] : [[name, process.env[name]]],
    ),
  );
}

function writeJiraAxiShim(binDir: string): void {
  mkdirSync(binDir, { recursive: true });
  const shim = join(binDir, "jira-axi");
  writeFileSync(shim, `#!/bin/sh\nexec node "${LOCAL_JIRA_AXI}" "$@"\n`, {
    mode: 0o755,
  });
}

export function runOne(
  spec: RunSpec,
  condition: ConditionDef,
  task: TaskDef,
): RunResult {
  const artifactDir = join(
    RESULTS_DIR,
    spec.condition,
    spec.task,
    `run${spec.run}`,
  );
  const workspaceDir = join(artifactDir, "workspace");
  const binDir = join(workspaceDir, ".bench-bin");
  mkdirSync(workspaceDir, { recursive: true });
  writeFileSync(join(workspaceDir, "AGENTS.md"), condition.agents_md);
  if (condition.id === "jira-axi") writeJiraAxiShim(binDir);

  try {
    const env = {
      ...agentEnvironment(condition),
      PATH:
        condition.id === "jira-axi"
          ? `${binDir}${delimiter}${process.env.PATH ?? ""}`
          : process.env.PATH,
    };
    const started = Date.now();
    const execution = spawnSync(
      "opencode",
      [
        "run",
        "--pure",
        "--format",
        "json",
        "--auto",
        "--model",
        spec.model,
        task.prompt,
      ],
      {
        cwd: workspaceDir,
        env,
        encoding: "utf-8",
        timeout: 5 * 60_000,
        maxBuffer: 50 * 1024 * 1024,
      },
    );
    const wallClockSeconds = (Date.now() - started) / 1000;
    const agentOutput = execution.stdout ?? "";
    writeFileSync(join(artifactDir, "agent_output.jsonl"), agentOutput);
    writeFileSync(join(artifactDir, "stderr.txt"), execution.stderr ?? "");

    if (execution.error) throw execution.error;
    if (execution.status !== 0) {
      throw new Error(
        `OpenCode exited with status ${execution.status ?? "unknown"}: ${(execution.stderr ?? "").trim()}`,
      );
    }

    const usage = parseOpenCodeJsonl(agentOutput, { wallClockSeconds });
    const gradeResult = grade(
      task.grading,
      task.prompt,
      agentOutput,
      artifactDir,
    );
    writeFileSync(
      join(artifactDir, "grade.json"),
      JSON.stringify(gradeResult, null, 2),
    );

    const result: RunResult = {
      condition: spec.condition,
      task: spec.task,
      run: spec.run,
      model: spec.model,
      timestamp: new Date().toISOString(),
      usage,
      grade: gradeResult,
      agent_output: extractFinalOutput(agentOutput).slice(0, 2_000),
    };
    mkdirSync(RESULTS_DIR, { recursive: true });
    appendFileSync(
      join(RESULTS_DIR, "results.jsonl"),
      `${JSON.stringify(result)}\n`,
    );
    return result;
  } finally {
    rmSync(workspaceDir, { recursive: true, force: true });
  }
}

export function assertLocalJiraAxiBuild(): void {
  if (!existsSync(LOCAL_JIRA_AXI)) {
    throw new Error(
      `Local jira-axi build not found at ${LOCAL_JIRA_AXI}. Run pnpm --dir .. run build.`,
    );
  }
}

export function checkCommand(
  command: string,
  args: string[],
  env = process.env,
): string {
  return execFileSync(command, args, {
    encoding: "utf-8",
    timeout: 60_000,
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });
}

export { LOCAL_JIRA_AXI };
