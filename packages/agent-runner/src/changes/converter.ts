/**
 * Converts SEARCH/REPLACE blocks to a standard unified diff format.
 */
export function convertSearchReplaceToDiff(output: string): string {
  if (!output) {
    return "";
  }

  // If it already looks like a standard diff, return it
  if (
    output.includes("diff --git") ||
    (output.includes("--- ") && output.includes("+++ "))
  ) {
    return output;
  }

  const lines = output.split("\n");
  let diff = "";
  let currentFile = "";
  let inSearch = false;
  let inReplace = false;
  let searchLines: string[] = [];
  let replaceLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect filename (often printed before the block)
    // Match common file patterns: path/to/file.extension
    if (!(inSearch || inReplace)) {
      const fileMatch = trimmed.match(
        /^[\w\-./]+\.(ts|tsx|js|jsx|cs|md|json|yaml|yml|py|java|go|rs|php|cpp|c|sql|sh|bash)$/i
      );
      if (fileMatch?.[0]) {
        currentFile = fileMatch[0];
      }
    }

    if (trimmed === "<<<<<<< SEARCH") {
      inSearch = true;
      searchLines = []; // Reset for new search block
      continue;
    }

    if (trimmed === "=======") {
      inSearch = false;
      inReplace = true;
      replaceLines = []; // Reset for new replace block
      continue;
    }

    if (trimmed === ">>>>>>> REPLACE") {
      inReplace = false;
      if (currentFile) {
        // Output proper git diff format (immutable string building)
        const fileDiff = [
          `diff --git a/${currentFile} b/${currentFile}`,
          `--- a/${currentFile}`,
          `+++ b/${currentFile}`,
          "@@ -0,0 +0,0 @@",
          ...searchLines.map((s) => `-${s}`),
          ...replaceLines.map((r) => `+${r}`),
          "",
        ].join("\n");
        diff += fileDiff;
      }
      currentFile = "";
      continue;
    }

    // Build arrays immutably by creating new arrays
    if (inSearch) {
      searchLines = [...searchLines, line];
    } else if (inReplace) {
      replaceLines = [...replaceLines, line];
    }
  }

  return diff || output;
}
