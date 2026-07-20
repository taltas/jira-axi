import { describe, expect, it } from "vitest";
import { adfToText, textToAdf, truncate } from "../src/toon.js";

describe("TOON text helpers", () => {
  it("converts Jira ADF to plain text", () => {
    expect(
      adfToText({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "First" }] },
          { type: "paragraph", content: [{ type: "text", text: "Second" }] },
        ],
      }),
    ).toBe("First\nSecond");
  });

  it("joins adjacent text nodes within a paragraph", () => {
    expect(
      adfToText({
        type: "paragraph",
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "world" },
        ],
      }),
    ).toBe("Hello world");
  });

  it("preserves common attribute-backed ADF nodes", () => {
    expect(
      adfToText({
        type: "paragraph",
        content: [
          { type: "mention", attrs: { text: "@Ada" } },
          { type: "hardBreak" },
          { type: "emoji", attrs: { shortName: ":wave:" } },
        ],
      }),
    ).toBe("@Ada\n:wave:");
  });

  it("builds ADF and supports full text opt-out from truncation", () => {
    expect(textToAdf("one\ntwo")).toMatchObject({ type: "doc", version: 1 });
    expect(truncate("abcdef", 3)).toBe("abc...");
    expect(truncate("abcdef", 3, true)).toBe("abcdef");
  });
});
