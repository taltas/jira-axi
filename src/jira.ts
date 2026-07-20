import { AxiError, CONFIG_HELP, type JiraErrorCode } from "./errors.js";

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface JiraClient {
  readonly baseUrl: string;
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export interface JiraClientOptions {
  baseUrl?: string;
  email?: string;
  apiToken?: string;
  fetch?: FetchLike;
}

export function createJiraClient(options: JiraClientOptions = {}): JiraClient {
  const baseUrl = options.baseUrl ?? process.env.JIRA_BASE_URL;
  const email = options.email ?? process.env.JIRA_EMAIL;
  const apiToken = options.apiToken ?? process.env.JIRA_API_TOKEN;

  const missing = [
    ["JIRA_BASE_URL", baseUrl],
    ["JIRA_EMAIL", email],
    ["JIRA_API_TOKEN", apiToken],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new AxiError(
      `Missing Jira configuration: ${missing.join(", ")}`,
      "CONFIG_REQUIRED",
      CONFIG_HELP,
    );
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(baseUrl!).toString().replace(/\/$/, "");
  } catch {
    throw new AxiError(
      "JIRA_BASE_URL must be a valid absolute URL",
      "CONFIG_REQUIRED",
      CONFIG_HELP,
    );
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;
  const authorization = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

  return {
    baseUrl: normalizedUrl,
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      let response: Response;
      try {
        response = await fetchImpl(`${normalizedUrl}${path}`, {
          ...init,
          signal: init.signal ?? AbortSignal.timeout(30_000),
          headers: {
            Accept: "application/json",
            Authorization: authorization,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
          },
        });
      } catch (error) {
        throw new AxiError(
          `Could not reach Jira at ${normalizedUrl}: ${error instanceof Error ? error.message : String(error)}`,
          "JIRA_ERROR",
          ["Check JIRA_BASE_URL and your network connection"],
        );
      }

      if (response.ok) {
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      }

      const body = await response.text();
      throw mapJiraError(response.status, body);
    },
  };
}

function mapJiraError(status: number, body: string): AxiError {
  const detail = extractErrorMessage(body);
  const mapped: Record<number, { code: JiraErrorCode; message: string }> = {
    400: {
      code: "VALIDATION_ERROR",
      message: detail || "Jira rejected the request",
    },
    401: { code: "AUTH_REQUIRED", message: "Jira authentication failed" },
    403: { code: "FORBIDDEN", message: detail || "Jira denied this action" },
    404: { code: "NOT_FOUND", message: detail || "Jira resource not found" },
    429: { code: "RATE_LIMITED", message: "Jira rate limit exceeded" },
  };
  const entry = mapped[status] ?? {
    code: "JIRA_ERROR" as const,
    message: detail || `Jira API request failed with HTTP ${status}`,
  };
  const suggestions =
    status === 401
      ? CONFIG_HELP
      : status === 429
        ? ["Wait and retry the command"]
        : [];
  return new AxiError(entry.message, entry.code, suggestions);
}

function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      errorMessages?: unknown;
      errors?: unknown;
      message?: unknown;
    };
    if (
      Array.isArray(parsed.errorMessages) &&
      parsed.errorMessages.length > 0
    ) {
      const messages = parsed.errorMessages
        .filter((item) => typeof item === "string")
        .join("; ");
      if (messages) return messages;
    }
    if (parsed.errors && typeof parsed.errors === "object") {
      return Object.entries(parsed.errors)
        .map(([field, message]) => `${field}: ${String(message)}`)
        .join("; ");
    }
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    return body.trim().slice(0, 500);
  }
  return "";
}
