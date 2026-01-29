#!/usr/bin/env node

/**
 * OpenCode SDK Demo (ESM) - Standalone Mode
 *
 * Usage: node packages/sdk/examples/simple-demo.mjs
 *
 * Prerequisites:
 * 1. Configure credentials (at least one):
 *    export ANTHROPIC_API_KEY="your-key"
 *    export COPILOT_TOKEN="your-token"
 *    export OPENROUTER_API_KEY="your-key"
 *    export ZAI_API_KEY="your-key"
 * 2. No server needed! CLI runs standalone
 */

import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { OpenCodeExecutor } from "../dist/index.mjs";

// Configuration
const CONFIG = {
  timeout: 120_000, // 2 minutes per task
  demoFiles: ["greeting.txt", "hello-function.js", "config.json"],
  tasks: [
    {
      name: "File Creation",
      task: 'Create a file "greeting.txt" that says "Hello from OpenCode SDK!"',
      model: "github-copilot/gpt-5-mini",
    },
    {
      name: "JavaScript Function",
      task: 'Create a file "hello-function.js" with a function called greet(name) that returns "Hello, {name}!"',
      model: "github-copilot/gpt-5-mini",
    },
    {
      name: "JSON Configuration",
      task: 'Create a file "config.json" with sample app configuration including name, version, and features array',
      model: "github-copilot/gpt-5-mini",
    },
  ],
};

/**
 * Check which credentials are configured
 */
function checkCredentials() {
  const providers = [
    { name: "Anthropic", key: "ANTHROPIC_API_KEY" },
    { name: "GitHub Copilot", key: "COPILOT_TOKEN" },
    { name: "OpenRouter", key: "OPENROUTER_API_KEY" },
    { name: "ZAI", key: "ZAI_API_KEY" },
  ];

  const configured = providers.filter((p) => process.env[p.key]);

  if (configured.length === 0) {
    console.warn("\n⚠️  No credentials configured! Set at least one:");
    providers.forEach((p) => {
      console.warn(`   export ${p.key}="your-${p.name.toLowerCase()}-key"`);
    });
    console.warn("\n");
  }

  return configured;
}

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
async function runTask(executor, taskConfig, taskNumber) {
  const { name, task, model } = taskConfig;
  const totalTasks = CONFIG.tasks.length;

  console.log(`\n${"━".repeat(60)}`);
  console.log(`📋 Task ${taskNumber}/${totalTasks}: ${name}`);
  console.log(`   Model: ${model}`);
  console.log(`   "${task}"`);
  console.log("━".repeat(60));
  console.log("");

  const startTime = Date.now();

  const result = await executor.execute({
    task,
    model,
    onLog: (log) => {
      const lines = log.split("\n").filter((l) => l.trim());
      lines.forEach((line) => {
        const prefix = line.startsWith("💬")
          ? "   "
          : line.startsWith("🧠")
            ? "   "
            : line.startsWith("🔧")
              ? "   "
              : line.startsWith("✅")
                ? "   "
                : line.startsWith("📝")
                  ? "   "
                  : line.startsWith("🔨")
                    ? "   "
                    : line.startsWith("📖")
                      ? "   "
                      : line.startsWith("💻")
                        ? "   "
                        : line.startsWith("🔍")
                          ? "   "
                          : line.startsWith("🔎")
                            ? "   "
                            : line.startsWith("📊")
                              ? "   "
                              : line.startsWith("▶️")
                                ? "   "
                                : line.startsWith("⚙️")
                                  ? "   "
                                  : line.startsWith("⏳")
                                    ? "   "
                                    : line.startsWith("❌")
                                      ? "   "
                                      : line.startsWith("📋")
                                        ? "   "
                                        : "   ";
        console.log(`${prefix}${line}`);
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
    console.log("   Files:     Created/modified during execution");
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
  console.log("\n🎯 OpenCode SDK - Interactive Demo (Standalone CLI)\n");
  console.log(`📂 Working directory: ${process.cwd()}`);
  console.log(`⏱️  Timeout per task: ${formatDuration(CONFIG.timeout)}`);

  // Check credentials
  const configuredProviders = checkCredentials();
  if (configuredProviders.length > 0) {
    console.log(
      `✅ Configured providers: ${configuredProviders.map((p) => p.name).join(", ")}`
    );
  }

  console.log(`\n${"━".repeat(60)}`);
  console.log("🚀 INITIALIZING EXECUTOR");
  console.log("━".repeat(60));

  // Create executor with local mode (standalone CLI)
  const executor = new OpenCodeExecutor({
    mode: "local",
    timeout: CONFIG.timeout,
  });

  console.log("✅ Executor ready (standalone mode - no server required)");
  console.log("━".repeat(60));

  // Run all tasks
  const results = [];
  let totalTokens = 0;
  let totalDuration = 0;

  for (let i = 0; i < CONFIG.tasks.length; i++) {
    const result = await runTask(executor, CONFIG.tasks[i], i + 1);
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
  console.log(
    '   • Build your own: import { OpenCodeExecutor } from "@openfarm/sdk"'
  );
  console.log("");
}

// Run demo
demo().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
