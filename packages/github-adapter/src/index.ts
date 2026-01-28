import type {
  CreatePRParams,
  Integration,
  PlatformAdapter,
} from "@openfarm/core/types/adapters";
import type { WorkItem } from "@openfarm/core/types/domain";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";

export class GitHubPlatformAdapter implements PlatformAdapter {
  private readonly integration: Integration;
  private readonly owner: string;
  private readonly repo: string;

  constructor(integration: Integration, owner: string, repo: string) {
    this.integration = integration;
    this.owner = owner;
    this.repo = repo;
  }

  getName(): string {
    return `GitHub (${this.owner}/${this.repo})`;
  }

  private async fetchGitHub(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<unknown> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `https://api.github.com${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `token ${this.integration.credentials}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Minions-Farm-Agent",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorBody = (await res
        .json()
        .catch(() => ({ message: res.statusText }))) as {
        message?: string;
        errors?:
          | Array<{
              resource?: string;
              field?: string;
              code?: string;
              message?: string;
            }>
          | unknown;
      };
      // Include more details in error message for better debugging
      let errorDetails = "";
      if (Array.isArray(errorBody.errors)) {
        // GitHub returns validation errors as array: [{ resource, field, code, message }]
        errorDetails = ` Details: ${errorBody.errors
          .map(
            (e) =>
              `${e.resource || ""}${e.field ? `.${e.field}` : ""}: ${e.message || e.code || "unknown error"}`
          )
          .join(", ")}`;
      } else if (errorBody.errors) {
        errorDetails = ` Details: ${JSON.stringify(errorBody.errors)}`;
      }
      // Log full error response for debugging
      const fullError = `GitHub API Error: ${errorBody.message || res.statusText}${errorDetails}`;
      logger.error(
        {
          status: res.status,
          statusText: res.statusText,
          errorMessage: errorBody.message,
          errorDetails: errorBody.errors,
          endpoint: url,
        },
        fullError
      );
      throw new Error(fullError);
    }

    if (res.status === 204) {
      return null;
    }
    return res.json();
  }

  async getWorkItem(id: string): Promise<Result<WorkItem>> {
    try {
      // id can be an issue number
      const data = (await this.fetchGitHub(
        `/repos/${this.owner}/${this.repo}/issues/${id}`
      )) as any;

      const workItem: WorkItem = {
        id: String(data.number),
        title: data.title,
        description: data.body || "",
        acceptanceCriteria: "", // GitHub doesn't have a specific field for this by default
        workItemType: "Task", // Map issues to Task by default
        source: "github",
        status: (data.state === "open"
          ? "new"
          : "completed") as WorkItem["status"],
        project: this.repo,
        repositoryUrl: `https://github.com/${this.owner}/${this.repo}.git`,
        tags: data.labels?.map((l: { name: string }) => l.name) || [],
        state: data.state,
        assignedTo: data.assignee?.login || undefined,
      };

      return ok(workItem);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async createPullRequest(params: CreatePRParams): Promise<Result<string>> {
    // Helper function to check if a branch exists in the remote
    const checkBranchExists = async (branchName: string): Promise<boolean> => {
      try {
        await this.fetchGitHub(
          `/repos/${this.owner}/${this.repo}/git/refs/heads/${branchName}`
        );
        return true;
      } catch {
        return false;
      }
    };

    try {
      // Validate that head and base are different
      if (params.source === params.target) {
        return err(
          new Error(
            `Cannot create PR: source branch '${params.source}' and target branch '${params.target}' are the same`
          )
        );
      }

      // Find a valid base branch (target, main, or master)
      let baseBranch = params.target;
      const branchesToTry = [params.target, "main", "master"];
      let foundValidBase = false;

      for (const branch of branchesToTry) {
        if (await checkBranchExists(branch)) {
          baseBranch = branch;
          foundValidBase = true;
          if (branch !== params.target) {
            logger.info(
              {
                owner: this.owner,
                repo: this.repo,
                requestedBranch: params.target,
                actualBranch: branch,
              },
              `Target branch '${params.target}' not found, using '${branch}' as base branch`
            );
          }
          break;
        }
      }

      if (!foundValidBase) {
        return err(
          new Error(
            `Cannot create PR: Base branch '${params.target}' and fallback branches (main, master) do not exist in repository ${this.owner}/${this.repo}`
          )
        );
      }

      // From this point on, always use the resolved base branch.
      // (params.target may not actually exist in the repo.)
      const resolvedTargetBranch = baseBranch;

      // First check if a PR already exists for this branch
      const existingPRs = (await this.fetchGitHub(
        `/repos/${this.owner}/${this.repo}/pulls?head=${this.owner}:${params.source}&state=open`
      )) as any[];

      if (Array.isArray(existingPRs) && existingPRs.length > 0) {
        // PR already exists, return its URL
        logger.info(
          { owner: this.owner, repo: this.repo, branch: params.source },
          "PR already exists, returning existing PR URL"
        );
        return ok(existingPRs[0].html_url as string);
      }

      // Validate title and description before creating PR
      if (!params.title || params.title.trim().length === 0) {
        logger.error(
          {
            owner: this.owner,
            repo: this.repo,
            branch: params.source,
            title: params.title,
          },
          "PR title is empty or invalid"
        );
        return err(
          new Error(
            `Cannot create PR: Title is required and cannot be empty for repository ${this.owner}/${this.repo}`
          )
        );
      }

      // Description can be empty, but log it if it is
      if (!params.description || params.description.trim().length === 0) {
        logger.warn(
          {
            owner: this.owner,
            repo: this.repo,
            branch: params.source,
          },
          "PR description is empty"
        );
      }

      // Log PR creation attempt with details (truncate long descriptions for logging)
      const descriptionPreview =
        params.description && params.description.length > 100
          ? `${params.description.substring(0, 100)}...`
          : params.description || "(empty)";
      logger.info(
        {
          owner: this.owner,
          repo: this.repo,
          branch: params.source,
          baseBranch: resolvedTargetBranch,
          titleLength: params.title.length,
          descriptionLength: params.description?.length || 0,
        },
        `Attempting to create PR: "${params.title}" (${params.source} -> ${resolvedTargetBranch})`
      );

      // Wait a bit after push to ensure branch is available in GitHub API
      // This helps avoid Validation Failed errors due to branch not being available yet
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay

      // Verify that the source branch exists in the remote before creating PR
      // Retry up to 3 times with exponential backoff
      let sourceBranchExists = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await this.fetchGitHub(
            `/repos/${this.owner}/${this.repo}/git/refs/heads/${params.source}`
          );
          sourceBranchExists = true;
          break;
        } catch (branchCheckError) {
          const branchErrorMsg =
            branchCheckError instanceof Error
              ? branchCheckError.message
              : String(branchCheckError);
          if (attempt < 3) {
            const delay = 2 ** (attempt - 1) * 1000; // 1s, 2s
            logger.warn(
              {
                owner: this.owner,
                repo: this.repo,
                branch: params.source,
                attempt,
              },
              `Source branch not found in remote (attempt ${attempt}/3): ${branchErrorMsg}. Retrying in ${delay}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            logger.error(
              { owner: this.owner, repo: this.repo, branch: params.source },
              `Source branch '${params.source}' not found in remote after 3 attempts. The branch may not have been pushed successfully.`
            );
          }
        }
      }

      // If source branch doesn't exist after all retries, return an error
      if (!sourceBranchExists) {
        return err(
          new Error(
            `Cannot create PR: Source branch '${params.source}' does not exist in remote repository ${this.owner}/${this.repo}. The git push step may have failed. Please check if the branch was pushed successfully.`
          )
        );
      }

      // Check if there are commits between the branches before attempting to create PR
      // This prevents the "Validation Failed" error when branches have no differences
      try {
        const compareResult = (await this.fetchGitHub(
          `/repos/${this.owner}/${this.repo}/compare/${resolvedTargetBranch}...${params.source}`
        )) as any;

        if (
          compareResult.status === "identical" ||
          compareResult.ahead_by === 0
        ) {
          logger.warn(
            {
              owner: this.owner,
              repo: this.repo,
              source: params.source,
              base: resolvedTargetBranch,
              status: compareResult.status,
              aheadBy: compareResult.ahead_by,
              behindBy: compareResult.behind_by,
            },
            `No commits to merge: source branch '${params.source}' has no new commits compared to '${resolvedTargetBranch}'`
          );
          return err(
            new Error(
              `Cannot create PR: No commits between '${params.source}' and '${resolvedTargetBranch}'. The source branch may not have any new changes, or the changes were not committed/pushed successfully.`
            )
          );
        }

        logger.info(
          {
            owner: this.owner,
            repo: this.repo,
            source: params.source,
            base: resolvedTargetBranch,
            aheadBy: compareResult.ahead_by,
            commits: compareResult.commits?.length || 0,
          },
          `Branch comparison: ${params.source} is ${compareResult.ahead_by} commit(s) ahead of ${resolvedTargetBranch}`
        );
      } catch (compareError) {
        // If we cannot compare branches, PR creation is likely to fail with Validation Failed.
        // Fail early with a clearer error so the workflow can retry after push propagation.
        logger.warn(
          {
            owner: this.owner,
            repo: this.repo,
            source: params.source,
            base: resolvedTargetBranch,
            error:
              compareError instanceof Error
                ? compareError.message
                : String(compareError),
          },
          "Could not compare branches before PR creation"
        );

        return err(
          new Error(
            `Cannot create PR right now: failed to compare '${params.source}' against '${resolvedTargetBranch}'. This is often a transient GitHub propagation issue right after pushing. Please retry.`
          )
        );
      }

      // Prepare PR payload
      const prPayload = {
        title: params.title.trim(),
        body: params.description?.trim() || "",
        head: params.source,
        base: resolvedTargetBranch,
      };

      logger.debug(
        {
          owner: this.owner,
          repo: this.repo,
          payload: {
            ...prPayload,
            body: descriptionPreview, // Use preview for logging
          },
        },
        "Sending PR creation request to GitHub API"
      );

      const data = (await this.fetchGitHub(
        `/repos/${this.owner}/${this.repo}/pulls`,
        {
          method: "POST",
          body: JSON.stringify(prPayload),
        }
      )) as any;

      logger.info(
        {
          owner: this.owner,
          repo: this.repo,
          branch: params.source,
          prUrl: data.html_url,
        },
        "PR created successfully"
      );
      return ok(data.html_url as string);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Extract more details from error if available
      let errorDetails: Record<string, unknown> = {};
      try {
        if (error instanceof Error && "response" in error) {
          const response = (
            error as {
              response?: {
                status?: number;
                statusText?: string;
                text?: () => Promise<string>;
              };
            }
          ).response;
          if (response) {
            errorDetails = {
              status: response.status,
              statusText: response.statusText,
              body: (await response.text?.().catch(() => "")) || "",
            };
          }
        }
      } catch {
        // Ignore errors extracting error details
      }

      // Log detailed error information
      logger.error(
        {
          owner: this.owner,
          repo: this.repo,
          branch: params.source,
          target: params.target,
          title: params.title,
          titleLength: params.title?.length || 0,
          descriptionLength: params.description?.length || 0,
          error: errorMessage,
          errorDetails,
        },
        "Failed to create PR"
      );

      // If validation failed, retry with exponential backoff
      // This handles the case where the branch was just pushed and GitHub needs time to propagate it
      if (
        errorMessage.includes("Validation Failed") ||
        errorMessage.includes("No commits between")
      ) {
        logger.warn(
          {
            owner: this.owner,
            repo: this.repo,
            branch: params.source,
            error: errorMessage,
            errorDetails,
          },
          "Validation failed, retrying with backoff..."
        );

        // Retry up to 3 times with exponential backoff (1s, 2s, 4s)
        for (let attempt = 1; attempt <= 3; attempt++) {
          const delay = 2 ** (attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, delay));

          try {
            // First check if PR was created in the meantime
            const existingPRs = (await this.fetchGitHub(
              `/repos/${this.owner}/${this.repo}/pulls?head=${this.owner}:${params.source}&state=open`
            )) as any[];
            if (Array.isArray(existingPRs) && existingPRs.length > 0) {
              logger.info(
                { owner: this.owner, repo: this.repo, branch: params.source },
                "PR found after retry (race condition)"
              );
              return ok(existingPRs[0].html_url as string);
            }

            // Find valid base branch again for retry (in case it changed)
            let retryBaseBranch = params.target;
            const retryBranchesToTry = [params.target, "main", "master"];
            let foundRetryBase = false;

            for (const branch of retryBranchesToTry) {
              if (await checkBranchExists(branch)) {
                retryBaseBranch = branch;
                foundRetryBase = true;
                break;
              }
            }

            if (!foundRetryBase) {
              return err(
                new Error(
                  `Cannot create PR: Base branch '${params.target}' and fallback branches (main, master) do not exist in repository ${this.owner}/${this.repo}`
                )
              );
            }

            // Try creating the PR again with validated payload
            const retryPayload = {
              title: params.title.trim(),
              body: params.description?.trim() || "",
              head: params.source,
              base: retryBaseBranch,
            };

            logger.debug(
              {
                owner: this.owner,
                repo: this.repo,
                attempt,
                payload: {
                  ...retryPayload,
                  body:
                    retryPayload.body.length > 100
                      ? `${retryPayload.body.substring(0, 100)}...`
                      : retryPayload.body || "(empty)",
                },
              },
              `Retry ${attempt}/3: Sending PR creation request to GitHub API`
            );

            const data = (await this.fetchGitHub(
              `/repos/${this.owner}/${this.repo}/pulls`,
              {
                method: "POST",
                body: JSON.stringify(retryPayload),
              }
            )) as any;

            logger.info(
              {
                owner: this.owner,
                repo: this.repo,
                branch: params.source,
                attempt,
                prUrl: data.html_url,
              },
              "PR created successfully after retry"
            );
            return ok(data.html_url as string);
          } catch (retryError) {
            const retryErrorMsg =
              retryError instanceof Error
                ? retryError.message
                : String(retryError);
            logger.warn(
              {
                owner: this.owner,
                repo: this.repo,
                branch: params.source,
                attempt,
                error: retryErrorMsg,
              },
              `PR creation retry ${attempt}/3 failed`
            );

            // If this is the last attempt, return the error
            if (attempt === 3) {
              // Final check for existing PR before giving up
              try {
                const existingPRs = await this.fetchGitHub(
                  `/repos/${this.owner}/${this.repo}/pulls?head=${this.owner}:${params.source}&state=open`
                );
                if (Array.isArray(existingPRs) && existingPRs.length > 0) {
                  logger.info(
                    {
                      owner: this.owner,
                      repo: this.repo,
                      branch: params.source,
                    },
                    "PR found on final check"
                  );
                  return ok(existingPRs[0].html_url);
                }
              } catch {
                // Ignore final check error
              }

              return err(
                new Error(
                  `${errorMessage} (after ${attempt} retries with backoff)`
                )
              );
            }
          }
        }
      }

      return err(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  async postComment(id: string, text: string): Promise<Result<void>> {
    try {
      await this.fetchGitHub(
        `/repos/${this.owner}/${this.repo}/issues/${id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ body: text }),
        }
      );
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Updates a GitHub issue
   */
  async updateIssue(
    issueNumber: string,
    updates: {
      state?: "open" | "closed";
      title?: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    }
  ): Promise<Result<void>> {
    try {
      const updatePayload: Record<string, unknown> = {};

      if (updates.state !== undefined) {
        updatePayload.state = updates.state;
      }
      if (updates.title !== undefined) {
        updatePayload.title = updates.title;
      }
      if (updates.body !== undefined) {
        updatePayload.body = updates.body;
      }
      if (updates.labels !== undefined) {
        updatePayload.labels = updates.labels;
      }
      if (updates.assignees !== undefined) {
        updatePayload.assignees = updates.assignees;
      }

      if (Object.keys(updatePayload).length === 0) {
        return ok(undefined); // No updates to apply
      }

      await this.fetchGitHub(
        `/repos/${this.owner}/${this.repo}/issues/${issueNumber}`,
        {
          method: "PATCH",
          body: JSON.stringify(updatePayload),
        }
      );

      logger.info(
        { owner: this.owner, repo: this.repo, issueNumber, updates },
        "Successfully updated GitHub issue"
      );
      return ok(undefined);
    } catch (error) {
      logger.error(
        {
          owner: this.owner,
          repo: this.repo,
          issueNumber,
          updates,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to update GitHub issue"
      );
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async testConnection(): Promise<Result<boolean>> {
    try {
      // Just test if we can access the user or the repo
      await this.fetchGitHub("/user");
      return ok(true);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
