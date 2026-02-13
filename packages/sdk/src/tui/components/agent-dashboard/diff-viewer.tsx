import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useState } from "react";

export interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "context" | "add" | "delete";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewerProps {
  files: DiffFile[];
  onClose?: () => void;
  onFileSelect?: (index: number) => void;
}

export function DiffViewer({ files, onClose, onFileSelect }: DiffViewerProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  useInput((input, key) => {
    if (key.return) {
      onFileSelect?.(selectedFileIndex);
    } else if (input === "j" || key.downArrow) {
      setSelectedFileIndex((i) => Math.min(i + 1, files.length - 1));
    } else if (input === "k" || key.upArrow) {
      setSelectedFileIndex((i) => Math.max(i - 1, 0));
    } else if (input === "t") {
      setViewMode((v) => (v === "unified" ? "split" : "unified"));
    } else if (input === "q" || key.escape) {
      onClose?.();
    }
  });

  if (files.length === 0) {
    return (
      <Box alignItems="center" flex={1} justifyContent="center">
        <Text color="gray">No changes to display</Text>
      </Box>
    );
  }

  const selectedFile = files[selectedFileIndex];

  return (
    <Box flexDirection="column" height="100%">
      <Box
        borderBottom="single"
        borderColor="cyan"
        borderStyle="bold"
        flexDirection="row"
        justifyContent="space-between"
        paddingX={2}
        paddingY={1}
      >
        <Text bold>📄 Diff Viewer</Text>
        <Text>
          [{viewMode === "unified" ? "U" : "S"}] Unified/Split | [j/k] Navigate
          | [q] Quit
        </Text>
      </Box>

      <Box flex={1} flexDirection="row" overflow="hidden">
        <Box
          borderColor="gray"
          borderRight="single"
          borderStyle="bold"
          overflow="visible"
          width={30}
        >
          <Box paddingX={1} paddingY={0}>
            <Text bold underline>
              Files ({files.length})
            </Text>
          </Box>
          {files.map((file, index) => (
            <Box
              backgroundColor={index === selectedFileIndex ? "cyan" : undefined}
              key={file.path}
              paddingX={1}
              paddingY={0}
            >
              <Text
                bold={index === selectedFileIndex}
                color={index === selectedFileIndex ? "black" : undefined}
              >
                {index === selectedFileIndex ? "▶ " : "  "}
                {file.path.split("/").pop()}
              </Text>
            </Box>
          ))}
        </Box>

        <Box flex={1} flexDirection="column" overflow="visible">
          <Box
            borderBottom="single"
            borderStyle="bold"
            paddingX={1}
            paddingY={0}
          >
            <Text bold>{selectedFile.path}</Text>
            <Text color="gray" dim>
              {" "}
              +{selectedFile.additions} -{selectedFile.deletions}
            </Text>
          </Box>

          <Box flexDirection="column" padding={1}>
            {viewMode === "unified"
              ? selectedFile.hunks.map((hunk, hunkIndex) => (
                  <UnifiedHunk hunk={hunk} key={hunkIndex} />
                ))
              : selectedFile.hunks.map((hunk, hunkIndex) => (
                  <SplitHunk hunk={hunk} key={hunkIndex} />
                ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function UnifiedHunk({ hunk }: { hunk: DiffHunk }) {
  return (
    <Box flexDirection="column">
      <Text color="gray" dim>
        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
      </Text>
      {hunk.lines.map((line, index) => (
        <Box flexDirection="row" key={index}>
          <Text color="gray" dim width={6}>
            {line.oldLineNumber || ""}
          </Text>
          <Text color="gray" dim width={6}>
            {line.newLineNumber || ""}
          </Text>
          <Text
            color={
              line.type === "add"
                ? "green"
                : line.type === "delete"
                  ? "red"
                  : "white"
            }
          >
            {line.type === "add" ? "+" : line.type === "delete" ? "-" : " "}{" "}
            {line.content}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function SplitHunk({ hunk }: { hunk: DiffHunk }) {
  const leftLines = hunk.lines.filter(
    (l) => l.type === "delete" || l.type === "context"
  );
  const rightLines = hunk.lines.filter(
    (l) => l.type === "add" || l.type === "context"
  );

  return (
    <Box flexDirection="column">
      <Text color="gray" dim>
        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
      </Text>
      <Box flexDirection="row">
        <Box
          borderColor="red"
          borderStyle="single"
          flex={1}
          flexDirection="column"
        >
          {leftLines.map((line, index) => (
            <Box flexDirection="row" key={index}>
              <Text color="gray" dim width={4}>
                {line.oldLineNumber || ""}
              </Text>
              <Text color={line.type === "delete" ? "red" : "white"}>
                {line.type === "delete" ? "-" : " "}
                {line.content}
              </Text>
            </Box>
          ))}
        </Box>
        <Box
          borderColor="green"
          borderStyle="single"
          flex={1}
          flexDirection="column"
        >
          {rightLines.map((line, index) => (
            <Box flexDirection="row" key={index}>
              <Text color="gray" dim width={4}>
                {line.newLineNumber || ""}
              </Text>
              <Text color={line.type === "add" ? "green" : "white"}>
                {line.type === "add" ? "+" : " "}
                {line.content}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export function parseGitDiff(diffOutput: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffOutput.split("\n");

  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (currentFile) files.push(currentFile);
      currentFile = {
        path: line.replace("diff --git a/", "").replace(" b/", ""),
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      currentHunk = null;
    } else if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (match) {
        oldLineNum = Number.parseInt(match[1], 10);
        newLineNum = Number.parseInt(match[3], 10);
        currentHunk = {
          oldStart: oldLineNum,
          oldLines: Number.parseInt(match[2] || "1", 10),
          newStart: newLineNum,
          newLines: Number.parseInt(match[4] || "1", 10),
          lines: [],
        };
        currentFile?.hunks.push(currentHunk);
      }
    } else if (currentHunk) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentHunk.lines.push({
          type: "add",
          content: line.slice(1),
          newLineNumber: newLineNum++,
        });
        currentFile!.additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        currentHunk.lines.push({
          type: "delete",
          content: line.slice(1),
          oldLineNumber: oldLineNum++,
        });
        currentFile!.deletions++;
      } else if (!line.startsWith("\\")) {
        currentHunk.lines.push({
          type: "context",
          content: line.startsWith(" ") ? line.slice(1) : line,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        });
      }
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
}
