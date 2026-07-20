---
name: jira-axi
description: "Operate Jira Cloud through the jira-axi CLI - browse, search, create, and comment on issues; inspect projects; and verify authentication. Use whenever a task touches Jira issue tracking or project management."
user-invocable: false
author: taltas
metadata:
  hermes:
    tags: [jira, issue-tracking, project-management]
    category: productivity
---

# jira-axi

Agent ergonomic CLI for Jira Cloud with token-efficient TOON output and contextual next steps.

No global install is required. Run it on demand with `npx -y jira-axi <command>`. If output suggests a command beginning with `jira-axi`, run that suggestion as `npx -y jira-axi ...`.

## Authentication

Set all three environment variables before calling Jira:

- `JIRA_BASE_URL`: Jira Cloud site URL, such as `https://example.atlassian.net`
- `JIRA_EMAIL`: Atlassian account email
- `JIRA_API_TOKEN`: API token from https://id.atlassian.com/manage-profile/security/api-tokens

Run `npx -y jira-axi setup` to verify them. Never print or include `JIRA_API_TOKEN` in prompts, logs, or command arguments.

## Workflow

1. Run `npx -y jira-axi` for the open-issue dashboard and suggested next steps.
2. Discover project keys with `npx -y jira-axi project list`.
3. Narrow work with `issue list --project KEY` or `search --jql "..."`.
4. Inspect an issue with `issue view KEY`; add `--full` only when complete long text is needed.
5. Follow the contextual commands under `help:`.

## Commands

```text
commands[5]:
  (none)=dashboard, issue, search, project, setup
```

- `issue list [--project KEY] [--status <name>] [--assignee <accountId|me>] [--limit N]`
- `issue view <KEY> [--full]`
- `issue create --project KEY --summary <text> [--description <text>] [--type <name>]`
- `issue comment <KEY> --text <text>`
- `search --jql <JQL> [--limit N]`
- `project list`
- `project view <KEY>`
- `setup`

Run `npx -y jira-axi --help` or `npx -y jira-axi <command> --help` for usage. Output is TOON-encoded; list schemas are intentionally compact and include precomputed counts.
