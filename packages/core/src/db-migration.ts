// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import type {
  AgentConfiguration,
  Integration,
  Job,
  Workflow,
  WorkflowExecution,
  WorkItem,
} from "./types";

interface JsonData {
  jobs?: Job[];
  agentConfigurations?: AgentConfiguration[];
  localWorkItems?: WorkItem[];
  integrations?: Integration[];
  workflows?: Workflow[];
  workflowExecutions?: WorkflowExecution[];
}

/**
 * Creates a backup of the JSON file before migration.
 */
export function backupJsonFile(jsonPath: string): Result<string> {
  try {
    // Dynamic require to avoid bundling Node.js modules in workflow functions
    const { existsSync, copyFileSync } = require("node:fs");
    if (!existsSync(jsonPath)) {
      return err(new Error(`JSON file does not exist: ${jsonPath}`));
    }

    const backupPath = `${jsonPath}.backup`;
    copyFileSync(jsonPath, backupPath);
    console.log(`[Migration] Created backup: ${backupPath}`);
    return ok(backupPath);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Migrates data from JSON file to SQLite database.
 */
export async function migrateFromJson(
  jsonPath: string,
  db: SQL
): Promise<Result<void>> {
  try {
    // Dynamic require to avoid bundling Node.js modules in workflow functions
    const { existsSync, readFileSync, renameSync } = require("node:fs");
    if (!existsSync(jsonPath)) {
      console.log(
        "[Migration] No JSON file found, starting with empty database"
      );
      return ok(undefined);
    }

    console.log(`[Migration] Reading JSON file: ${jsonPath}`);
    const jsonContent = readFileSync(jsonPath, "utf-8");
    const data: JsonData = JSON.parse(jsonContent);

    // Use transaction for migration
    await db.begin(async (tx: SQL) => {
      // Migrate jobs
      if (data.jobs && data.jobs.length > 0) {
        console.log(`[Migration] Migrating ${data.jobs.length} jobs...`);
        for (const job of data.jobs) {
          // Calculate execution time for completed/failed jobs
          let executionTimeSeconds: number | null = null;
          if (
            (job.status === "completed" || job.status === "failed") &&
            job.completedAt &&
            job.createdAt
          ) {
            const startTime = new Date(job.createdAt).getTime();
            const endTime = new Date(job.completedAt).getTime();
            executionTimeSeconds = (endTime - startTime) / 1000;
          }

          await tx`
                        INSERT INTO jobs (
                            id, bug_id, status, result, logs, chat, questions, current_question_id,
                            changes, created_at, completed_at, execution_time_seconds, model, project, repository_url,
                            work_item_title, work_item_description, workflow_execution_id
                        ) VALUES (
                            ${job.id}, ${job.bugId}, ${job.status}, ${job.result || null},
                            ${JSON.stringify(job.logs || [])}, ${JSON.stringify(job.chat || [])},
                            ${JSON.stringify(job.questions || [])}, ${job.currentQuestionId || null},
                            ${JSON.stringify(job.changes || null)}, ${job.createdAt},
                            ${job.completedAt || null}, ${executionTimeSeconds}, ${job.model || null}, ${job.project || null},
                            ${job.repositoryUrl || null}, ${job.workItemTitle || null},
                            ${job.workItemDescription || null}, ${job.workflowExecutionId || null}
                        )
                    `;
        }
        console.log(`[Migration] ✓ Migrated ${data.jobs.length} jobs`);
      }

      // Migrate agent configurations
      if (data.agentConfigurations && data.agentConfigurations.length > 0) {
        console.log(
          `[Migration] Migrating ${data.agentConfigurations.length} agent configurations...`
        );
        for (const config of data.agentConfigurations) {
          await tx`
                        INSERT INTO agent_configurations (
                            id, project, repository_id, repository_url, model, fallback_model,
                            rules, mcp_servers, prompt, enabled, branch_naming_pattern,
                            default_branch, create_pull_request, push_branch, workflow_id,
                            provider, container_name,
                            created_at, updated_at
                        ) VALUES (
                            ${config.id}, ${config.project || null}, ${config.repositoryId || null},
                            ${config.repositoryUrl || null}, ${config.model}, ${config.fallbackModel || null},
                            ${JSON.stringify(config.rules || null)}, ${JSON.stringify(config.mcpServers || [])},
                            ${config.prompt || null}, ${config.enabled ? 1 : 0}, ${config.branchNamingPattern || null},
                            ${config.defaultBranch || null}, ${config.createPullRequest ? 1 : 0},
                            ${config.pushBranch !== false ? 1 : 0}, ${config.workflowId || null},
                            ${config.provider || null}, ${config.containerName || null},
                            ${config.createdAt}, ${config.updatedAt}
                        )
                    `;
        }
        console.log(
          `[Migration] ✓ Migrated ${data.agentConfigurations.length} agent configurations`
        );
      }

      // Migrate local work items
      if (data.localWorkItems && data.localWorkItems.length > 0) {
        console.log(
          `[Migration] Migrating ${data.localWorkItems.length} local work items...`
        );
        for (const item of data.localWorkItems) {
          await tx`
                        INSERT INTO local_work_items (
                            id, title, description, acceptance_criteria, work_item_type, source,
                            status, assigned_agent_id, pr_url, branch_name, project, repository_url,
                            azure_repository_id, azure_repository_project, tags, state, assigned_to,
                            pre_instructions, original_work_item_id
                        ) VALUES (
                            ${item.id}, ${item.title}, ${item.description || null},
                            ${item.acceptanceCriteria || null}, ${item.workItemType}, ${item.source},
                            ${item.status}, ${item.assignedAgentId || null}, ${item.prUrl || null},
                            ${item.branchName || null}, ${item.project}, ${item.repositoryUrl || null},
                            ${item.azureRepositoryId || null}, ${item.azureRepositoryProject || null},
                            ${JSON.stringify(item.tags || [])}, ${item.state || null}, ${item.assignedTo || null},
                            ${item.preInstructions || null}, ${item.originalWorkItemId || null}
                        )
                    `;
        }
        console.log(
          `[Migration] ✓ Migrated ${data.localWorkItems.length} local work items`
        );
      }

      // Migrate integrations
      if (data.integrations && data.integrations.length > 0) {
        console.log(
          `[Migration] Migrating ${data.integrations.length} integrations...`
        );
        for (const integration of data.integrations) {
          await tx`
                        INSERT INTO integrations (
                            id, name, type, credentials, organization, git_user_name,
                            git_user_email, created_at, last_tested_at, last_test_status
                        ) VALUES (
                            ${integration.id}, ${integration.name}, ${integration.type},
                            ${integration.credentials}, ${integration.organization || null},
                            ${integration.gitUserName || null}, ${integration.gitUserEmail || null},
                            ${integration.createdAt}, ${integration.lastTestedAt || null},
                            ${integration.lastTestStatus || null}
                        )
                    `;
        }
        console.log(
          `[Migration] ✓ Migrated ${data.integrations.length} integrations`
        );
      }

      // Migrate workflows
      if (data.workflows && data.workflows.length > 0) {
        console.log(
          `[Migration] Migrating ${data.workflows.length} workflows...`
        );
        for (const workflow of data.workflows) {
          await tx`
                        INSERT INTO workflows (id, name, description, steps, created_at, updated_at)
                        VALUES (
                            ${workflow.id}, ${workflow.name}, ${workflow.description || null},
                            ${JSON.stringify(workflow.steps)}, ${workflow.createdAt}, ${workflow.updatedAt}
                        )
                    `;
        }
        console.log(
          `[Migration] ✓ Migrated ${data.workflows.length} workflows`
        );
      }

      // Migrate workflow executions
      if (data.workflowExecutions && data.workflowExecutions.length > 0) {
        console.log(
          `[Migration] Migrating ${data.workflowExecutions.length} workflow executions...`
        );
        for (const execution of data.workflowExecutions) {
          await tx`
                        INSERT INTO workflow_executions (
                            id, workflow_id, work_item_id, job_id, status, current_step_id,
                            step_results, created_at, updated_at, completed_at
                        ) VALUES (
                            ${execution.id}, ${execution.workflowId}, ${execution.workItemId},
                            ${execution.jobId}, ${execution.status}, ${execution.currentStepId || null},
                            ${JSON.stringify(execution.stepResults)}, ${execution.createdAt},
                            ${execution.updatedAt}, ${execution.completedAt || null}
                        )
                    `;
        }
        console.log(
          `[Migration] ✓ Migrated ${data.workflowExecutions.length} workflow executions`
        );
      }
    });

    console.log("[Migration] ✓ Migration completed successfully");

    // Rename JSON file to indicate migration is complete
    const migratedPath = `${jsonPath}.migrated`;
    if (existsSync(jsonPath) && !existsSync(migratedPath)) {
      renameSync(jsonPath, migratedPath);
      console.log(`[Migration] Renamed JSON file to: ${migratedPath}`);
    }

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
