import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Exports context to AGENTS.md in the workspace
 */
export async function exportContextToFile(
  workspace: string,
  content: string,
  filename = "AGENTS.md"
): Promise<boolean> {
  try {
    const filePath = join(workspace, filename);
    await writeFile(filePath, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}
