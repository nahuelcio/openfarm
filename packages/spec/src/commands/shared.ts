import type { SpecArtifactName, SpecStatus } from "../types";

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [key, value] = arg.slice(2).split("=");
    if (value !== undefined) {
      flags[key] = value;
      continue;
    }
    const next = args[index + 1];
    if (next && !next.startsWith("-")) {
      flags[key] = next;
      index++;
      continue;
    }
    flags[key] = true;
  }

  return { positional, flags };
}

export function parseStatus(value: string): SpecStatus {
  const valid: SpecStatus[] = [
    "draft",
    "ready",
    "implementing",
    "done",
    "archived",
  ];
  if (!valid.includes(value as SpecStatus)) {
    throw new Error(`Invalid status: ${value}`);
  }
  return value as SpecStatus;
}

export function parseArtifact(value: string): SpecArtifactName {
  const valid: SpecArtifactName[] = [
    "proposal",
    "requirements",
    "design",
    "tasks",
  ];
  if (!valid.includes(value as SpecArtifactName)) {
    throw new Error(`Invalid artifact: ${value}`);
  }
  return value as SpecArtifactName;
}
