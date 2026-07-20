import { encode } from "@toon-format/toon";

export function render(value: Record<string, unknown>): string {
  return encode(value);
}

export function renderHelp(lines: string[]): string {
  if (lines.length === 0) return "";
  return `help[${lines.length}]:\n${lines.map((line) => `  ${line}`).join("\n")}`;
}

export function renderOutput(blocks: string[]): string {
  return blocks.filter(Boolean).join("\n");
}

export function truncate(value: string, limit: number, full = false): string {
  if (full || value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
}

export function adfToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const node = value as {
    attrs?: Record<string, unknown>;
    text?: unknown;
    type?: unknown;
    content?: unknown;
  };
  if (typeof node.text === "string") return node.text;
  if (node.type === "hardBreak") return "\n";
  if (node.type === "mention") {
    return String(node.attrs?.text ?? node.attrs?.displayName ?? "@mention");
  }
  if (node.type === "emoji") {
    return String(node.attrs?.text ?? node.attrs?.shortName ?? "");
  }
  if (!Array.isArray(node.content)) return "";
  const separator =
    node.type === "doc" ||
    node.type === "bulletList" ||
    node.type === "orderedList"
      ? "\n"
      : "";
  return node.content.map(adfToText).filter(Boolean).join(separator).trim();
}

export function textToAdf(text: string): Record<string, unknown> {
  return {
    type: "doc",
    version: 1,
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
