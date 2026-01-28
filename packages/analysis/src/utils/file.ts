import * as fs from "node:fs";
import * as path from "node:path";

export async function getFiles(
  projectPath: string,
  extensions: string[] = [".ts", ".tsx", ".js", ".jsx"]
): Promise<string[]> {
  const files: string[] = [];

  async function scanDirectory(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, dist, build, node_modules
      if (
        ["node_modules", ".git", "dist", "build", "coverage"].includes(
          entry.name
        )
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(fullPath);
        // Exclude database files
        const excludedExtensions = [".db"];
        if (excludedExtensions.includes(ext)) {
          continue;
        }
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await scanDirectory(projectPath);
  return files;
}

export async function readFile(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, "utf-8");
}

export function getLineNumber(content: string, index: number): number {
  const before = content.substring(0, index);
  return before.split("\n").length;
}

export function countLines(text: string): number {
  return text.split("\n").length;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extracts a code snippet around a specific line number
 * @param content The full file content
 * @param lineNumber The line number (1-indexed) to center the snippet around
 * @param contextLines Number of lines above and below to include (default: 3)
 * @returns A formatted code snippet with line numbers, or null if line is invalid
 */
export function getCodeSnippet(
  content: string,
  lineNumber: number,
  contextLines = 3
): string | null {
  if (!content || lineNumber < 1) {
    return null;
  }

  const lines = content.split("\n");
  const totalLines = lines.length;

  // Validate line number
  if (lineNumber > totalLines) {
    return null;
  }

  // Calculate start and end lines (0-indexed)
  const targetLineIndex = lineNumber - 1; // Convert to 0-indexed
  const startLine = Math.max(0, targetLineIndex - contextLines);
  const endLine = Math.min(totalLines - 1, targetLineIndex + contextLines);

  // Extract the snippet
  const snippetLines = lines.slice(startLine, endLine + 1);

  // Format with line numbers
  const formattedLines = snippetLines.map((line, index) => {
    const actualLineNumber = startLine + index + 1; // 1-indexed
    const isTargetLine = actualLineNumber === lineNumber;
    const lineNumberStr = actualLineNumber.toString().padStart(4, " ");
    const marker = isTargetLine ? " >" : "  ";
    return `${lineNumberStr}${marker} ${line}`;
  });

  return formattedLines.join("\n");
}

export function shouldSkipFile(filePath: string): boolean {
  const skipPatterns = [
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".min.js",
    ".min.css",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
  ];

  // Exclude markdown, text files, and database files
  const excludedExtensions = [".md", ".txt", ".db"];
  const ext = path.extname(filePath).toLowerCase();
  if (excludedExtensions.includes(ext)) {
    return true;
  }

  return skipPatterns.some((pattern) => filePath.includes(pattern));
}
