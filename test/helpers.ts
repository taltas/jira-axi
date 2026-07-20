import { vi } from "vitest";
import type { JiraClient } from "../src/jira.js";

export function stubClient(
  handler: (path: string, init?: RequestInit) => unknown | Promise<unknown>,
): JiraClient & { request: ReturnType<typeof vi.fn> } {
  return {
    baseUrl: "https://example.atlassian.net",
    request: vi.fn(handler),
  };
}

export const issuesFixture = [
  {
    id: "10001",
    key: "ENG-1",
    fields: {
      summary: "Fix login",
      status: { name: "In Progress" },
      assignee: { accountId: "a1", displayName: "Ada" },
      updated: "2026-01-02T00:00:00.000Z",
    },
  },
  {
    id: "10002",
    key: "ENG-2",
    fields: {
      summary: "Write docs",
      status: { name: "To Do" },
      assignee: null,
      updated: "2026-01-01T00:00:00.000Z",
    },
  },
];
