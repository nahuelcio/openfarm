// Use any type to avoid importing from bun during bundling
type SQL = any;

// Regex patterns at top level for performance
const PATH_SEPARATOR_REGEX = /[/\\]/;

import { err, ok, type Result } from "@openfarm/result";
import type { Workflow } from "../../types";
import { addWorkflow, getWorkflow, getWorkflows, updateWorkflow } from "./crud";

/**
 * File system interface for dependency injection
 */
interface FileSystem {
  existsSync(path: string): boolean;
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: "utf-8"): string;
  cwd(): string;
}

/**
 * Default file system implementation - uses lazy loading to avoid bundling fs
 */
let _defaultFs: FileSystem | null = null;

/**
 * Returns the default file system implementation
 */
function getDefaultFs(): FileSystem {
  if (!_defaultFs) {
    // Dynamic require to avoid bundling in workflow functions
    const { existsSync, readdirSync, readFileSync } = require("node:fs");
    _defaultFs = {
      existsSync,
      readdirSync,
      readFileSync,
      cwd: () => process.cwd(),
    };
  }
  return _defaultFs;
}

/**
 * Builds list of possible paths to search for workflows directory
 */
async function buildPossiblePaths(fileSystem: FileSystem): Promise<string[]> {
  const { join, resolve } = await import("node:path");
  const possiblePaths: string[] = [];

  // Add the correct path for the current project structure FIRST (highest priority)
  const cwd = fileSystem.cwd();
  possiblePaths.push(join(cwd, "../core/workflows"));
  possiblePaths.push(join(cwd, "../../packages/core/workflows"));
  possiblePaths.push(join(cwd, "../../../packages/core/workflows"));

  // Docker-specific paths
  possiblePaths.push("/app/packages/core/workflows");
  possiblePaths.push(join("/app", "packages", "core", "workflows"));

  if (typeof __dirname !== "undefined") {
    possiblePaths.push(join(__dirname, "../workflows"));
    possiblePaths.push(join(__dirname, "../../workflows"));
    possiblePaths.push(join(__dirname, "../../../workflows")); // Add this path
    possiblePaths.push(join(__dirname, "../../../packages/core/workflows"));
  }

  possiblePaths.push(join(cwd, "packages", "core", "workflows"));
  possiblePaths.push(join(cwd, "..", "packages", "core", "workflows"));
  possiblePaths.push(join(cwd, "../..", "packages", "core", "workflows"));
  possiblePaths.push(join(cwd, "../../..", "packages", "core", "workflows"));

  possiblePaths.push(
    join(cwd, "node_modules", "@minions", "core", "workflows")
  );
  possiblePaths.push(
    join(cwd, "..", "node_modules", "@minions", "core", "workflows")
  );

  // Search up directory tree
  try {
    let currentPath = cwd;
    const checkedPaths = new Set<string>();
    let previousPath = "";

    for (let i = 0; i < 10; i++) {
      const packagesCorePath = join(
        currentPath,
        "packages",
        "core",
        "workflows"
      );
      const normalizedPath = packagesCorePath.replace(/\\/g, "/");

      const hasPackageJson = fileSystem.existsSync(
        join(currentPath, "package.json")
      );
      const hasPackagesDir = fileSystem.existsSync(
        join(currentPath, "packages")
      );

      if (
        (hasPackageJson || hasPackagesDir) &&
        !checkedPaths.has(normalizedPath)
      ) {
        possiblePaths.push(packagesCorePath);
        checkedPaths.add(normalizedPath);
      }

      const parentPath = join(currentPath, "..");
      const realParentPath = resolve(parentPath);
      const realCurrentPath = resolve(currentPath);

      if (
        realParentPath === realCurrentPath ||
        previousPath === realCurrentPath
      ) {
        break;
      }

      previousPath = realCurrentPath;
      currentPath = parentPath;
    }
  } catch (searchError) {
    console.warn("[DB] Error during directory search:", searchError);
  }

  return possiblePaths;
}

/**
 * Finds workflows directory by checking possible paths
 */
