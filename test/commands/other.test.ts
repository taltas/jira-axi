import { describe, expect, it } from "vitest";
import { homeCommand } from "../../src/commands/home.js";
import { projectCommand } from "../../src/commands/project.js";
import { searchCommand } from "../../src/commands/search.js";
import { setupCommand } from "../../src/commands/setup.js";
import { issuesFixture, stubClient } from "../helpers.js";

describe("dashboard and supporting commands", () => {
  it("renders an open issue dashboard", async () => {
    const client = stubClient((path) =>
      path.endsWith("approximate-count")
        ? { count: 12 }
        : { issues: issuesFixture },
    );
    const output = await homeCommand([], client);
    expect(output).toContain("open_issues: 12");
    expect(output).toContain("recent_issues");
    expect(output).toContain("jira-axi issue list");
    expect(
      client.request.mock.calls.some(([path]) => path.includes("search/jql")),
    ).toBe(true);
  });

  it("runs arbitrary JQL with a compact schema", async () => {
    const client = stubClient((path) =>
      path.endsWith("approximate-count")
        ? { count: 2 }
        : { issues: issuesFixture },
    );
    const output = await searchCommand(
      ["--jql", "project = ENG", "--limit", "10"],
      client,
    );
    expect(output).toContain("ENG-1");
    expect(output).toContain("returned: 2");
    expect(
      client.request.mock.calls.some(([path]) =>
        path.includes("maxResults=10"),
      ),
    ).toBe(true);
  });

  it("lists projects", async () => {
    const client = stubClient(() => ({
      total: 1,
      values: [
        {
          id: "1",
          key: "ENG",
          name: "Engineering",
          projectTypeKey: "software",
          lead: { displayName: "Ada" },
        },
      ],
    }));
    const output = await projectCommand(["list"], client);
    expect(output).toContain("Engineering");
    expect(output).toContain("projects[1]{key,name,type,lead}");
    expect(output).toContain("ENG,Engineering,software,Ada");
  });

  it("summarizes project issue types and statuses", async () => {
    const client = stubClient((path) =>
      path.endsWith("/statuses")
        ? [
            {
              id: "10",
              name: "Bug",
              statuses: [
                { id: "1", name: "To Do" },
                { id: "2", name: "Done" },
              ],
            },
          ]
        : {
            id: "1",
            key: "ENG",
            name: "Engineering",
            projectTypeKey: "software",
          },
    );
    const output = await projectCommand(["view", "ENG"], client);
    expect(output).toContain(
      "issue_types[1]{issue_type,subtask,status_count,statuses}",
    );
    expect(output).toContain("Bug,no,2");
    expect(output).toContain("To Do, Done");
  });

  it("verifies setup against the current user endpoint", async () => {
    const client = stubClient(() => ({
      accountId: "a1",
      displayName: "Ada",
      active: true,
    }));
    const output = await setupCommand([], client);
    expect(output).toContain("status: authenticated");
    expect(output).toContain("user: Ada");
    expect(client.request).toHaveBeenCalledWith("/rest/api/3/myself");
  });
});
