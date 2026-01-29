import { DEFAULT_PORTS, DEFAULT_TIMEOUTS } from "../src/constants/ports";
import { ConfigService, OpenCodeCloudService } from "../src/services";

async function example() {
  // Create configuration from environment variables
  const _configService = ConfigService.fromEnvironment();

  // Or create with custom config
  const customConfig = new ConfigService({
    opencode: {
      defaultTimeout: DEFAULT_TIMEOUTS.REQUEST, // 10 minutes
      defaultPort: DEFAULT_PORTS.OPENCODE,
    },
    kubernetes: {
      defaultNamespace: "my-namespace",
      defaultImage: "my-registry/opencode-executor:v1.0.0",
    },
    billing: {
      modelPricing: {
        "anthropic/claude-sonnet-4-20250514": {
          inputCostPer1k: 0.003,
          outputCostPer1k: 0.015,
        },
      },
      defaultPricing: {
        inputCostPer1k: 0.001,
        outputCostPer1k: 0.002,
      },
    },
  });

  const cloudService = new OpenCodeCloudService(customConfig);

  try {
    // Execute a mission
    const result = await cloudService.executeMission({
      jobId: "job-123",
      tenantId: "tenant-456",
      task: "Fix the authentication bug in the login component",
      repositoryUrl: "https://github.com/example/my-app",
      branch: "main",
      model: "anthropic/claude-sonnet-4-20250514",
      timeout: 600_000,
    });

    console.log("Mission completed:", result);

    if (result.success) {
      console.log(`Files modified: ${result.filesModified.length}`);
      console.log(`Cost: $${result.costUsd}`);
      console.log(`Duration: ${result.duration}ms`);
    }

    // Get execution report
    const report = await cloudService.getExecutionReport("job-123");
    console.log("Execution report:", report);

    // Get billing report
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const toDate = new Date();
    const billing = await cloudService.getTenantBilling(
      "tenant-456",
      fromDate,
      toDate
    );
    console.log("Billing report:", billing);
  } catch (error) {
    console.error("Mission failed:", error.message);
  }
}

// Health check example
async function _healthCheckExample() {
  const cloudService = new OpenCodeCloudService();

  const health = await cloudService.healthCheck();
  console.log("Health status:", health);
}

if (require.main === module) {
  example().catch(console.error);
}
