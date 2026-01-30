#!/usr/bin/env bun
// Temporarily disabled due to circular dependency issues

export async function runContextCLI(
  args: string[],
  config: { apiKey?: string; defaultProvider?: string }
): Promise<void> {
  console.log("Context CLI temporarily disabled");
  console.log("Args:", args, "Config:", config);
}
