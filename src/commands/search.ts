import { assertKnownFlags, hasFlag, parseLimit, requireFlag } from "../args.js";
import {
  countIssues,
  issueRow,
  searchIssues,
  statusCounts,
} from "../issues.js";
import type { JiraClient } from "../jira.js";
import { render, renderHelp, renderOutput } from "../toon.js";

export const SEARCH_HELP = `usage: jira-axi search --jql <JQL> [--limit N]
flags[2]:
  --jql <JQL> (required), --limit <n> (default 30)
example:
  jira-axi search --jql "project = ENG AND statusCategory != Done" --limit 20`;

export async function searchCommand(
  args: string[],
  client: JiraClient,
): Promise<string> {
  if (hasFlag(args, "--help")) return SEARCH_HELP;
  assertKnownFlags(args, ["--jql", "--limit"]);
  const jql = requireFlag(args, "--jql");
  const limit = parseLimit(args, 30);
  const [response, count] = await Promise.all([
    searchIssues(client, jql, limit),
    countIssues(client, jql),
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
        : ["Adjust the JQL and retry"],
    ),
  ]);
}
