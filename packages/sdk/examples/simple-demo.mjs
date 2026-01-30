#!/usr/bin/env node

/**
 * OpenFarm SDK Demo (ESM) - New Provider System
 *
 * Usage: node packages/sdk/examples/simple-demo.mjs
 *
 * Prerequisites:
 * 1. Install provider packages (optional):
 *    npm install @openfarm/provider-opencode
 *    npm install @openfarm/provider-aider
 * 2. Configure credentials as needed for specific providers
 */

import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { OpenFarm } from "../dist/index.mjs";

// Configuration
const CONFIG = {
  timeout: 120_000, // 2 minutes per task
  demoFiles: ["greeting.txt", "hello-function.js", "config.json"],
  tasks: [
    {
      name: "File Creation",
      task: 'Create a file "greeting.txt" that says "Hello from OpenFarm SDK!"',
      provider: "opencode",
    },
    {
      name: "JavaScript Function",
      task: 'Create a file "hello-function.js" with a function called greet(name) that returns "Hello, {name}!"',
      provider: "opencode",
    },
    {
      name: "JSON Configuration",
      task: 'Create a file "config.json" with sample app configuration including name, version, and features array',
      provider: "opencode",
    },
  ],
};

/**
 * Format duration in human-readable format
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${Math.floor(ms / 60_000)}m ${((ms % 60_000) / 1000).toFixed(0)}s`;
}

/**
 * Clean up demo files
 */
async function cleanup() {
  for (const file of CONFIG.demoFiles) {
    const path = join(process.cwd(), file);
    if (existsSync(path)) {
      try {
        unlinkSync(path);
        console.log(`🗑️  Cleaned up: ${file}`);
      } catch (err) {
        console.warn(`⚠️  Could not clean up ${file}: ${err.message}`);
      }
    }
  }
}

/**
 * Execute a single task with real-time logging
 */
async function runTask(openFarm, taskConfig, taskNumber) {
  const { name, task, provider } = taskConfig;
  const totalTasks = CONFIG.tasks.length;

  console.log(`\n${"━".repeat(60)}`);
  console.log(`📋 Task ${taskNumber}/${totalTasks}: ${name}`);
  console.log(`   Provider: ${provider}`);
  console.log(`   "${task}"`);
  console.log("━".repeat(60));
  console.log("");

  const startTime = Date.now();

  const result = await openFarm.execute({
    task,
    provider,
    workspace: process.cwd(),
    onLog: (log) => {
      const lines = log.split("\n").filter((l) => l.trim());
      lines.forEach((line) => {
        console.log(`   ${line}`);
      });
    },
  });

  const duration = Date.now() - startTime;

  // Summary
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊 RESULT #${taskNumber}: ${name}`);
  console.log("─".repeat(60));
  console.log(`   Status:    ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`   Duration:  ${formatDuration(duration)}`);
  console.log(`   Tokens:    ${result.tokens || 0}`);

  if (result.success) {
    console.log(`   Output:    ${result.output || "Task completed"}`);
  } else {
    console.log(`   Error:     ${result.error || "Unknown error"}`);
  }

  console.log("─".repeat(60));

  return { success: result.success, duration, tokens: result.tokens || 0 };
}

/**
 * Main demo function
 */
async function demo() {
  console.log("\n🎯 OpenFarm SDK - Interactive Demo (New Provider System)\n");
  console.log(`📂 Working directory: ${process.cwd()}`);
  console.log(`⏱️  Timeout per task: ${formatDuration(CONFIG.timeout)}`);

  console.log(`\n${"━".repeat(60)}`);
  console.log("🚀 INITIALIZING OPENFARM");
  console.log("━".repeat(60));

  // Create OpenFarm instance with new provider system
  const openFarm = new OpenFarm({
    defaultProvider: "opencode",
    timeout: CONFIG.timeout,
  });

  // Show available providers
  const providers = await openFarm.getAvailableProviders();
  console.log(`✅ Available providers: ${providers.join(", ")}`);

  // Show registry stats
  const stats = await openFarm.getRegistryStats();
  console.log(
    `📊 Registry stats: ${stats.totalProviders} total, ${stats.loadedProviders} loaded`
  );

  console.log("━".repeat(60));

  // Run all tasks
  const results = [];
  let totalTokens = 0;
  let totalDuration = 0;

  for (let i = 0; i < CONFIG.tasks.length; i++) {
    const result = await runTask(openFarm, CONFIG.tasks[i], i + 1);
    results.push(result);
    totalTokens += result.tokens;
    totalDuration += result.duration;
  }

  // Final summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("📈 FINAL SUMMARY");
  console.log("═".repeat(60));
  console.log(
    `   Tasks completed:  ${results.filter((r) => r.success).length}/${results.length}`
  );
  console.log(`   Total duration:   ${formatDuration(totalDuration)}`);
  console.log(`   Total tokens:     ${totalTokens}`);
  console.log("═".repeat(60));

  // Cleanup
  console.log("\n🧹 Cleaning up demo files...");
  await cleanup();

  console.log("\n✅ Demo completed successfully!\n");
  console.log("💡 Next steps:");
  console.log(
    "   • Try the full example: npx tsx packages/sdk/examples/opencode-cli-example.ts"
  );
  console.log("   • Check the docs: packages/sdk/examples/README.md");
  console.log('   • Build your own: import { OpenFarm } from "@openfarm/sdk"');
  console.log(
    "   • Install more providers: npm install @openfarm/provider-opencode"
  );
  console.log("");
}

// Run demo
demo().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
