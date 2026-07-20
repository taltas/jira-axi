import {
  assertKnownFlags,
  getOptionalFlag,
  hasFlag,
  parseLimit,
  requireFlag,
  requirePositional,
} from "../args.js";
import { AxiError } from "../errors.js";
import {
  countIssues,
  issueRow,
  jqlString,
  searchIssues,
  statusCounts,
  userName,
  type JiraIssue,
} from "../issues.js";
import type { JiraClient } from "../jira.js";
import {
  adfToText,
  render,
  renderHelp,
  renderOutput,
  textToAdf,
  truncate,
} from "../toon.js";

export const ISSUE_HELP = `usage: jira-axi issue <subcommand> [flags]
subcommands[4]:
  list, view <KEY>, create, comment <KEY>
flags{list}:
  --project <KEY>, --status <name>, --assignee <accountId|me>, --limit <n> (default 30)
flags{view}:
  --full (show complete description and last comment)
flags{create}:
  --project <KEY> --summary <text> (required), --description <text>, --type <name> (default Task)
flags{comment}:
  --text <text> (required)
examples:
  jira-axi issue list --project ENG --status "In Progress"
  jira-axi issue view ENG-42
  jira-axi issue create --project ENG --summary "Fix login" --type Bug
  jira-axi issue comment ENG-42 --text "Reproduced in production"`;

const SUBCOMMAND_HELP: Record<string, string> = {
  list: `usage: jira-axi issue list [--project KEY] [--status <name>] [--assignee <accountId|me>] [--limit N]`,
  view: `usage: jira-axi issue view <KEY> [--full]`,
  create: `usage: jira-axi issue create --project KEY --summary <text> [--description <text>] [--type <name>]`,
  comment: `usage: jira-axi issue comment <KEY> --text <text>`,
};

export async function issueCommand(
  args: string[],
  client: JiraClient,
): Promise<string> {
  const subcommand = args[0];
  if (!subcommand) return ISSUE_HELP;
  if (hasFlag(args, "--help")) return SUBCOMMAND_HELP[subcommand] ?? ISSUE_HELP;

  switch (subcommand) {
    case "list":
      return listIssues(args, client);
    case "view":
      return viewIssue(args, client);
    case "create":
      return createIssue(args, client);
    case "comment":
      return commentIssue(args, client);
    default:
      throw new AxiError(
        `Unknown issue subcommand: ${subcommand}`,
        "VALIDATION_ERROR",
        ["Run `jira-axi issue --help` for usage"],
      );
  }
}

async function listIssues(args: string[], client: JiraClient): Promise<string> {
  assertKnownFlags(args, ["--project", "--status", "--assignee", "--limit"]);
  const clauses: string[] = [];
  const project = getOptionalFlag(args, "--project");
  const status = getOptionalFlag(args, "--status");
  const assignee = getOptionalFlag(args, "--assignee");
  const limit = parseLimit(args, 30);
  if (project) clauses.push(`project = ${jqlString(project)}`);
  if (status) clauses.push(`status = ${jqlString(status)}`);
  if (assignee) {
    clauses.push(
      assignee === "me"
        ? "assignee = currentUser()"
        : `assignee = ${jqlString(assignee)}`,
    );
  }
  const jql = `${clauses.length ? clauses.join(" AND ") : "ORDER BY updated DESC"}${
    clauses.length ? " ORDER BY updated DESC" : ""
  }`;
  const countJql = clauses.length
    ? clauses.join(" AND ")
    : "ORDER BY updated DESC";
  const [response, count] = await Promise.all([
    searchIssues(client, jql, limit),
    countIssues(client, countJql),
  ]);
  const issues = response.issues.map(issueRow);

  return renderOutput([
    render({
      count,
      count_is_approximate: "yes",
      returned: issues.length,
      status_counts: statusCounts(issues),
      issues,
    }),
    renderHelp(
      issues.length
        ? [`Run \`jira-axi issue view ${issues[0].key}\` for full details`]
        : ["Broaden the filters or run `jira-axi search --jql <JQL>`"],
    ),
  ]);
}

async function viewIssue(args: string[], client: JiraClient): Promise<string> {
  assertKnownFlags(args, ["--full"]);
  const key = requirePositional(args, 1, "issue key");
  const full = hasFlag(args, "--full");
  const fields = "summary,status,assignee,reporter,description,comment";
  const encodedKey = encodeURIComponent(key);
  const [issue, latestComments] = await Promise.all([
    client.request<JiraIssue>(
      `/rest/api/3/issue/${encodedKey}?fields=${fields}`,
    ),
    client.request<{
      total?: number;
      comments?: Array<{
        author?: {
          displayName?: string;
          emailAddress?: string;
          accountId?: string;
        };
        body?: unknown;
        created?: string;
      }>;
    }>(`/rest/api/3/issue/${encodedKey}/comment?orderBy=-created&maxResults=1`),
  ]);
  const embeddedComments = issue.fields.comment?.comments ?? [];
  const last = latestComments.comments?.[0];
  const description = truncate(
    adfToText(issue.fields.description),
    1_000,
    full,
  );
  const lastComment = last
    ? {
        author: userName(last.author),
        created: last.created ?? "unknown",
        text: truncate(adfToText(last.body), 500, full),
      }
    : null;

  return render({
    issue: {
      key: issue.key,
      summary: issue.fields.summary ?? "",
      status: issue.fields.status?.name ?? "unknown",
      assignee: userName(issue.fields.assignee),
      reporter: userName(issue.fields.reporter),
      description: description || "none",
      comments_count:
        latestComments.total ??
        issue.fields.comment?.total ??
        embeddedComments.length,
      last_comment: lastComment,
    },
  });
}

async function createIssue(
  args: string[],
  client: JiraClient,
): Promise<string> {
  assertKnownFlags(args, ["--project", "--summary", "--description", "--type"]);
  const project = requireFlag(args, "--project");
  const summary = requireFlag(args, "--summary");
  const description = getOptionalFlag(args, "--description");
  const type = getOptionalFlag(args, "--type") ?? "Task";
  const fields: Record<string, unknown> = {
    project: { key: project },
    summary,
    issuetype: { name: type },
  };
  if (description !== undefined) fields.description = textToAdf(description);
  const created = await client.request<{
    id: string;
    key: string;
    self?: string;
  }>("/rest/api/3/issue", { method: "POST", body: JSON.stringify({ fields }) });
  return renderOutput([
    render({ issue: { key: created.key, id: created.id, status: "created" } }),
    renderHelp([
      `Run \`jira-axi issue view ${created.key}\` to inspect the new issue`,
    ]),
  ]);
}

async function commentIssue(
  args: string[],
  client: JiraClient,
): Promise<string> {
  assertKnownFlags(args, ["--text"]);
  const key = requirePositional(args, 1, "issue key");
  const text = requireFlag(args, "--text");
  const comment = await client.request<{ id: string; created?: string }>(
    `/rest/api/3/issue/${encodeURIComponent(key)}/comment`,
    { method: "POST", body: JSON.stringify({ body: textToAdf(text) }) },
  );
  return renderOutput([
    render({ comment: { issue: key, id: comment.id, status: "created" } }),
    renderHelp([`Run \`jira-axi issue view ${key}\` to see the issue`]),
  ]);
}
