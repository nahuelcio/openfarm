import { readdir, readFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Workflow } from "@openfarm/core";
import { addWorkflow, getDb, getWorkflows } from "@openfarm/core/db";
import { Box, Text, useInput } from "ink";
import YAML from "js-yaml";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store";

async function loadWorkflowsFromYaml(): Promise<Workflow[]> {
  const possiblePaths = [
    resolve(process.cwd(), "packages/core/workflows"),
    resolve(process.cwd(), "../core/workflows"),
    resolve(process.cwd(), "../../core/workflows"),
    resolve(__dirname, "../../../../../core/workflows"),
    "/Users/nahuelcioffi/Proyectos/openfarm/packages/core/workflows",
  ];

  for (const dir of possiblePaths) {
    try {
      const files = await readdir(dir);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml")
      );

      if (yamlFiles.length === 0) {
        continue;
      }

      const workflows: Workflow[] = [];
      for (const file of yamlFiles) {
        try {
          const content = await readFile(join(dir, file), "utf-8");
          const workflow = YAML.load(content) as Workflow;
          if (!workflow.createdAt) {
            workflow.createdAt = new Date().toISOString();
          }
          if (!workflow.updatedAt) {
            workflow.updatedAt = new Date().toISOString();
          }
          workflows.push(workflow);
        } catch {
          // Skip invalid files
        }
      }

      return workflows;
    } catch {
      // Try next path
    }
  }

  return [];
}

async function resetDatabase(): Promise<boolean> {
  try {
    const dbPath = process.env.DB_PATH || "db.db";
    try {
      await unlink(dbPath);
    } catch {
      // File might not exist
    }
    return true;
  } catch {
    return false;
  }
}

export function WorkflowList() {
  const { setScreen, setCurrentWorkflow, workflows, setWorkflows } = useStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadWorkflows = useCallback(
    async (attempt = 0) => {
      try {
        setLoading(true);
        setError(null);

        const db = await getDb();
        const data = await getWorkflows(db);

        setWorkflows(
          data.sort((a: Workflow, b: Workflow) => a.id.localeCompare(b.id))
        );
        setLoading(false);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);

        if (attempt === 0 && errorMsg.includes("I/O error")) {
          setMessage("DB error, resetting...");
          const reset = await resetDatabase();
          if (reset) {
            process.env.DB_PATH = process.env.DB_PATH || "db.db";
            return loadWorkflows(attempt + 1);
          }
        }

        setError(errorMsg);
        setLoading(false);
      }
    },
    [setWorkflows]
  );

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useInput((input, key) => {
    if (key.escape) {
      setScreen("dashboard");
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(workflows.length - 1, i + 1));
    } else if (key.return) {
      const selected = workflows[selectedIndex];
      if (selected) {
        setCurrentWorkflow(selected);
        setScreen("workflow-editor");
      } else {
        setMessage("No workflow selected");
        setTimeout(() => setMessage(null), 2000);
      }
    }

    if (input === "r" || input === "R") {
      loadWorkflows();
    }

    if (input === "i" || input === "I") {
      const importWorkflows = async () => {
        try {
          setMessage("Loading from YAML...");
          const yamlWorkflows = await loadWorkflowsFromYaml();

          if (yamlWorkflows.length === 0) {
            setMessage("No YAML workflows found!");
            setTimeout(() => setMessage(null), 3000);
            return;
          }

          setMessage(`Found ${yamlWorkflows.length} workflows, saving...`);
          const db = await getDb();

          let saved = 0;
          for (const workflow of yamlWorkflows) {
            const result = await addWorkflow(db, workflow);
            if (result.ok) {
              saved++;
            }
          }

          setMessage(`Imported ${saved} workflows!`);
          await loadWorkflows();
          setTimeout(() => setMessage(null), 2000);
        } catch (e) {
          setMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
          setTimeout(() => setMessage(null), 3000);
        }
      };
      importWorkflows();
    }

    if (input === "x" || input === "X") {
      const doReset = async () => {
        setMessage("Resetting DB...");
        await resetDatabase();
        setMessage("DB reset! Reloading...");
        await loadWorkflows();
        setTimeout(() => setMessage(null), 2000);
      };
      doReset();
    }
  });

  // Validar índice
  const safeIndex = selectedIndex >= workflows.length ? 0 : selectedIndex;

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="cyan">
          Workflows
        </Text>
        <Box flexDirection="row" gap={2}>
          {message && <Text color="yellow">{message}</Text>}
          <Text color="gray">{workflows.length} found</Text>
        </Box>
      </Box>
      <Text color="gray">{"─".repeat(60)}</Text>

      {loading ? (
        <Text color="yellow">Loading workflows...</Text>
      ) : error ? (
        <Box flexDirection="column" gap={1}>
          <Text color="red">Error: {error}</Text>
          <Text color="gray">Press R to retry or X to reset DB</Text>
        </Box>
      ) : workflows.length === 0 ? (
        <Box flexDirection="column" gap={1}>
          <Text color="yellow">No workflows found in database</Text>
          <Text color="gray" dimColor>
            Press I to import from YAML
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={0}>
          {workflows.map((workflow, index) => (
            <Box
              borderColor={index === safeIndex ? "cyan" : undefined}
              borderStyle={index === safeIndex ? "single" : undefined}
              flexDirection="row"
              gap={1}
              key={workflow.id}
              padding={1}
            >
              <Text color={index === safeIndex ? "yellow" : "gray"}>
                {index === safeIndex ? ">" : " "}
              </Text>
              <Box flexDirection="column" gap={0}>
                <Text
                  bold={index === safeIndex}
                  color={index === safeIndex ? "white" : "gray"}
                >
                  {workflow.name || workflow.id}
                </Text>
                {workflow.description && (
                  <Text color="gray" dimColor>
                    {workflow.description.length > 50
                      ? `${workflow.description.slice(0, 50)}...`
                      : workflow.description}
                  </Text>
                )}
                <Text color="gray" dimColor>
                  ID: {workflow.id} • {workflow.steps?.length || 0} steps
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Text color="gray">{"─".repeat(60)}</Text>
      <Text color="gray">
        Navigate: Up/Down • Edit: Enter • Reload: R • Import: I • Reset: X •
        Back: Esc
      </Text>
    </Box>
  );
}
