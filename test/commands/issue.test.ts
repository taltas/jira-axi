import { describe, expect, it } from "vitest";
import { issueCommand } from "../../src/commands/issue.js";
import { issuesFixture, stubClient } from "../helpers.js";

describe("issueCommand", () => {
  it("lists minimal issue rows with counts and filters", async () => {
    const client = stubClient((path) =>
      path.endsWith("approximate-count")
        ? { count: 7 }
        : { issues: issuesFixture },
    );
    const output = await issueCommand(
      [
        "list",
        "--project",
        "ENG",
        "--status",
        "In Progress",
        "--assignee",
        "me",
      ],
      client,
    );
    expect(output).toContain("count: 7");
    expect(output).toContain("ENG-1");
    expect(output).toContain("Fix login");
    expect(output).toContain("status_counts");
    expect(output).not.toContain("updated");
    const path = client.request.mock.calls.find(([path]) =>
      String(path).includes("search/jql"),
    )?.[0] as string;
    const query = new URL(`https://stub${path}`).searchParams.get("jql");
    expect(query).toContain('project = "ENG"');
    expect(query).toContain('status = "In Progress"');
    expect(query).toContain("assignee = currentUser()");
  });

  it("views details and truncates long text unless --full is passed", async () => {
    const issue = {
      ...issuesFixture[0],
      fields: {
        ...issuesFixture[0].fields,
        reporter: { displayName: "Grace" },
        description: "x".repeat(1_100),
        comment: {
          total: 3,
          comments: [{ author: { displayName: "Lin" }, body: "last note" }],
        },
      },
    };
    const client = stubClient((path) =>
      path.includes("/comment?")
        ? {
            total: 3,
            comments: [{ author: { displayName: "Lin" }, body: "last note" }],
          }
        : issue,
    );
    const compact = await issueCommand(["view", "ENG-1"], client);
    const full = await issueCommand(["view", "ENG-1", "--full"], client);
    expect(compact).toContain("comments_count: 3");
    expect(compact).toContain("Grace");
    expect(compact).toContain("Lin");
    expect(compact).toContain("...");
    expect(full).toContain("x".repeat(1_100));
  });

  it("creates an issue using Jira ADF and prints a next step", async () => {
    const client = stubClient(() => ({ id: "10003", key: "ENG-3" }));
    const output = await issueCommand(
      [
        "create",
        "--project",
        "ENG",
        "--summary",
        "New bug",
        "--description",
        "Steps",
        "--type",
        "Bug",
      ],
      client,
    );
    expect(output).toContain("key: ENG-3");
    expect(output).toContain("jira-axi issue view ENG-3");
    const init = client.request.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      fields: {
        project: { key: "ENG" },
        summary: "New bug",
        issuetype: { name: "Bug" },
        description: { type: "doc" },
      },
    });
  });

  it("adds a comment and confirms it", async () => {
    const client = stubClient(() => ({ id: "9001" }));
    const output = await issueCommand(
      ["comment", "ENG-1", "--text", "Ship it"],
      client,
    );
    expect(output).toContain("issue: ENG-1");
    expect(output).toContain("status: created");
    expect(client.request.mock.calls[0][0]).toContain("ENG-1/comment");
  });

  it("provides subcommand-specific help", async () => {
    const client = stubClient(() => ({}));
    expect(await issueCommand(["view", "--help"], client)).toBe(
      "usage: jira-axi issue view <KEY> [--full]",
    );
  });

  it("rejects missing filter values and unknown flags", async () => {
    const client = stubClient(() => ({ issues: [] }));
    await expect(
      issueCommand(["list", "--project"], client),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      issueCommand(["list", "--bogus"], client),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(client.request).not.toHaveBeenCalled();
  });
});
