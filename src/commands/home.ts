import {
  countIssues,
  issueRow,
  searchIssues,
  statusCounts,
} from "../issues.js";
import type { JiraClient } from "../jira.js";
import { render, renderHelp, renderOutput } from "../toon.js";

export async function homeCommand(
  _args: string[],
  client: JiraClient,
): Promise<string> {
  const filter = "statusCategory != Done";
  const [response, openIssues] = await Promise.all([
    searchIssues(client, `${filter} ORDER BY updated DESC`, 5),
    countIssues(client, filter),
  ]);
  const recentIssues = response.issues.map(issueRow);
  return renderOutput([
    render({
      dashboard: {
        open_issues: openIssues,
        count_is_approximate: "yes",
        shown: recentIssues.length,
      },
      status_counts: statusCounts(recentIssues),
      recent_issues: recentIssues,
    }),
    renderHelp([
      "Run `jira-axi issue list --project KEY` to focus on a project",
      "Run `jira-axi search --jql <JQL>` for advanced queries",
      "Run `jira-axi project list` to discover project keys",
    ]),
  ]);
}
