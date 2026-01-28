// Multi-Tenant Example
// Shows how to use the separated tenant management packages

import {
  ApiKeyService,
  PermissionService,
  TenantAuthService,
} from "@openfarm-platform/tenant-auth";
import {
  QuotaService,
  TenantService,
} from "@openfarm-platform/tenant-management";
import { OpenCodeCloudService } from "../src/services/opencode-cloud-service";

async function multiTenantExample() {
  console.log("🏢 Multi-Tenant Architecture Example");
  console.log("=====================================\n");

  // Initialize services
  const tenantService = new TenantService();
  const quotaService = new QuotaService(tenantService);
  const authService = new TenantAuthService();
  const apiKeyService = new ApiKeyService(authService);
  const cloudService = new OpenCodeCloudService(undefined, quotaService);

  try {
    // 1. Create tenants
    console.log("1. Creating tenants...");

    const freeTenant = await tenantService.createTenant({
      name: "Startup Inc",
      slug: "startup-inc",
      billingEmail: "billing@startup.com",
      plan: "free",
    });

    const proTenant = await tenantService.createTenant({
      name: "Scale Corp",
      slug: "scale-corp",
      billingEmail: "billing@scale.com",
      plan: "pro",
    });

    const enterpriseTenant = await tenantService.createTenant({
      name: "Enterprise Ltd",
      slug: "enterprise-ltd",
      billingEmail: "billing@enterprise.com",
      plan: "enterprise",
    });

    console.log(`✅ Created ${freeTenant.name} (${freeTenant.plan})`);
    console.log(`✅ Created ${proTenant.name} (${proTenant.plan})`);
    console.log(
      `✅ Created ${enterpriseTenant.name} (${enterpriseTenant.plan})\n`
    );

    // 2. Create API keys for each tenant
    console.log("2. Creating API keys...");

    const freeApiKey = await apiKeyService.createMissionKey(
      freeTenant.id,
      "Main API Key"
    );
    const proApiKey = await apiKeyService.createAdminKey(
      proTenant.id,
      "Admin Key"
    );
    const enterpriseApiKey = await apiKeyService.createCustomKey({
      tenantId: enterpriseTenant.id,
      name: "Full Access Key",
      permissions: ["*"],
    });

    console.log(
      `✅ Created API key for ${freeTenant.name}: ${freeApiKey.key.substring(0, 10)}...`
    );
    console.log(
      `✅ Created API key for ${proTenant.name}: ${proApiKey.key.substring(0, 10)}...`
    );
    console.log(
      `✅ Created API key for ${enterpriseTenant.name}: ${enterpriseApiKey.key.substring(0, 10)}...\n`
    );

    // 3. Check quotas for each tenant
    console.log("3. Checking tenant quotas...");

    for (const tenant of [freeTenant, proTenant, enterpriseTenant]) {
      const quotaCheck = await quotaService.checkJobQuota(tenant.id, 5000);
      const quotaStatus = await quotaService.getTenantQuotaStatus(tenant.id);

      console.log(`📊 ${tenant.name} (${tenant.plan}):`);
      console.log(`   Quota allowed: ${quotaCheck.allowed}`);
      console.log(
        `   Monthly tokens: ${quotaStatus.quotas.currentMonthTokens}/${quotaStatus.quotas.monthlyTokenLimit}`
      );
      console.log(
        `   Monthly jobs: ${quotaStatus.quotas.currentMonthJobs}/${quotaStatus.quotas.monthlyJobLimit}`
      );
      console.log(`   Jobs per hour limit: ${quotaStatus.quotas.jobsPerHour}`);
    }
    console.log();

    // 4. Test API key validation
    console.log("4. Testing API key validation...");

    const validation = await authService.validateApiKey(proApiKey.key);
    if (validation) {
      console.log(`✅ API key validated for tenant: ${validation.tenantId}`);
      console.log(`   Permissions: ${validation.permissions.join(", ")}`);

      // Test permission checking
      const canCreateMissions = PermissionService.hasPermission(
        validation.permissions,
        "missions:create"
      );
      const canManageBilling = PermissionService.hasPermission(
        validation.permissions,
        "billing:read"
      );

      console.log(`   Can create missions: ${canCreateMissions}`);
      console.log(`   Can manage billing: ${canManageBilling}`);
    }
    console.log();

    // 5. Simulate mission execution with quota consumption
    console.log("5. Simulating mission execution...");

    // Try to execute a mission for the free tenant
    try {
      const missionResult = await cloudService.executeMission({
        jobId: "job_001",
        tenantId: freeTenant.id,
        task: "Fix the authentication bug in the login component",
        repositoryUrl: "https://github.com/example/my-app",
        branch: "main",
        model: "claude-3-5-sonnet-20241022",
      });

      console.log(`✅ Mission executed successfully for ${freeTenant.name}`);
      console.log(`   Tokens used: ${missionResult.tokensUsed}`);
      console.log(`   Cost: $${missionResult.costUsd}`);
      console.log(`   Files modified: ${missionResult.filesModified.length}`);
    } catch (error) {
      console.log(`❌ Mission failed for ${freeTenant.name}: ${error.message}`);
    }
    console.log();

    // 6. Check updated quotas after execution
    console.log("6. Checking quotas after execution...");

    const updatedQuotaStatus = await quotaService.getTenantQuotaStatus(
      freeTenant.id
    );
    console.log(`📊 ${freeTenant.name} updated usage:`);
    console.log(
      `   Monthly tokens: ${updatedQuotaStatus.quotas.currentMonthTokens}/${updatedQuotaStatus.quotas.monthlyTokenLimit}`
    );
    console.log(
      `   Monthly jobs: ${updatedQuotaStatus.quotas.currentMonthJobs}/${updatedQuotaStatus.quotas.monthlyJobLimit}`
    );
    console.log();

    // 7. Test quota limits
    console.log("7. Testing quota limits...");

    // Try to exceed quota for free tenant
    const quotaCheck = await quotaService.checkJobQuota(freeTenant.id, 50_000); // Large token estimate
    console.log(`📊 Large job quota check for ${freeTenant.name}:`);
    console.log(`   Allowed: ${quotaCheck.allowed}`);
    if (!quotaCheck.allowed) {
      console.log(`   Reason: ${quotaCheck.reason}`);
    }
    console.log();

    // 8. List all tenants and their stats
    console.log("8. Tenant summary...");

    const allTenants = await tenantService.listTenants();
    for (const tenant of allTenants) {
      const keyCount = await apiKeyService.listTenantKeys(tenant.id);
      const quotaStatus = await quotaService.getTenantQuotaStatus(tenant.id);

      console.log(`🏢 ${tenant.name}:`);
      console.log(`   Plan: ${tenant.plan}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   API Keys: ${keyCount.length}`);
      console.log(
        `   Monthly Usage: ${quotaStatus.usage.monthlyTokensPercent.toFixed(1)}% tokens, ${quotaStatus.usage.monthlyJobsPercent.toFixed(1)}% jobs`
      );

      if (
        quotaStatus.limits.nearMonthlyTokenLimit ||
        quotaStatus.limits.nearMonthlyJobLimit
      ) {
        console.log("   ⚠️  Near quota limits!");
      }
    }

    console.log("\n✅ Multi-tenant example completed successfully!");
  } catch (error) {
    console.error("❌ Error in multi-tenant example:", error.message);
  }
}

