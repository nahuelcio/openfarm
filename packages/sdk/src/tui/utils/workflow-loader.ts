import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Workflow, WorkflowStep } from "@openfarm/core";
import { StepType } from "@openfarm/core";
import { getDb } from "@openfarm/core/db";
import { syncWorkflowsToDatabase } from "@openfarm/core/db/workflows/crud";
import YAML from "js-yaml";

// Default workflow ID
const DEFAULT_WORKFLOW_ID = "oneshot";

// Hardcoded minimal workflows for instant display
export const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: "oneshot",
    name: "One Shot",
    description: "Direct execution without git operations",
    steps: [
      {
        id: "execute",
        type: StepType.CODE,
        action: "agent.code",
        config: {},
      } as WorkflowStep,
    ],
    parameters: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "oneshot_with_git",
    name: "One Shot + Git",
    description: "Execution with branch and worktree",
    steps: [
      {
        id: "branch",
        type: StepType.GIT,
        action: "git.branch",
        config: {},
      } as WorkflowStep,
      {
        id: "worktree",
        type: StepType.GIT,
        action: "git.worktree",
        config: {},
      } as WorkflowStep,
      {
        id: "execute",
        type: StepType.CODE,
        action: "agent.code",
        config: {},
      } as WorkflowStep,
    ],
    parameters: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "with_human_approval",
    name: "With Human Approval",
    description: "Execution requiring human approval",
    steps: [
      {
        id: "execute",
        type: StepType.CODE,
        action: "agent.code",
        config: {},
      } as WorkflowStep,
    ],
    parameters: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

];

async function loadWorkflowsFromYaml(): Promise<Workflow[]> {
  const possiblePaths = [
    resolve(process.cwd(), "packages/core/workflows"),
    resolve(process.cwd(), "../core/workflows"),
    resolve(process.cwd(), "../../core/workflows"),
    resolve(__dirname, "../../../../../core/workflows"),
  ];

  const loadPromises = possiblePaths.map(async (dir) => {
    try {
      const files = await readdir(dir);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml")
      );

      if (yamlFiles.length === 0) {
        return null;
      }

      const workflowPromises = yamlFiles.map(async (file) => {
        try {
          const content = await readFile(join(dir, file), "utf-8");
          const workflow = YAML.load(content) as Workflow;
          if (!workflow.createdAt) {
            workflow.createdAt = new Date().toISOString();
          }
          if (!workflow.updatedAt) {
            workflow.updatedAt = new Date().toISOString();
          }
          return workflow;
        } catch {
          return null;
        }
      });

      const workflows = (await Promise.all(workflowPromises)).filter(
        (w): w is Workflow => w !== null
      );

      return workflows;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(loadPromises);
  const firstValid = results.find((r) => r !== null && r.length > 0);

  if (firstValid) {
    return firstValid.sort((a, b) => {
      if (a.id === DEFAULT_WORKFLOW_ID) {
        return -1;
      }
      if (b.id === DEFAULT_WORKFLOW_ID) {
        return 1;
      }
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
  }

  return [];
}

/**
 * Syncs workflows from YAML to database in background.
 * Non-blocking - meant to be called without awaiting.
 */
export function syncWorkflowsInBackground(): void {
  // Fire and forget - doesn't block the UI
  loadWorkflowsFromYaml()
    .then(async (workflows) => {
      if (workflows.length > 0) {
        try {
          const db = await getDb();
          await syncWorkflowsToDatabase(db, workflows);
        } catch (error) {
          console.error("Failed to sync workflows to database:", error);
        }
      }
    })
    .catch((error) => {
      console.error("Failed to load workflows from YAML:", error);
    });
}
