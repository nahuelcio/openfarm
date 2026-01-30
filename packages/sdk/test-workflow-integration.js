#!/usr/bin/env node

/**
 * Test script to verify workflow engine integration
 */

import { getDb, initializePredefinedWorkflows } from "@openfarm/core/db";
import { executeWorkflow, InMemoryEventBus } from "@openfarm/workflow-engine";

async function testWorkflowIntegration() {
  console.log("🧪 Testing workflow engine integration...");

  try {
    // Initialize database and workflows
    console.log("📦 Initializing database and workflows...");
    const db = await getDb();
    const result = await initializePredefinedWorkflows(db);

    if (!result.ok) {
      console.error("❌ Failed to initialize workflows:", result.error.message);
      return;
    }

    console.log("✅ Workflows initialized successfully");

    // Test basic workflow structure
    const executionId = `test-${Date.now()}`;
    const jobId = `job-${Date.now()}`;

    const context = {
      workflowId: "task_runner",
      workItemId: "test-item",
      repoPath: process.cwd(),
      repoUrl: "",
      branchName: "",
      defaultBranch: "main",
      gitConfig: {
        repoPath: process.cwd(),
        repoUrl: "",
        gitUserName: "test",
        gitUserEmail: "test@example.com",
      },
      workItem: {
        id: "test-task",
        title: "Test task",
        description: "Test task description",
        acceptanceCriteria: "",
        workItemType: "Task",
        source: "local",
        status: "new",
        project: "test",
      },
      jobId,
      executionId,
      workflowVariables: {
        task: "echo 'Hello from workflow engine!'",
        provider: "direct-api",
        model: undefined,
        currentDate: new Date().toISOString(),
      },
    };

    const request = {
      executionId,
      jobId,
      workflowId: "task_runner",
      workItemId: "test-item",
      context,
      previewMode: true, // Preview mode to avoid actual execution
      agentConfig: {
        provider: "direct-api",
      },
    };

    const eventBus = new InMemoryEventBus();

    const engineConfig = {
      db,
      logger: {
        debug: async (message) => console.log(`[DEBUG] ${message}`),
        info: async (message) => console.log(`[INFO] ${message}`),
        error: async (message) => console.log(`[ERROR] ${message}`),
      },
      eventBus,
      stepExecutor: {
        execute: async (stepRequest, executionContext) => {
          console.log(`🔧 Executing step: ${stepRequest.action}`);

          // Mock execution for testing
          if (stepRequest.action === "git.branch") {
            return { success: true, value: "test-branch" };
          }
          if (stepRequest.action === "git.worktree") {
            return { success: true, value: "/tmp/test-worktree" };
          }
          if (stepRequest.action === "agent.code") {
            return { success: true, value: "Mock agent execution completed" };
          }

          return {
            success: false,
            error: new Error(`Unsupported action: ${stepRequest.action}`),
          };
        },
      },
      errorHandler: {
        handle: async (error, context) => {
          console.error(`[ERROR] ${error}`);
        },
      },
      approvalHandler: {
        waitForApproval: async () => {
          throw new Error("Approval not supported in test");
        },
      },
    };

    console.log("🚀 Executing workflow...");
    const workflowResult = await executeWorkflow(request, engineConfig);

    if (workflowResult.success) {
      console.log("✅ Workflow executed successfully!");
      console.log(
        `   Completed steps: ${workflowResult.completedSteps}/${workflowResult.totalSteps}`
      );
    } else {
      console.log("❌ Workflow execution failed:", workflowResult.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

testWorkflowIntegration();
