import { AxiError, exitCodeForError } from "axi-sdk-js";

export { AxiError, exitCodeForError };

export type JiraErrorCode =
  | "CONFIG_REQUIRED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "JIRA_ERROR";

export const CONFIG_HELP = [
  "Set JIRA_BASE_URL to your Jira Cloud URL (for example https://site.atlassian.net)",
  "Set JIRA_EMAIL to your Atlassian account email",
  "Set JIRA_API_TOKEN to an API token from https://id.atlassian.com/manage-profile/security/api-tokens",
  "Run `jira-axi setup` to verify the credentials",
];
