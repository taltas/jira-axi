import { describe, expect, it, vi } from "vitest";
import { main } from "../src/cli.js";
import { issuesFixture, stubClient } from "./helpers.js";

describe("CLI smoke", () => {
  it("runs jira-axi issue list through SDK dispatch against a stub", async () => {
    const client = stubClient((path) =>
      path.endsWith("approximate-count")
        ? { count: 2 }
        : { issues: issuesFixture },
    );
    const write = vi.fn();
    await main({ argv: ["issue", "list"], stdout: { write }, client });
    const output = write.mock.calls.map(([chunk]) => String(chunk)).join("");
    expect(output).toContain("issues[2]");
    expect(output).toContain("ENG-1");
    expect(output).toContain("key");
    expect(output).toContain("summary");
    expect(output).toContain("status");
    expect(output).toContain("assignee");
  });
});
