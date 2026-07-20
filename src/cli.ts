import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { issueCommand, ISSUE_HELP } from "./commands/issue.js";
import { projectCommand, PROJECT_HELP } from "./commands/project.js";
import { searchCommand, SEARCH_HELP } from "./commands/search.js";
import { setupCommand, SETUP_HELP } from "./commands/setup.js";
import { createJiraClient, type JiraClient } from "./jira.js";

export const DESCRIPTION =
  "Agent ergonomic CLI for Jira Cloud with token-efficient TOON output and contextual next steps.";

export const TOP_HELP = `usage: jira-axi [command] [args] [flags]
commands[5]:
  (none)=dashboard, issue, search, project, setup
flags[2]:
  --help, -v/-V/--version
examples:
  jira-axi
  jira-axi issue list --project ENG
  jira-axi issue view ENG-42
  jira-axi search --jql "assignee = currentUser()"
  jira-axi project list
  jira-axi setup`;

interface MainOptions {
  argv?: string[];
  stdout?: Pick<NodeJS.WriteStream, "write">;
  client?: JiraClient;
}

export async function main(options: MainOptions = {}): Promise<void> {
  const client = (): JiraClient => options.client ?? createJiraClient();
  await runAxiCli({
    ...(options.argv ? { argv: options.argv } : {}),
    ...(options.stdout ? { stdout: options.stdout } : {}),
    description: DESCRIPTION,
    version: readPackageVersion(),
    topLevelHelp: TOP_HELP,
    home: (args) => homeCommand(args, client()),
    commands: {
      issue: (args) => issueCommand(args, client()),
      search: (args) => searchCommand(args, client()),
      project: (args) => projectCommand(args, client()),
      setup: (args) => setupCommand(args, client()),
    },
    getCommandHelp: (command) =>
      ({
        issue: ISSUE_HELP,
        search: SEARCH_HELP,
        project: PROJECT_HELP,
        setup: SETUP_HELP,
      })[command],
  });
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    join(here, "..", "package.json"),
    join(here, "..", "..", "package.json"),
  ]) {
    if (!existsSync(candidate)) continue;
    const parsed = JSON.parse(readFileSync(candidate, "utf8")) as {
      version?: unknown;
    };
    if (typeof parsed.version === "string") return parsed.version;
  }
  throw new Error("Could not determine jira-axi package version");
}
