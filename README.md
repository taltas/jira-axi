<h1 align="center">jira-axi</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/jira-axi"><img alt="npm" src="https://img.shields.io/npm/v/jira-axi?style=flat-square" /></a>
  <a href="https://github.com/taltas/jira-axi/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/taltas/jira-axi/ci.yml?style=flat-square&label=ci" /></a>
  <a href="https://github.com/taltas/jira-axi/actions/workflows/release-please.yml"><img alt="Release" src="https://img.shields.io/github/actions/workflow/status/taltas/jira-axi/release-please.yml?style=flat-square&label=release" /></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square" />
</p>

Jira Cloud CLI for agents, designed with [AXI](https://github.com/kunchenguid/axi) (Agent eXperience Interface).

It provides token-efficient TOON output, compact schemas, contextual next steps, and structured errors over the Jira Cloud REST API.

## Benchmarks

[`bench-jira/`](./bench-jira) compares agent performance using the raw
[`jira`](https://github.com/ankitpokhrel/jira-cli) CLI and `jira-axi`. The
harness runs an OpenCode agent against a real Jira Cloud sandbox and measures
input tokens, a documented cost proxy, duration, turns, command count, and task
success across realistic Jira workflows (up to 3 repeats per condition/task,
LLM-graded). Full per-task detail is in
[`bench-jira/published-results/report.md`](./bench-jira/published-results/report.md).

**Live results (project `KAN`, 24 runs per condition):**

| Condition | Avg Input Tokens | Avg Cost Proxy | Avg Duration | Avg Turns | Success% |
| --------- | ---------------- | -------------- | ------------ | --------- | -------- |
| jira-cli  | 94,127           | $0.0726        | 78.6s        | 9.5       | 63%      |
| jira-axi  | 30,321           | $0.0237        | 23.6s        | 4.3       | 100%     |

`jira-axi` completed every task while the raw CLI failed on roughly a third of
them, and used **3.1x fewer input tokens** at **3.1x lower cost** in **3.3x less
time** on average. The widest gaps appear on the hardest tasks:
`newest_bug_last_commenter` (151k vs 55k tokens) and `open_issue_count_jql`
(113k vs 20k).

## Quick Start

Install the Agent Skill with [`npx skills`](https://github.com/vercel-labs/skills):

```sh
npx skills add taltas/jira-axi --skill jira-axi -g
```

The skill teaches agents to invoke the CLI through `npx -y jira-axi`, so no global install is required. Node 20 or newer is required.

## Environment Setup

Create an Atlassian API token at https://id.atlassian.com/manage-profile/security/api-tokens, then export:

```sh
export JIRA_BASE_URL="https://your-site.atlassian.net"
export JIRA_EMAIL="you@example.com"
export JIRA_API_TOKEN="your-api-token"
npx -y jira-axi setup
```

`jira-axi` uses Basic authentication with the email and API token. Keep the token out of shell history, logs, and prompts.

## Other Ways to Install

### Zero Setup

Run any command directly without installing the package globally:

```sh
npx -y jira-axi issue list --project ENG
```

### Global

```sh
npm install -g jira-axi
jira-axi setup
```

## Usage

```sh
jira-axi                                         # open-issue dashboard
jira-axi issue list --project ENG --limit 20    # compact issue list
jira-axi issue view ENG-42                       # issue details
jira-axi issue view ENG-42 --full                # untruncated text
jira-axi issue create --project ENG --summary "Fix login" --type Bug
jira-axi issue comment ENG-42 --text "Reproduced"
jira-axi search --jql "assignee = currentUser() AND statusCategory != Done"
jira-axi project list
jira-axi project view ENG
jira-axi setup
```

### Commands

| Command         | Description                                                      |
| --------------- | ---------------------------------------------------------------- |
| `issue list`    | List issues with project, status, assignee, and limit filters    |
| `issue view`    | View core fields, description, comment count, and latest comment |
| `issue create`  | Create an issue and suggest the next inspection command          |
| `issue comment` | Add a comment to an issue                                        |
| `search`        | Run JQL with a compact result schema                             |
| `project list`  | List visible Jira projects                                       |
| `project view`  | Show project details plus issue type and status summaries        |
| `setup`         | Verify credentials against `/rest/api/3/myself`                  |
| `update`        | Built-in self-update command inherited from `axi-sdk-js`         |

All command output is TOON. Long descriptions and comments are truncated by default; use `--full` on `issue view` when complete text is necessary.
Issue totals use Jira's approximate-count endpoint and are labeled `count_is_approximate: yes`; `returned` is always the exact number of rows in the response.

## Development

```sh
pnpm install
pnpm run format:check
pnpm run lint
pnpm run build
pnpm test
```

Tests inject a stub Jira client and do not require credentials or network access.

## License

MIT
