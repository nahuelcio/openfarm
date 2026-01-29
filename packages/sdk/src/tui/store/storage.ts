import type { Execution } from "./index";

const STORAGE_KEY = "openfarm_executions_v1";

// Check if we're in a Node.js environment with fs access
function hasFs(): boolean {
  try {
    return typeof process !== "undefined" && process.versions?.node !== undefined;
  } catch {
    return false;
  }
}

// Node.js implementation using fs
async function saveToFile(data: string): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const os = await import("os");

  const configDir = path.join(os.homedir(), ".openfarm");
  
  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, "executions.json"), data, "utf-8");
  } catch (error) {
    console.error("Failed to save executions:", error);
  }
}

async function loadFromFile(): Promise<string | null> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");

    const filePath = path.join(os.homedir(), ".openfarm", "executions.json");
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

// Browser/localStorage implementation
function saveToLocalStorage(data: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, data);
    }
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

function loadFromLocalStorage(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
  }
  return null;
}

// Serialize execution to JSON
export function serializeExecutions(executions: Execution[]): string {
  return JSON.stringify(
    executions.map((e) => ({
      ...e,
      startedAt: e.startedAt.toISOString(),
      completedAt: e.completedAt?.toISOString(),
    })),
    null,
    2
  );
}

// Deserialize execution from JSON
export function deserializeExecutions(data: string): Execution[] {
  try {
    const parsed = JSON.parse(data);
    return parsed.map((e: any) => ({
      ...e,
      startedAt: new Date(e.startedAt),
      completedAt: e.completedAt ? new Date(e.completedAt) : undefined,
    }));
  } catch (error) {
    console.error("Failed to deserialize executions:", error);
    return [];
  }
}

// Save executions
export async function saveExecutions(executions: Execution[]): Promise<void> {
  const data = serializeExecutions(executions);

  if (hasFs()) {
    await saveToFile(data);
  } else {
    saveToLocalStorage(data);
  }
}

// Load executions
export async function loadExecutions(): Promise<Execution[]> {
  let data: string | null;

  if (hasFs()) {
    data = await loadFromFile();
  } else {
    data = loadFromLocalStorage();
  }

  if (data) {
    return deserializeExecutions(data);
  }

  return [];
}

// Clear all executions
export async function clearExecutions(): Promise<void> {
  if (hasFs()) {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");

      const filePath = path.join(os.homedir(), ".openfarm", "executions.json");
      await fs.unlink(filePath);
    } catch {
      // File might not exist, that's ok
    }
  } else {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

// Export executions to a JSON file (for sharing/backup)
export async function exportExecutionsToFile(
  executions: Execution[],
  filePath: string
): Promise<void> {
  const fs = await import("fs/promises");
  const data = serializeExecutions(executions);
  await fs.writeFile(filePath, data, "utf-8");
}

// Import executions from a JSON file
export async function importExecutionsFromFile(filePath: string): Promise<Execution[]> {
  const fs = await import("fs/promises");
  const data = await fs.readFile(filePath, "utf-8");
  return deserializeExecutions(data);
}
