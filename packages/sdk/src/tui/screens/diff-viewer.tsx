import { DiffProcessor, type DiffFile } from "@openfarm/git-diff";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { useStore } from "../store";

export function DiffViewer() {
  const {
    setScreen,
    selectedExecutionForDiff,
    selectedDiffFileIndex,
    setSelectedDiffFileIndex,
  } = useStore();

  const [mode, setMode] = useState<"list" | "file">("list");
  const [files, setFiles] = useState<DiffFile[]>([]);

  useEffect(() => {
    if (selectedExecutionForDiff?.diff) {
      const processor = new DiffProcessor();
      const parsed = processor.parseDiff(selectedExecutionForDiff.diff);
      setFiles(parsed.files || []);
    }
  }, [selectedExecutionForDiff]);

  useInput((input, key) => {
    if (key.escape) {
      if (mode === "file") {
        setMode("list");
      } else {
        setScreen("history");
      }
    }

    if (mode === "list") {
      if (key.upArrow) {
        setSelectedDiffFileIndex(Math.max(0, selectedDiffFileIndex - 1));
      } else if (key.downArrow) {
        setSelectedDiffFileIndex(
          Math.min(files.length - 1, selectedDiffFileIndex + 1)
        );
      } else if (key.return && files.length > 0) {
        setMode("file");
      }
    } else {
      // File mode: arrow keys to navigate between files
      if (key.leftArrow && selectedDiffFileIndex > 0) {
        setSelectedDiffFileIndex(selectedDiffFileIndex - 1);
      } else if (key.rightArrow && selectedDiffFileIndex < files.length - 1) {
        setSelectedDiffFileIndex(selectedDiffFileIndex + 1);
      }
    }
  });

  if (!selectedExecutionForDiff) {
    return (
      <Box flexDirection="column">
        <Text color="red">No execution selected</Text>
      </Box>
    );
  }

  if (!selectedExecutionForDiff.diff || files.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">
          No changes found
        </Text>
        <Text color="gray" marginTop={1}>
          This execution did not produce any file changes.
        </Text>
        <Text color="gray" marginTop={1}>
          Press Esc to go back
        </Text>
      </Box>
    );
  }

  if (mode === "list") {
    return <FileList files={files} selectedIndex={selectedDiffFileIndex} />;
  } else {
    return <FileDiff file={files[selectedDiffFileIndex]} />;
  }
}

interface FileListProps {
  files: DiffFile[];
  selectedIndex: number;
}

function FileList({ files, selectedIndex }: FileListProps) {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Changed Files ({files.length})
      </Text>
      <Text color="gray">Use ↑/↓ to navigate, Enter to view, Esc to go back</Text>
      <Text color="gray">{"─".repeat(60)}</Text>

      {files.map((file, i) => (
        <Box key={i} flexDirection="row" gap={1}>
          <Text color={i === selectedIndex ? "yellow" : "gray"}>
            {i === selectedIndex ? "▶" : " "}
          </Text>
          <Text color={getChangeTypeColor(file.changeType)}>
            {getChangeTypeIcon(file.changeType)}
          </Text>
          <Box flexGrow={1}>
            <Text color={i === selectedIndex ? "white" : "gray"}>{file.path}</Text>
          </Box>
          <Text color="green">+{file.additions}</Text>
          <Text color="red">-{file.deletions}</Text>
        </Box>
      ))}
    </Box>
  );
}

interface FileDiffProps {
  file: DiffFile;
}

function FileDiff({ file }: FileDiffProps) {
  // Limit to 50 lines for display
  const displayLines = file.lines.slice(0, 50);
  const hasMore = file.lines.length > 50;

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" padding={1}>
        <Box flexDirection="column">
          <Box flexDirection="row" gap={2}>
            <Text bold color="cyan">
              {file.path}
            </Text>
            <Text color={getChangeTypeColor(file.changeType)}>
              ({file.changeType})
            </Text>
          </Box>
          <Text color="gray">
            {file.additions} additions, {file.deletions} deletions
          </Text>
        </Box>
      </Box>

      <Text color="gray" marginTop={1}>
        Use ←/→ to navigate files, Esc to go back to list
      </Text>
      <Text color="gray">{"─".repeat(60)}</Text>

      <Box flexDirection="column" marginTop={1}>
        {displayLines.map((line, i) => (
          <DiffLine key={i} line={line} />
        ))}
        {hasMore && (
          <Text color="gray" marginTop={1}>
            ... {file.lines.length - 50} more lines (showing first 50)
          </Text>
        )}
      </Box>
    </Box>
  );
}

interface DiffLineProps {
  line: {
    type: "added" | "removed" | "context" | "info";
    content: string;
  };
}

function DiffLine({ line }: DiffLineProps) {
  const color =
    line.type === "added"
      ? "green"
      : line.type === "removed"
        ? "red"
        : line.type === "info"
          ? "cyan"
          : "gray";

  const prefix =
    line.type === "added"
      ? "+"
      : line.type === "removed"
        ? "-"
        : line.type === "info"
          ? "@"
          : " ";

  return (
    <Text color={color}>
      {prefix} {line.content}
    </Text>
  );
}

function getChangeTypeColor(changeType: string): "green" | "yellow" | "red" | "gray" {
  switch (changeType) {
    case "created":
      return "green";
    case "modified":
      return "yellow";
    case "deleted":
      return "red";
    default:
      return "gray";
  }
}

function getChangeTypeIcon(changeType: string): string {
  switch (changeType) {
    case "created":
      return "+";
    case "modified":
      return "~";
    case "deleted":
      return "-";
    default:
      return "?";
  }
}
