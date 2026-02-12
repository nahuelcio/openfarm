/**
 * FileExplorer Screen
 *
 * Standalone file explorer with preview.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useState, useEffect } from "react";
import { FileTree, FilePreview } from "../components/files";
import { KeyHelpBar } from "../components";
import { OverlayContainer } from "../components/task-loop/overlay-container";
import { useNavigationKeys } from "../hooks";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";

export function FileExplorer() {
  const { setScreen } = useStore();
  const colors = useThemeColors();
  const [helpVisible, setHelpVisible] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [isFilterMode, setIsFilterMode] = useState(false);

  const rootPath = process.cwd();

  // Use standardized navigation keys
  const { showingHelp } = useNavigationKeys({
    screen: "file-explorer",
    parentScreen: "dashboard",
    enableHelp: true,
    onNavigate: setScreen,
    onToggleHelp: setHelpVisible,
  });

  // Filter mode
  useInput((input, key) => {
    if (showingHelp || helpVisible) return;

    if (isFilterMode) {
      if (key.escape) {
        setIsFilterMode(false);
        setFilter("");
      } else if (key.backspace) {
        setFilter((prev) => prev.slice(0, -1));
      } else if (key.return) {
        setIsFilterMode(false);
      } else if (input && !key.ctrl && !key.meta) {
        setFilter((prev) => prev + input);
      }
      return;
    }

    if (input === "/") {
      setIsFilterMode(true);
    }
  });

  // Help content
  const helpContent = (
    <>
      <Box flexDirection="column">
        <Text bold>Navigation</Text>
        <Text> ↑↓ - Navigate files</Text>
        <Text> Enter - Select / Expand</Text>
        <Text> Space - Toggle directory</Text>
        <Text> / - Filter mode</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Actions</Text>
        <Text> e - Edit file</Text>
        <Text> y - Yank (copy) path</Text>
        <Text> Esc - Back</Text>
      </Box>
    </>
  );

  if (showingHelp || helpVisible) {
    return (
      <Box flexDirection="column" height={24}>
        <Text bold color={colors.primary}>
          🗂️ File Explorer Help
        </Text>
        <Text color={colors.border}>{"─".repeat(60)}</Text>
        <OverlayContainer title="File Explorer">{helpContent}</OverlayContainer>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={24}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={colors.primary}>
          🗂️ File Explorer
        </Text>
        <Text color={colors.muted}>{rootPath}</Text>
      </Box>

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Filter bar */}
      {isFilterMode && (
        <Box flexDirection="row" gap={1} paddingY={1}>
          <Text color={colors.primary}>Filter:</Text>
          <Text color={colors.foreground}>{filter}</Text>
          <Text color={colors.muted} dimColor>
            _
          </Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1} gap={1}>
        {/* File tree */}
        <Box
          borderColor={colors.border}
          borderStyle="single"
          flexDirection="column"
          padding={1}
          width="50%"
        >
          <FileTree
            filter={filter}
            onFileSelect={(path) => setSelectedPath(path)}
            rootPath={rootPath}
            selectedPath={selectedPath}
          />
        </Box>

        {/* Preview */}
        <Box
          borderColor={colors.border}
          borderStyle="single"
          flexDirection="column"
          padding={1}
          width="50%"
        >
          {selectedPath ? (
            <FilePreview maxHeight={16} path={selectedPath} />
          ) : (
            <Text color={colors.muted} dimColor>
              Select a file to preview
            </Text>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <KeyHelpBar
        hints={[
          { key: "/", label: "Filter" },
          { key: "↑↓", label: "Navigate" },
          { key: "Enter", label: "Select" },
          { key: "?", label: "Help" },
          { key: "Esc", label: "Back" },
        ]}
      />
    </Box>
  );
}
