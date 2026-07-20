import { assertKnownFlags, hasFlag } from "../args.js";
import type { JiraUser } from "../issues.js";
import type { JiraClient } from "../jira.js";
import { render, renderHelp, renderOutput } from "../toon.js";

export const SETUP_HELP = `usage: jira-axi setup
Verifies JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN against Jira Cloud.
Create a token at https://id.atlassian.com/manage-profile/security/api-tokens`;

export async function setupCommand(
  args: string[],
  client: JiraClient,
): Promise<string> {
  if (hasFlag(args, "--help")) return SETUP_HELP;
  assertKnownFlags(args, []);
  const user = await client.request<JiraUser & { active?: boolean }>(
    "/rest/api/3/myself",
  );
  return renderOutput([
    render({
      setup: {
        status: "authenticated",
        base_url: client.baseUrl,
        account_id: user.accountId ?? "unknown",
        user: user.displayName ?? user.emailAddress ?? "unknown",
        active: user.active ?? true,
      },
    }),
    renderHelp([
      `Export JIRA_BASE_URL="${client.baseUrl}" in future agent sessions`,
      'Export JIRA_EMAIL="you@example.com" and JIRA_API_TOKEN="your-api-token"',
      "Run `jira-axi` for the dashboard",
    ]),
  ]);
}
