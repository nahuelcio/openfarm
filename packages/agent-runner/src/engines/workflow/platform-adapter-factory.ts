/**
 * Platform Adapter Factory
 *
 * Creates appropriate platform adapters based on work item source and repository URL.
 * Supports Azure DevOps and GitHub with automatic fallback detection.
 *
 * @module platform-adapter-factory
 */

import type {
  CreatePRParams,
  PlatformAdapter,
} from "@openfarm/core/types/adapters";
import type { Integration, WorkItem } from "@openfarm/core/types/domain";
import { err, ok, type Result } from "@openfarm/result";

/** Configuration for Azure DevOps adapter */
export interface AzureAdapterConfig {
  orgUrl: string;
  project: string;
  pat: string;
  repoId?: string;
}

/** Configuration for GitHub adapter */
export interface GitHubAdapterConfig {
  token: string;
  owner: string;
  repo: string;
}

/** Platform type detection result */
export type PlatformType = "azure" | "github" | "unknown";

/**
 * Detects the platform type from a work item or repository URL
 *
 * @param workItem - The work item to analyze
 * @returns The detected platform type
 *
 * @example
 * ```typescript
 * const type = detectPlatformType(workItem);
 * // Returns: "github" | "azure" | "unknown"
 * ```
 */
export function detectPlatformType(workItem: WorkItem): PlatformType {
  // First check the source field (most reliable)
  if (workItem.source === "github") {
    return "github";
  }
  if (workItem.source === "azure-devops") {
    return "azure";
  }

  // Fallback to URL detection
  const repoUrl = workItem.repositoryUrl?.toLowerCase() || "";

  if (repoUrl.includes("github.com")) {
    return "github";
  }

  if (
    repoUrl.includes("dev.azure.com") ||
    repoUrl.includes("visualstudio.com")
  ) {
    return "azure";
  }

  return "unknown";
}

/**
 * Parses a GitHub repository URL to extract owner and repo name
 *
 * @param url - The GitHub repository URL
 * @returns Result containing owner and repo, or an error
 *
 * @example
 * ```typescript
 * const result = parseGitHubUrl("https://github.com/owner/repo.git");
 * // Returns: ok({ owner: "owner", repo: "repo" })
 * ```
 */
export function parseGitHubUrl(
  url: string
): Result<{ owner: string; repo: string }> {
  // Handle various GitHub URL formats:
  // - https://github.com/owner/repo.git
  // - https://github.com/owner/repo
  // - git@github.com:owner/repo.git
  // - github.com/owner/repo

  const patterns = [
    // HTTPS format
    /github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/i,
    // SSH format
    /git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1] && match[2]) {
      return ok({ owner: match[1], repo: match[2] });
    }
  }

  return err(new Error(`Cannot parse GitHub URL: ${url}`));
}

/**
 * Creates a GitHub platform adapter using the integration credentials
 *
 * @param integration - The GitHub integration with credentials
 * @param workItem - The work item with repository information
 * @returns Result containing the platform adapter or an error
 */
export async function createGitHubAdapter(
  integration: Integration,
  workItem: WorkItem
): Promise<Result<PlatformAdapter>> {
  if (!workItem.repositoryUrl) {
    return err(new Error("Repository URL is required for GitHub adapter"));
  }

  const parseResult = parseGitHubUrl(workItem.repositoryUrl);
  if (!parseResult.ok) {
    return parseResult;
  }

  const { owner, repo } = parseResult.value;

  // Dynamic import to avoid bundling issues
  const { GitHubPlatformAdapter } = await import("@openfarm/github-adapter");
  return ok(new GitHubPlatformAdapter(integration, owner, repo));
}

/**
 * Creates an Azure DevOps platform adapter using the integration credentials
 *
 * @param integration - The Azure integration with credentials
 * @param workItem - The work item with project information
 * @returns Result containing the platform adapter or an error
 */
export async function createAzureAdapter(
  integration: Integration,
  workItem: WorkItem
): Promise<Result<PlatformAdapter>> {
  if (!integration.organization) {
    return err(
      new Error("Organization URL is required for Azure DevOps adapter")
    );
  }

  // Dynamic import to avoid bundling issues
  const { AzurePlatformAdapter } = await import("@openfarm/azure-adapter");

  return ok(
    new AzurePlatformAdapter(
      integration,
      workItem.project,
      workItem.azureRepositoryId
    )
  );
}

/**
 * Creates a fallback adapter for Azure DevOps (used when no integration is available)
 *
 * @param config - Azure DevOps configuration from agent config
 * @param workItem - The work item
 * @returns A platform adapter that uses direct API calls
 */
export function createAzureFallbackAdapter(
  config: AzureAdapterConfig,
  workItem: WorkItem
): PlatformAdapter {
  return {
    getName: () => "Azure DevOps Adapter (Fallback)",

    testConnection: async () => ok(true),

    getWorkItem: async (id: string) => {
      const { processWorkItemBatch } = await import("@openfarm/azure-adapter");
      const res = await processWorkItemBatch(config, [id]);

      if (!res.ok) {
        return err(res.error);
      }
      const item = res.value[0];
      if (!item) {
        return err(new Error(`Work item ${id} not found`));
      }
      return ok(item);
    },

    createPullRequest: async (params: CreatePRParams) => {
      const { createPr } = await import("@openfarm/azure-adapter");
      const prConfig = {
        ...config,
        repoId: workItem.azureRepositoryId,
      };
      return createPr(
        prConfig,
        params.title,
        params.description || "",
        params.source,
        params.target
      );
    },

    postComment: async (id: string, text: string) => {
      const { postComment } = await import("@openfarm/azure-adapter");
      return postComment(config, id, text);
    },
  };
}

