#!/usr/bin/env tsx

/**
 * Example: Using OpenCodeExecutor with CLI mode (Standalone)
 *
 * Prerequisites:
 * 1. Configure credentials via environment variables:
 *    export ANTHROPIC_API_KEY="your-key"
 *    export COPILOT_TOKEN="your-token"
 *    export OPENROUTER_API_KEY="your-key"
 * 2. Run this script: npx tsx examples/opencode-cli-example.ts
 * 3. NO SERVER REQUIRED! Local mode runs standalone CLI
 */

import { OpenCodeExecutor } from "../src/executors/opencode";

async function main() {
  console.log("🚀 OpenCode SDK CLI Example (Standalone Mode)\n");

  // Create executor in local mode (standalone CLI - no server!)
  const executor = new OpenCodeExecutor({
    mode: "local",
    timeout: 120_000 // 2 minutes
  });

  console.log("✅ Executor ready (standalone mode)\n");

  // Example 1: Simple greeting task
  console.log("2️⃣  Executing simple task...");
  console.log("   Task: Create a hello.txt file with a greeting");
  console.log("   Model: github-copilot/gpt-5-mini\n");

  const result1 = await executor.execute({
    task: 'Create a file called "hello.txt" with the content "Hello from OpenCode CLI!"',
    model: "github-copilot/gpt-5-mini",
  });

  console.log("📊 Result:");
  console.log(`   Success: ${result1.success}`);
  console.log(`   Duration: ${result1.duration}ms`);
  console.log(`   Tokens: ${result1.tokens || 0}`);

  if (result1.success) {
    console.log(`\n📝 Output:\n${result1.output}\n`);
  } else {
    console.error(`\n❌ Error: ${result1.error}\n`);
  }

  // Example 2: Code modification task
  console.log("\n3️⃣  Executing code modification task...");
  console.log("   Task: Add TypeScript types to a function");
  console.log("   Model: github-copilot/claude-sonnet-4.5\n");

  const result2 = await executor.execute({
    task: 'Create a TypeScript file "math.ts" with a function that adds two numbers with proper types',
    model: "github-copilot/claude-sonnet-4.5",
  });

  console.log("📊 Result:");
  console.log(`   Success: ${result2.success}`);
  console.log(`   Duration: ${result2.duration}ms`);
  console.log(`   Tokens: ${result2.tokens || 0}`);

  if (result2.success) {
    console.log(`\n📝 Output:\n${result2.output}\n`);
  } else {
    console.error(`\n❌ Error: ${result2.error}\n`);
  }

  // Example 3: Show cloud mode usage (will fail without baseUrl)
  console.log("\n4️⃣  Example: Cloud mode configuration");
  console.log("   (This will fail since we don't have a cloud URL)\n");

  const cloudExecutor = new OpenCodeExecutor({
    mode: "cloud",
    // baseUrl: "https://api.opencode.dev", // Would need actual cloud URL
  });

  const result3 = await cloudExecutor.execute({
    task: "Test task",
  });

  console.log("📊 Cloud Mode Result:");
  console.log(`   Success: ${result3.success}`);
  console.log(`   Error: ${result3.error || 'N/A'}`);

  console.log("\n✨ Example completed!\n");
}

// Run the example
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
