import { AzurePlatformAdapter } from "@openfarm/azure-adapter/adapter";
import type {
  AgentConfig,
  Integration,
  WorkItem,
} from "@openfarm/core/types/domain";
import { authenticateAzureDevOpsUrl } from "@openfarm/git-adapter";
import { GitHubPlatformAdapter } from "@openfarm/github-adapter";
import { err, ok, type Result } from "@openfarm/result";
import { authenticateGitHubUrl } from "./github";

/**
 * Result of authentication process
 */
export interface AuthenticationResult {
  authenticatedUrl: string;
  integration: Integration;
  platformAdapter: AzurePlatformAdapter | GitHubPlatformAdapter;
}

/**
 * Authenticates repository URL and creates appropriate platform adapter.
 * This function handles both GitHub and Azure DevOps authentication.
 *
 * @param workItem - Work item with repository information
 * @param integrations - Array of available integrations
 * @param config - Agent configuration
 * @param log - Logging function
 * @returns Result with authenticated URL and platform adapter
 *
 * @example
 * ```typescript
 * const result = await authenticateRepository(
 *   workItem,
 *   integrations,
 *   config,
 *   log
 * );
 *
 * if (result.ok) {
 *   const { authenticatedUrl, platformAdapter } = result.value;
 *   // Use authenticated URL and adapter...
 * }
 * ```
 */
export async function authenticateRepository(
  workItem: WorkItem,
  integrations: Integration[],
  config: AgentConfig,
  log: (message: string) => Promise<void>
): Promise<Result<AuthenticationResult>> {
  const repoUrl = workItem.repositoryUrl;
  if (!repoUrl) {
    return err(new Error("Work item does not have a repository URL assigned"));
  }

  const isGitHub = repoUrl.includes("github.com");
  const integrationType = isGitHub ? "github" : "azure";

  // Find appropriate integration
  const integration =
    integrations.find(
      (i: Integration) =>
        i.type === integrationType &&
        (isGitHub ||
          (i.organization &&
            repoUrl.includes(
              i.organization.replace("https://", "").replace("http://", "")
            )))
    ) || integrations.find((i: Integration) => i.type === integrationType);

  if (!integration) {
    return err(
      new Error(
        `${isGitHub ? "GitHub" : "Azure"} integration not found. Please configure it in the integrations section.`
      )
    );
  }

  // Authenticate URL for cloning
  let authenticatedUrl: string;
  if (isGitHub) {
    if (integration.credentials) {
      authenticatedUrl = authenticateGitHubUrl(
        repoUrl,
        integration.credentials
      );
      await log("Authenticated GitHub URL (masked)");
    } else {
      await log(
        "Warning: No GitHub credentials found in integration. Repository may be private and cloning may fail."
      );
      authenticatedUrl = repoUrl;
    }
  } else {
    authenticatedUrl = authenticateAzureDevOpsUrl(
      repoUrl,
      integration.credentials || config.azurePat
    );
    await log("Authenticated Azure DevOps URL (masked)");
  }

  // Create PlatformAdapter
  let platformAdapter: AzurePlatformAdapter | GitHubPlatformAdapter;
  if (isGitHub) {
    // Extract owner/repo from URL
    const urlParts = repoUrl.replace(".git", "").split("/");
    const repo = urlParts.pop() || "";
    const owner = urlParts.pop() || "";
    platformAdapter = new GitHubPlatformAdapter(integration, owner, repo);
  } else {
    platformAdapter = new AzurePlatformAdapter(
      integration,
      workItem.project || "DefaultProject",
      workItem.azureRepositoryId
    );
  }

  return ok({
    authenticatedUrl,
    integration,
    platformAdapter,
  });
}
