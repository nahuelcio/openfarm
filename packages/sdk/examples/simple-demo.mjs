#!/usr/bin/env node

/**
 * Simple OpenCode SDK Demo (ESM) - Standalone Mode
 *
 * Usage: node packages/sdk/examples/simple-demo.mjs
 *
 * Prerequisites:
 * 1. Configure credentials (at least one):
 *    export ANTHROPIC_API_KEY="your-key"
 *    export COPILOT_TOKEN="your-token"
 *    export OPENROUTER_API_KEY="your-key"
 * 2. No server needed! CLI runs standalone
 */

import { OpenCodeExecutor } from '../dist/index.mjs';

async function demo() {
  console.log('\n🎯 OpenCode SDK Quick Demo (Standalone CLI)\n');
  console.log('━'.repeat(50));

  // Create executor in local mode (no server needed!)
  const executor = new OpenCodeExecutor({
    mode: 'local',
    timeout: 60000 // 1 minute
  });

  console.log('\n✅ Executor ready (standalone mode - no server needed)\n');
  console.log('━'.repeat(50));

  // Execute a simple task
  console.log('\n📝 Task: Create a simple greeting file');
  console.log('⏳ Executing...\n');

  const startTime = Date.now();

  const result = await executor.execute({
    task: 'Create a file "greeting.txt" that says "Hello from OpenCode SDK!"',
    model: 'github-copilot/gpt-5-mini'
  });

  const elapsed = Date.now() - startTime;

  console.log('━'.repeat(50));
  console.log('\n📊 RESULTS:\n');
  console.log(`✨ Success:  ${result.success ? '✅ Yes' : '❌ No'}`);
  console.log(`⏱️  Duration: ${(elapsed / 1000).toFixed(2)}s`);
  console.log(`🎫 Tokens:   ${result.tokens || 0}`);

  if (result.success) {
    console.log('\n📄 Output:');
    console.log('─'.repeat(50));
    console.log(result.output);
    console.log('─'.repeat(50));
  } else {
    console.log(`\n❌ Error: ${result.error}`);
  }

  console.log('\n━'.repeat(50));
  console.log('✅ Demo completed!\n');
}

// Run demo
demo().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
