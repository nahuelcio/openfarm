/**
 * Basic usage example of OpenFarm SDK
 */

import { MinionsFarm } from "@openfarm/sdk";

async function main() {
  // Initialize the client
  const client = new MinionsFarm({
    provider: "anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  // Execute a simple task
  const result = await client.execute({
    task: "Add error handling to the login function",
    repo: "./my-project",
    // Optional: specify which files to focus on
    files: ["src/auth/login.ts"],
  });

  // Results include the diff
  console.log("Changes made:");
  console.log(result.diff);

  // You can also access:
  // - result.status: 'success' | 'failed' | 'partial'
  // - result.errors: Any errors that occurred
  // - result.files: List of modified files
}

main().catch(console.error);