function findWorkflowsDirectory(
  possiblePaths: string[],
  fileSystem: FileSystem
): string | null {
  console.log(`[DB] Current working directory: ${fileSystem.cwd()}`);
  console.log(
    `[DB] Searching for workflows directory in ${possiblePaths.length} possible locations...`
  );

  for (const testPath of possiblePaths) {
    console.log(`[DB] Checking: ${testPath}`);
    if (fileSystem.existsSync(testPath)) {
      console.log(`[DB] ✓ Found workflows directory at: ${testPath}`);
      return testPath;
    }
  }

  return null;
}

/**
 * Validates workflow data structure
 */
function validateWorkflowData(workflowData: unknown): boolean {
  if (
    !workflowData ||
    typeof workflowData !== "object" ||
    !("id" in workflowData) ||
    !("name" in workflowData)
  ) {
    return false;
  }

  const data = workflowData as {
    steps?: unknown;
    abstract?: boolean;
    extends?: string;
  };

  // Abstract workflows or workflows with extends may not have steps yet
  if (data.abstract || data.extends) {
    return true;
  }

  // Non-abstract workflows must have steps
  if (!("steps" in data)) {
    return false;
  }

  const steps = data.steps;
  return Array.isArray(steps) && steps.length > 0;
}

/**
 * Loads workflow from JSON or YAML file
 */
async function loadWorkflowFromFile(
  filePath: string,
  fileSystem: FileSystem,
  now: string
): Promise<Workflow | null> {
  try {
    const fileContent = fileSystem.readFileSync(filePath, "utf-8");
    const fileName = filePath.split(PATH_SEPARATOR_REGEX).pop() || filePath;
    let workflow: Workflow | null = null;

    // Try YAML first
    if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
      try {
        const { convertYAMLToWorkflow } = await import(
          "@openfarm/core/workflow-dsl"
        );
        workflow = await convertYAMLToWorkflow(fileContent);
      } catch (yamlError) {
        console.error(
          `[DB] ✗ Failed to parse YAML workflow file ${fileName}:`,
          yamlError
        );
        return null;
      }
    } else {
      // Try JSON
      try {
        const workflowData = JSON.parse(fileContent);

        if (!validateWorkflowData(workflowData)) {
          console.warn(
            `[DB] Skipping invalid workflow file ${fileName}: missing required fields or invalid steps`
          );
          return null;
        }

        // Convert JSON workflow to Workflow format
        const { convertJSONToWorkflow } = await import(
          "@openfarm/core/workflow-dsl"
        );
        workflow = convertJSONToWorkflow(workflowData);
      } catch (jsonError) {
        console.error(
          `[DB] ✗ Failed to parse JSON workflow file ${fileName}:`,
          jsonError
        );
        return null;
      }
    }

    if (!workflow) {
      return null;
    }

    // Ensure timestamps are set
    if (!workflow.createdAt) {
      workflow.createdAt = now;
    }
    if (!workflow.updatedAt) {
      workflow.updatedAt = now;
    }

    return workflow;
  } catch (parseError) {
    const fileName = filePath.split(PATH_SEPARATOR_REGEX).pop() || filePath;
    console.error(
      `[DB] ✗ Failed to load workflow file ${fileName}:`,
      parseError
    );
    return null;
  }
}

/**
 * Saves workflows to database (add or update)
 */
async function saveWorkflowsToDatabase(
  db: SQL,
  workflows: Workflow[]
): Promise<void> {
  for (const workflow of workflows) {
    const existing = await getWorkflow(db, workflow.id);
    if (existing) {
      await updateWorkflow(db, workflow.id, () => workflow);
      console.log(`[DB] Updated workflow: ${workflow.id} from JSON file`);
    } else {
      await addWorkflow(db, workflow);
      console.log(`[DB] Added workflow: ${workflow.id}`);
    }
  }
}

/**
 * Initializes predefined workflows from JSON files in the workflows directory.
 * This function searches for workflow JSON files and loads them into the database.
 *
 * @param db - The SQL database instance
 * @param fileSystem - Optional file system interface (for testing)
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await initializePredefinedWorkflows(db);
 * if (result.ok) {
 *   console.log('Workflows initialized successfully');
 * }
 * ```
 */
