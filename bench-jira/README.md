# Jira CLI Benchmark

This harness compares the raw
[`jira`](https://github.com/ankitpokhrel/jira-cli) CLI with `jira-axi` on the
same Jira tasks and OpenCode agent backend. It mirrors the structure and report
format of `kunchenguid/axi/bench-github`.

## Prerequisites

- `opencode`, authenticated and able to run headlessly
- `jira`, configured in `~/.config/.jira/.config.yml` and authenticated
- `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` for `jira-axi`
- The repository-root `jira-axi` build (`pnpm --dir .. run build`)
- Optional `JIRA_BENCH_PROJECT_KEY`; otherwise the first visible project key is
  discovered using `jira project list --plain`

The matrix preflight runs `jira me`, discovers the project, and runs the local
`jira-axi issue list` before spending agent tokens. It stops on any failure.

## Run

```sh
pnpm install
pnpm run build
pnpm run test
pnpm run bench -- matrix --repeat 3
pnpm run bench -- report
```

Use `--condition jira-cli` or `--condition jira-axi`, `--task <id>`, and
`--category single_step|multi_step` to filter runs. The default agent model is
`openai/gpt-5.6-sol`; override it with `--model`. The judge defaults to
`openai/gpt-5.4-mini` and can be changed with `OPENCODE_JUDGE_MODEL`.

Mutation tasks are excluded by default. Running one requires both an explicit
`JIRA_BENCH_PROJECT_KEY` and `--include-mutations`, for example:

```sh
JIRA_BENCH_PROJECT_KEY=SANDBOX pnpm run bench -- matrix --repeat 1 --include-mutations
```

Each run is written under `results/<condition>/<task>/runN/`, and aggregate
records are appended to `results/results.jsonl`. `results/` is ignored because
raw trajectories may contain Jira data. Publish reviewed aggregate output by
copying `results/report.md` to `published-results/report.md`.

## Metrics And Grading

OpenCode runs with `opencode run --format json --auto` in a temporary workspace.
The JSONL parser records input and output tokens, turns, shell tool calls,
errors, and wall-clock duration. The cost proxy uses fixed rates of $2.50 per
million uncached input tokens, $0.25 per million cached input tokens, and $15.00
per million output tokens. It is a comparison proxy, not a billing claim.

An independent OpenCode call grades each trajectory. If that judge cannot run
or return a verdict, the harness uses normalized exact matching against the
task's `grading_hint` and records `grading_mode: heuristic-graded`; results are
never silently treated as LLM-graded.

The agent receives a minimal environment rather than all ambient shell secrets.
The `jira-axi` condition necessarily receives the three `JIRA_*` credentials;
use only a trusted sandbox whose issue content is controlled. The
`create_issue_and_confirm` task mutates that sandbox by creating one Task per
run. All other tasks are read-only.

## Results

Results are pending. Jira authentication was unavailable in the validation
environment, so no matrix was run and no numbers were fabricated. Run:

```sh
pnpm --dir bench-jira run bench -- matrix --repeat 3
```

with Jira and OpenCode credentials, then review and publish the generated report.
