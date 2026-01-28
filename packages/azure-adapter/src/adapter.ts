import type {
  CreatePRParams,
  Integration,
  PlatformAdapter,
} from "@openfarm/core/types/adapters";
import type { WorkItem } from "@openfarm/core/types/domain";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";
import { createPr, fetchProjects, processWorkItemBatch } from "./index";

export class AzurePlatformAdapter implements PlatformAdapter {
  constructor(
    private readonly integration: Integration,
    private readonly project: string,
    private readonly repoId?: string
  ) {}

  getName(): string {
    return `Azure DevOps (${this.project})`;
  }

  async getWorkItem(id: string): Promise<Result<WorkItem>> {
    try {
      if (!this.integration.organization) {
        return err(
          new Error("Organization URL is required for Azure DevOps integration")
        );
      }

      const config = {
        orgUrl: this.integration.organization,
        project: this.project,
        pat: this.integration.credentials,
      };

      const result = await processWorkItemBatch(config, [id]);
      if (!result.ok) {
        return result;
      }

      if (result.value.length === 0) {
        return err(new Error(`Work item ${id} not found`));
      }

      const [workItem] = result.value;
      if (!workItem) {
        return err(new Error(`Work item ${id} not found`));
      }
      return ok(workItem);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async createPullRequest(params: CreatePRParams): Promise<Result<string>> {
    try {
      if (!this.integration.organization) {
        return err(
          new Error("Organization URL is required for Azure DevOps integration")
        );
      }
      if (!this.repoId) {
        return err(
          new Error("Repository ID is required for Azure DevOps Pull Request")
        );
      }

      const config = {
        orgUrl: this.integration.organization,
        project: this.project,
        pat: this.integration.credentials,
        repoId: this.repoId,
      };

      return await createPr(
        config,
        params.title,
        params.description || "",
        params.source,
        params.target
      );
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async postComment(id: string, text: string): Promise<Result<void>> {
    // Implementation for posting comments to Azure DevOps work items
    // For now, we can just log it or implement it if needed
    logger.info({ id, text }, "Post comment to Azure DevOps (not implemented)");
    return ok(undefined);
  }

  async testConnection(): Promise<Result<boolean>> {
    try {
      if (!this.integration.organization) {
        return err(
          new Error("Organization URL is required for Azure DevOps integration")
        );
      }

      const result = await fetchProjects(
        this.integration.organization,
        this.integration.credentials
      );
      if (!result.ok) {
        return err(result.error);
      }

      return ok(true);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
