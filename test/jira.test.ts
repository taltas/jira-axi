import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiError } from "../src/errors.js";
import { createJiraClient } from "../src/jira.js";

describe("createJiraClient", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("fails loudly when configuration is missing", () => {
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
    expect(() => createJiraClient()).toThrow(AxiError);
    try {
      createJiraClient();
    } catch (error) {
      expect((error as AxiError).code).toBe("CONFIG_REQUIRED");
      expect((error as AxiError).message).toContain("JIRA_BASE_URL");
      expect((error as AxiError).suggestions).toContain(
        "Run `jira-axi setup` to verify the credentials",
      );
    }
  });

  it("uses Basic auth and parses JSON", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accountId: "abc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createJiraClient({
      baseUrl: "https://example.atlassian.net/",
      email: "ada@example.com",
      apiToken: "token",
      fetch,
    });
    await expect(client.request("/rest/api/3/myself")).resolves.toEqual({
      accountId: "abc",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://example.atlassian.net/rest/api/3/myself",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("ada@example.com:token").toString("base64")}`,
        }),
      }),
    );
  });

  it("maps Jira error responses to structured errors", async () => {
    const client = createJiraClient({
      baseUrl: "https://example.atlassian.net",
      email: "ada@example.com",
      apiToken: "bad",
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ errorMessages: ["Issue does not exist"] }),
          {
            status: 404,
          },
        ),
      ),
    });
    await expect(
      client.request("/rest/api/3/issue/NOPE-1"),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Issue does not exist",
    });
  });

  it("uses field errors when errorMessages is empty", async () => {
    const client = createJiraClient({
      baseUrl: "https://example.atlassian.net",
      email: "ada@example.com",
      apiToken: "token",
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            errorMessages: [],
            errors: { summary: "is required" },
          }),
          { status: 400 },
        ),
      ),
    });
    await expect(client.request("/rest/api/3/issue")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "summary: is required",
    });
  });
});