/**
 * Creates a fallback adapter for GitHub (used when no integration is available)
 *
 * @param token - GitHub personal access token
 * @param workItem - The work item with repository URL
 * @returns Result containing a platform adapter or an error
 */
export function createGitHubFallbackAdapter(
  token: string,
  workItem: WorkItem
): Result<PlatformAdapter> {
  if (!workItem.repositoryUrl) {
    return err(new Error("Repository URL is required for GitHub fallback"));
  }

  const parseResult = parseGitHubUrl(workItem.repositoryUrl);
  if (!parseResult.ok) {
    return parseResult;
  }

  const { owner, repo } = parseResult.value;

  // Create a minimal integration object for the adapter
  const _integration: Integration = {
    id: "fallback-github",
    name: "GitHub Fallback",
    type: "github",
    credentials: token,
    createdAt: new Date().toISOString(),
  };

  // Import synchronously is not possible, so we create inline adapter
  const adapter: PlatformAdapter = {
    getName: () => `GitHub (${owner}/${repo}) [Fallback]`,

    testConnection: async () => {
      try {
        const res = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Minions-Farm-Agent",
          },
        });
        return res.ok ? ok(true) : err(new Error(`HTTP ${res.status}`));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getWorkItem: async (id: string) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues/${id}`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Minions-Farm-Agent",
            },
          }
        );

        if (!res.ok) {
          return err(new Error(`GitHub API Error: ${res.statusText}`));
        }

        const data = (await res.json()) as Record<string, unknown>;
        const workItem: WorkItem = {
          id: String(data.number),
          title: String(data.title || ""),
          description: String(data.body || ""),
          acceptanceCriteria: "",
          workItemType: "Task",
          source: "github",
          status: data.state === "open" ? "new" : "completed",
          project: repo,
          repositoryUrl: `https://github.com/${owner}/${repo}.git`,
        };

        return ok(workItem);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createPullRequest: async (params: CreatePRParams) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/pulls`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Minions-Farm-Agent",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: params.title,
              body: params.description,
              head: params.source,
              base: params.target,
            }),
          }
        );

        if (!res.ok) {
          const errorBody = await res.json().catch(() => ({}));
          return err(
            new Error(
              `GitHub API Error: ${(errorBody as { message?: string }).message || res.statusText}`
            )
          );
        }

        const data = (await res.json()) as { html_url: string };
        return ok(data.html_url);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    postComment: async (id: string, text: string) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues/${id}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "Minions-Farm-Agent",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ body: text }),
          }
        );

        if (!res.ok) {
          return err(new Error(`GitHub API Error: ${res.statusText}`));
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  return ok(adapter);
}

/** Options for creating a fallback platform adapter */
export interface CreateFallbackAdapterOptions {
  /** The work item to create the adapter for */
  workItem: WorkItem;
  /** Azure DevOps configuration (optional) */
  azureConfig?: AzureAdapterConfig;
  /** GitHub token (optional) */
  githubToken?: string;
}

/**
 * Creates an appropriate fallback platform adapter based on the work item's platform
 *
 * Uses Railway pattern - returns Result instead of throwing
 *
 * @param options - Configuration options
 * @returns Result containing the appropriate platform adapter or an error
 *
 * @example
 * ```typescript
 * const result = createFallbackAdapter({
 *   workItem,
 *   azureConfig: { orgUrl, project, pat },
 *   githubToken: process.env.GITHUB_TOKEN,
 * });
 *
 * if (result.ok) {
 *   const adapter = result.value;
 *   const prResult = await adapter.createPullRequest(params);
 * }
 * ```
 */
export function createFallbackAdapter(
  options: CreateFallbackAdapterOptions
): Result<PlatformAdapter> {
  const { workItem, azureConfig, githubToken } = options;
  const platformType = detectPlatformType(workItem);

  switch (platformType) {
    case "github": {
      if (!githubToken) {
        return err(
          new Error(
            "GitHub token is required for GitHub repositories. " +
              "Set GITHUB_TOKEN or COPILOT_TOKEN environment variable."
          )
        );
      }
      return createGitHubFallbackAdapter(githubToken, workItem);
    }

    case "azure": {
      if (!azureConfig) {
        return err(
          new Error(
            "Azure DevOps configuration is required for Azure repositories. " +
              "Set AZURE_ORG_URL, AZURE_PROJECT, and AZURE_PAT environment variables."
          )
        );
      }
      return ok(createAzureFallbackAdapter(azureConfig, workItem));
    }

    default:
      return err(
        new Error(
          `Cannot detect platform type for repository: ${workItem.repositoryUrl}. ` +
            "Supported platforms: GitHub, Azure DevOps."
        )
      );
  }
}
