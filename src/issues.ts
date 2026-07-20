import type { JiraClient } from "./jira.js";

export interface JiraUser {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    status?: { name?: string };
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
    description?: unknown;
    updated?: string;
    comment?: {
      total?: number;
      comments?: Array<{
        author?: JiraUser;
        body?: unknown;
        created?: string;
      }>;
    };
  };
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  maxResults?: number;
  isLast?: boolean;
  nextPageToken?: string;
}

export async function countIssues(
  client: JiraClient,
  jql: string,
): Promise<number> {
  const response = await client.request<{ count: number }>(
    "/rest/api/3/search/approximate-count",
    { method: "POST", body: JSON.stringify({ jql }) },
  );
  return response.count;
}

export interface IssueRow {
  key: string;
  summary: string;
  status: string;
  assignee: string;
}

export async function searchIssues(
  client: JiraClient,
  jql: string,
  limit: number,
): Promise<JiraSearchResponse> {
  const params = new URLSearchParams({
    jql,
    maxResults: String(limit),
    fields: "summary,status,assignee,updated",
  });
  return client.request<JiraSearchResponse>(
    `/rest/api/3/search/jql?${params.toString()}`,
  );
}

export function issueRow(issue: JiraIssue): IssueRow {
  return {
    key: issue.key,
    summary: issue.fields.summary ?? "",
    status: issue.fields.status?.name ?? "unknown",
    assignee: userName(issue.fields.assignee),
  };
}

export function userName(user: JiraUser | null | undefined): string {
  return (
    user?.displayName ?? user?.emailAddress ?? user?.accountId ?? "unassigned"
  );
}

export function statusCounts(
  rows: IssueRow[],
): Array<{ status: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return [...counts].map(([status, count]) => ({ status, count }));
}

export function jqlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
