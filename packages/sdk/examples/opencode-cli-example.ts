#!/usr/bin/env tsx

/**
 * Example: Using OpenFarm SDK with OpenCode Provider
 *
 * Prerequisites:
 * 1. Install OpenCode provider: npm install @openfarm/provider-opencode
 * 2. Configure credentials via environment variables:
 *    export ANTHROPIC_API_KEY="your-key"
 *    export COPILOT_TOKEN="your-token"
 *    export OPENROUTER_API_KEY="your-key"
 * 3. Run this script: npx tsx examples/opencode-cli-example.ts
 * 4. NO SERVER REQUIRED! Local mode runs standalone CLI
 */

import { OpenFarm } from "../src/open-farm.js";

async function main() {
  console.log(
    "🚀 OpenFarm SDK - OpenCode Provider Example (Standalone Mode)\n"
  );

  // Create OpenFarm instance with OpenCode provider
  const openFarm = new OpenFarm({
    defaultProvider: "opencode",
    timeout: 120_000, // 2 minutes
  });

  console.log("✅ OpenFarm SDK initialized\n");

  // Check available providers
  const providers = await openFarm.getAvailableProviders();
  console.log(`📦 Available providers: ${providers.join(", ")}\n`);

  // Get OpenCode provider metadata (if available)
  try {
    const metadata = await openFarm.getProviderMetadata("opencode");
    console.log(
      `🔧 OpenCode provider: ${metadata?.description || "Available"}\n`
    );
  } catch (_error) {
    console.log(
      "⚠️  OpenCode provider not installed. Install with: npm install @openfarm/provider-opencode\n"
    );
    console.log("   Falling back to direct-api provider for this demo.\n");
    await openFarm.setProvider("direct-api");
  }

  // Example 1: Simple greeting task
  console.log("1️⃣  Executing simple task...");
  console.log("   Task: Create a hello.txt file with a greeting");
  console.log("   Model: github-copilot/gpt-5-mini\n");

  const result1 = await openFarm.execute({
    task: 'Create a file called "hello.txt" with the content "Hello from OpenFarm SDK!"',
    model: "github-copilot/gpt-5-mini",
    workspace: process.cwd(),
    verbose: true,
    onLog: (log) => {
      // Real-time logging
      const lines = log.split("\n").filter((l) => l.trim());
      lines.forEach((line) => console.log(`   📝 ${line}`));
    },
  });

  console.log("\n📊 Result:");
  console.log(`   Success: ${result1.success}`);
  console.log(`   Duration: ${result1.duration}ms`);
  console.log(`   Tokens: ${result1.tokens || 0}`);

  if (result1.success) {
    console.log(`\n✅ Output:\n${result1.output}\n`);
  } else {
    console.error(`\n❌ Error: ${result1.error}\n`);
  }

  // Example 2: Code modification task
  console.log("\n2️⃣  Executing code modification task...");
  console.log("   Task: Add TypeScript types to a function");
  console.log("   Model: github-copilot/claude-sonnet-4.5\n");

  const result2 = await openFarm.execute({
    task: 'Create a TypeScript file "math.ts" with a function that adds two numbers with proper types',
    model: "github-copilot/claude-sonnet-4.5",
    workspace: process.cwd(),
    temperature: 0.3, // Lower temperature for more precise code
    maxTokens: 2000,
    onLog: (log) => {
      const lines = log.split("\n").filter((l) => l.trim());
      lines.forEach((line) => console.log(`   📝 ${line}`));
    },
  });

  console.log("\n📊 Result:");
  console.log(`   Success: ${result2.success}`);
  console.log(`   Duration: ${result2.duration}ms`);
  console.log(`   Tokens: ${result2.tokens || 0}`);

  if (result2.success) {
    console.log(`\n✅ Output:\n${result2.output}\n`);
  } else {
    console.error(`\n❌ Error: ${result2.error}\n`);
  }

  // Example 3: Provider switching
  console.log("\n3️⃣  Example: Provider switching");
  console.log("   Switching to direct-api provider\n");

  try {
    await openFarm.setProvider("direct-api");
    console.log("✅ Switched to direct-api provider");

    const result3 = await openFarm.execute({
      task: "Create a simple package.json file for a Node.js project",
      workspace: process.cwd(),
    });

    console.log("\n📊 Direct API Result:");
    console.log(`   Success: ${result3.success}`);
    console.log(`   Duration: ${result3.duration}ms`);

    if (result3.success) {
      console.log(`   Output: ${result3.output?.substring(0, 100)}...`);
    } else {
      console.log(`   Error: ${result3.error}`);
    }
  } catch (error) {
    console.error(
      `❌ Provider switching failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Example 4: Performance optimization
  console.log("\n4️⃣  Performance optimization example");

  // Show registry stats
  const stats = await openFarm.getRegistryStats();
  console.log(
    `📊 Registry stats: ${stats.totalProviders} total, ${stats.loadedProviders} loaded, ${stats.cachedProviders} cached`
  );

  // Preload providers for better performance
  console.log("\n🚀 Preloading all providers...");
  await openFarm.preloadAllProviders();

  const newStats = await openFarm.getRegistryStats();
  console.log(
    `📊 After preload: ${newStats.totalProviders} total, ${newStats.loadedProviders} loaded, ${newStats.cachedProviders} cached`
  );

  console.log("\n✨ Example completed!\n");
  console.log("💡 Next steps:");
  console.log(
    "   • Install more providers: npm install @openfarm/provider-aider"
  );
  console.log("   • Check the SDK docs: packages/sdk/README.md");
  console.log(
    "   • Try the simple demo: node packages/sdk/examples/simple-demo.mjs"
  );
}

// Run the example
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
