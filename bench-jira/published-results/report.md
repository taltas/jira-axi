# Jira CLI Benchmark Results

Live benchmark run with the OpenCode agent backend. Each condition/task was run
up to 3 times against a real Jira Cloud sandbox (project `KAN`). Task success is
graded by an LLM judge. Cost is a fixed token-price proxy, not billed cost.

Run command:

```sh
pnpm --dir bench-jira run bench -- matrix --repeat 3
```

## Summary

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Avg Commands | Success% | Grading |
|-----------|------|------------------|----------------|--------------|-----------|--------------|----------|---------|
| jira-cli | 24 | 94,127 | $0.0726 | 78.6s | 9.5 | 7.4 | 63% | llm-graded |
| jira-axi | 24 | 30,321 | $0.0237 | 23.6s | 4.3 | 3.5 | 100% | llm-graded |

**Headline:** `jira-axi` completed every task (24/24) while the raw `jira` CLI
succeeded on 15/24 runs (63%). On average `jira-axi` used **3.1x fewer input
tokens**, cost **3.1x less**, ran **3.3x faster**, and needed **2.2x fewer
agent turns** to reach the answer.

## Per-Task Breakdown

### newest_open_issue

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 77,373 | $0.0591 | 81.7s | 8.7 | 2/3 |
| jira-axi | 3 | 30,358 | $0.0209 | 16.4s | 4.3 | 3/3 |

### view_recent_issue

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 69,588 | $0.0466 | 65.3s | 7.3 | 2/3 |
| jira-axi | 3 | 35,194 | $0.0251 | 19.7s | 5.0 | 3/3 |

### recent_project_issues

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 60,700 | $0.0457 | 68.3s | 7.0 | 0/3 |
| jira-axi | 3 | 25,327 | $0.0185 | 24.9s | 3.7 | 3/3 |

### open_issue_count_jql

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 113,124 | $0.1023 | 64.3s | 9.0 | 2/3 |
| jira-axi | 3 | 20,235 | $0.0178 | 14.1s | 3.0 | 3/3 |

### find_project

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 83,800 | $0.0632 | 62.0s | 10.0 | 2/3 |
| jira-axi | 3 | 13,261 | $0.0096 | 9.1s | 2.0 | 3/3 |

### newest_bug_last_commenter

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 151,522 | $0.1102 | 101.5s | 14.7 | 2/3 |
| jira-axi | 3 | 54,587 | $0.0491 | 58.3s | 7.3 | 3/3 |

### oldest_assigned_to_me

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 80,842 | $0.0665 | 53.2s | 8.7 | 2/3 |
| jira-axi | 3 | 27,686 | $0.0198 | 17.3s | 4.0 | 3/3 |

### newest_open_issue_comments

| Condition | Runs | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success |
|-----------|------|------------------|----------------|--------------|-----------|---------|
| jira-cli | 3 | 116,068 | $0.0873 | 132.4s | 10.7 | 3/3 |
| jira-axi | 3 | 35,921 | $0.0291 | 29.4s | 5.0 | 3/3 |

## How to read this

The raw `jira` CLI exposes a large, inconsistently-flagged command surface; the
agent spends many turns reading help text and guessing flags, and still fails
on roughly a third of tasks. `jira-axi` exposes a compact, typed AXI schema, so
the agent reaches the correct endpoint in 2-4 turns and never failed a task in
this run. The widest token gaps appear on the hardest tasks
(`newest_bug_last_commenter`: 151k vs 55k; `open_issue_count_jql`: 113k vs 20k).
