import { AxiError } from "./errors.js";

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(name) || args.some((arg) => arg.startsWith(`${name}=`));
}

export function getFlag(args: string[], name: string): string | undefined {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === name) return args[index + 1];
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
  }
  return undefined;
}

export function getOptionalFlag(
  args: string[],
  name: string,
): string | undefined {
  const value = getFlag(args, name);
  if (hasFlag(args, name) && (!value || value.startsWith("--"))) {
    throw new AxiError(`${name} requires a value`, "VALIDATION_ERROR");
  }
  return value;
}

export function assertKnownFlags(args: string[], allowed: string[]): void {
  for (const arg of args) {
    if (!arg.startsWith("--")) continue;
    const name = arg.split("=", 1)[0];
    if (!allowed.includes(name)) {
      throw new AxiError(`Unknown flag: ${name}`, "VALIDATION_ERROR");
    }
  }
}

export function requireFlag(args: string[], name: string): string {
  const value = getFlag(args, name);
  if (!value || value.startsWith("--")) {
    throw new AxiError(`${name} is required`, "VALIDATION_ERROR");
  }
  return value;
}

export function requirePositional(
  args: string[],
  index: number,
  label: string,
): string {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new AxiError(`${label} is required`, "VALIDATION_ERROR");
  }
  return value;
}

export function parseLimit(args: string[], fallback: number): number {
  const raw = getFlag(args, "--limit");
  if (raw === undefined && !hasFlag(args, "--limit")) return fallback;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AxiError(
      "--limit must be an integer between 1 and 100",
      "VALIDATION_ERROR",
    );
  }
  return limit;
}