// Permission examples
function permissionExamples() {
  console.log("\n🔐 Permission System Examples");
  console.log("=============================\n");

  // Available permissions
  const permissions = PermissionService.getAvailablePermissions();
  console.log("Available permissions:");
  permissions.forEach((p) => {
    console.log(`  ${p.name} - ${p.description} (${p.category})`);
  });

  // Permission sets
  console.log("\nPredefined permission sets:");
  const permissionSets = PermissionService.getPermissionSets();
  permissionSets.forEach((set) => {
    console.log(`  ${set.name}: ${set.description}`);
    console.log(`    Permissions: ${set.permissions.join(", ")}`);
  });

  // Permission validation
  console.log("\nPermission validation examples:");
  const testPermissions = [
    "missions:create",
    "analytics:read",
    "invalid:permission",
  ];
  const validation = PermissionService.validatePermissions(testPermissions);
  console.log(`  Valid: ${validation.valid.join(", ")}`);
  console.log(`  Invalid: ${validation.invalid.join(", ")}`);

  // Permission checking
  console.log("\nPermission checking examples:");
  const userPermissions = ["missions:*", "analytics:read"];
  console.log(`  User permissions: ${userPermissions.join(", ")}`);
  console.log(
    `  Can create missions: ${PermissionService.hasPermission(userPermissions, "missions:create")}`
  );
  console.log(
    `  Can delete missions: ${PermissionService.hasPermission(userPermissions, "missions:delete")}`
  );
  console.log(
    `  Can export analytics: ${PermissionService.hasPermission(userPermissions, "analytics:export")}`
  );
  console.log(
    `  Can manage billing: ${PermissionService.hasPermission(userPermissions, "billing:read")}`
  );

  // Wildcard expansion
  console.log("\nWildcard expansion:");
  const wildcardPermissions = ["missions:*", "analytics:read"];
  const expanded =
    PermissionService.expandWildcardPermissions(wildcardPermissions);
  console.log(`  Original: ${wildcardPermissions.join(", ")}`);
  console.log(
    `  Expanded: ${expanded.slice(0, 5).join(", ")}... (${expanded.length} total)`
  );
}

// Run examples
if (require.main === module) {
  multiTenantExample()
    .then(() => permissionExamples())
    .catch(console.error);
}

export { multiTenantExample, permissionExamples };
