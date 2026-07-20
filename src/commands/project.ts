import { assertKnownFlags, hasFlag, requirePositional } from "../args.js";
import { AxiError } from "../errors.js";
import type { JiraUser } from "../issues.js";
import { userName } from "../issues.js";
import type { JiraClient } from "../jira.js";
import { render, renderHelp, renderOutput } from "../toon.js";

export const PROJECT_HELP = `usage: jira-axi project <subcommand>
subcommands[2]:
  list, view <KEY>
examples:
  jira-axi project list
  jira-axi project view ENG`;

const PROJECT_SUBCOMMAND_HELP: Record<string, string> = {
  list: "usage: jira-axi project list",
  view: "usage: jira-axi project view <KEY>",
};

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  lead?: JiraUser;
  description?: string;
  issueTypes?: Array<{ id: string; name: string; subtask?: boolean }>;
}

interface ProjectStatusGroup {
  id: string;
  name: string;
  subtask?: boolean;
  statuses?: Array<{ id: string; name: string }>;
}

export async function projectCommand(
  args: string[],
  client: JiraClient,
): Promise<string> {
  const subcommand = args[0];
  if (!subcommand) return PROJECT_HELP;
  if (hasFlag(args, "--help")) {
    return PROJECT_SUBCOMMAND_HELP[subcommand] ?? PROJECT_HELP;
  }
  if (subcommand === "list") {
    assertKnownFlags(args, []);
    return listProjects(client);
  }
  if (subcommand === "view") return viewProject(args, client);
  throw new AxiError(
    `Unknown project subcommand: ${subcommand}`,
    "VALIDATION_ERROR",
    ["Run `jira-axi project --help` for usage"],
  );
}

async function listProjects(client: JiraClient): Promise<string> {
  const response = await client.request<{
    values?: JiraProject[];
    total?: number;
  }>("/rest/api/3/project/search?maxResults=50&orderBy=name");
  const projects = (response.values ?? []).map((project) => ({
    key: project.key,
    name: project.name,
    type: project.projectTypeKey ?? "unknown",
    lead: userName(project.lead),
  }));
  return renderOutput([
    render({
      count: response.total ?? projects.length,
      returned: projects.length,
      projects,
    }),
    renderHelp(
      projects.length
        ? [
            `Run \`jira-axi project view ${projects[0].key}\` for issue types and statuses`,
            ...(response.total !== undefined && response.total > projects.length
              ? [
                  `Project list is truncated: showing ${projects.length} of ${response.total}`,
                ]
              : []),
          ]
        : ["Confirm this account can browse Jira projects"],
    ),
  ]);
}

async function viewProject(
  args: string[],
  client: JiraClient,
): Promise<string> {
  assertKnownFlags(args, []);
  const key = requirePositional(args, 1, "project key");
  const encoded = encodeURIComponent(key);
  const [project, groups] = await Promise.all([
    client.request<JiraProject>(`/rest/api/3/project/${encoded}`),
    client.request<ProjectStatusGroup[]>(
      `/rest/api/3/project/${encoded}/statuses`,
    ),
  ]);
  const issueTypes = groups.map((group) => ({
    issue_type: group.name,
    subtask: group.subtask ? "yes" : "no",
    status_count: group.statuses?.length ?? 0,
    statuses:
      (group.statuses ?? []).map((status) => status.name).join(", ") || "none",
  }));
  return render({
    project: {
      key: project.key,
      name: project.name,
      type: project.projectTypeKey ?? "unknown",
      lead: userName(project.lead),
      description: project.description || "none",
      issue_type_count: issueTypes.length,
    },
    issue_types: issueTypes,
  });
}