export async function initializePredefinedWorkflows(
  db: SQL,
  fileSystem: FileSystem = getDefaultFs()
): Promise<Result<void>> {
  try {
    const { join } = await import("node:path");
    const now = new Date().toISOString();

    const possiblePaths = await buildPossiblePaths(fileSystem);
    const workflowsDir = findWorkflowsDirectory(possiblePaths, fileSystem);

    if (!workflowsDir) {
      const errorMsg = `Workflows directory not found. Tried paths:\n${possiblePaths.map((p) => `  - ${p}`).join("\n")}\nCurrent working directory: ${fileSystem.cwd()}\n\nPlease ensure the workflows JSON files exist in packages/core/workflows/`;
      console.error(`[DB] ${errorMsg}`);
      return err(
        new Error(
          `Workflows directory not found. Checked ${possiblePaths.length} locations. Current working directory: ${fileSystem.cwd()}`
        )
      );
    }

    const workflowFiles = fileSystem
      .readdirSync(workflowsDir)
      .filter(
        (file: string) =>
          file.endsWith(".json") ||
          file.endsWith(".yaml") ||
          file.endsWith(".yml")
      )
      .map((file: string) => join(workflowsDir, file));

    if (workflowFiles.length === 0) {
      console.warn(
        "[DB] No workflow files (JSON/YAML) found in workflows directory"
      );
      return err(new Error(`No workflow files found in ${workflowsDir}`));
    }

    console.log(
      `[DB] Found ${workflowFiles.length} workflow file(s) (JSON/YAML)`
    );

    // First pass: Load all workflows (including those with extends)
    const workflowsToAdd: Workflow[] = [];
    const failedFiles: string[] = [];
    for (const filePath of workflowFiles) {
      const workflow = await loadWorkflowFromFile(filePath, fileSystem, now);
      if (workflow) {
        workflowsToAdd.push(workflow);
        const fileName = filePath.split(PATH_SEPARATOR_REGEX).pop() || filePath;
        console.log(`[DB] ✓ Loaded workflow: ${workflow.id} from ${fileName}`);
      } else {
        const fileName = filePath.split(PATH_SEPARATOR_REGEX).pop() || filePath;
        failedFiles.push(fileName);
        console.warn(`[DB] ✗ Failed to load workflow from ${fileName}`);
      }
    }

    if (failedFiles.length > 0) {
      console.warn(
        `[DB] Failed to load ${failedFiles.length} workflow file(s): ${failedFiles.join(", ")}`
      );
    }

    if (workflowsToAdd.length === 0) {
      console.warn("[DB] No valid workflows loaded from JSON files");
      return err(
        new Error(`No valid workflows could be loaded from ${workflowsDir}`)
      );
    }

    // Second pass: Resolve inheritance for workflows that extend others
    const { resolveWorkflowInheritance } = await import(
      "@openfarm/core/workflow-dsl"
    );
    const resolvedWorkflows: Workflow[] = [];

    for (const workflow of workflowsToAdd) {
      if (workflow.extends) {
        try {
          // Resolve inheritance using all loaded workflows as context
          const resolved = await resolveWorkflowInheritance(
            workflow,
            {
              workItem: undefined,
              stepResults: [],
              execution: undefined,
              variables: {},
            },
            {
              db,
              allWorkflows: workflowsToAdd,
              workflowFilesPath: workflowsDir,
            }
          );
          resolvedWorkflows.push(resolved);
          console.log(
            `[DB] ✓ Resolved inheritance for workflow: ${workflow.id} (extends: ${workflow.extends})`
          );
        } catch (error) {
          console.error(
            `[DB] ✗ Failed to resolve inheritance for workflow ${workflow.id}:`,
            error
          );
          // Still add the workflow without resolving (will fail at runtime if executed)
          resolvedWorkflows.push(workflow);
        }
      } else {
        // No inheritance, add as-is
        resolvedWorkflows.push(workflow);
      }
    }

    console.log(
      `[DB] Preparing to add/update ${resolvedWorkflows.length} workflow(s) (${workflowsToAdd.filter((w) => w.extends).length} with inheritance resolved)`
    );

    await saveWorkflowsToDatabase(db, resolvedWorkflows);

    const verifyWorkflows = await getWorkflows(db);
    const predefinedIds = resolvedWorkflows.map((w) => w.id);
    const addedCount = verifyWorkflows.filter((w) =>
      predefinedIds.includes(w.id)
    ).length;

    console.log(
      `[DB] Verification: Total workflows: ${verifyWorkflows.length}, Predefined workflows: ${addedCount}`
    );

    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error initializing predefined workflows:", error);
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
