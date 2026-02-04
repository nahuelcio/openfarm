/**
 * Rich Log View
 *
 * Componente de logs enriquecido con:
 * - Filtros por nivel (debug, info, warn, error)
 * - Búsqueda en tiempo real
 * - Colores por componente/nivel
 * - Follow tail (autoscroll)
 * - Export a archivo
 */

import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useRef, useState } from "react";
import {
  useLogStore,
  type LogLevel,
  getLevelIcon,
} from "../store/log-store";
import { useTheme } from "../store/theme-store";

interface RichLogViewProps {
  height?: number;
  showToolbar?: boolean;
  onExport?: () => void;
}

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

export function RichLogView({
  height = 20,
  showToolbar = true,
  onExport,
}: RichLogViewProps) {
  const { colors } = useTheme();
  const {
    entries,
    filter,
    config,
    toggleLevel,
    setSearchQuery,
    toggleTimestamps,
    toggleComponent,
    toggleFollowTail,
    clearEntries,
    getFilteredEntries,
    getComponents,
    exportToString,
  } = useLogStore();

  const [mode, setMode] = useState<"normal" | "search" | "filter">("normal");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef(0);

  const filteredEntries = getFilteredEntries();
  const components = getComponents();

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case "debug":
        return colors.logDebug;
      case "info":
        return colors.logInfo;
      case "warn":
        return colors.logWarn;
      case "error":
        return colors.logError;
      default:
        return colors.foreground;
    }
  };

  // Auto-scroll to bottom if followTail is enabled
  useEffect(() => {
    if (config.followTail && filteredEntries.length > 0) {
      setSelectedIndex(filteredEntries.length - 1);
    }
  }, [entries.length, config.followTail]);

  useInput((input, key) => {
    if (mode === "search") {
      if (key.escape) {
        setMode("normal");
        setSearchInput("");
        setSearchQuery("");
      } else if (key.return) {
        setMode("normal");
      } else {
        // Let TextInput handle the input
        setSearchQuery(searchInput);
      }
      return;
    }

    if (mode === "filter") {
      if (key.escape) {
        setMode("normal");
      } else if (input === "1") {
        toggleLevel("debug");
      } else if (input === "2") {
        toggleLevel("info");
      } else if (input === "3") {
        toggleLevel("warn");
      } else if (input === "4") {
        toggleLevel("error");
      }
      return;
    }

    if (showHelp) {
      if (key.escape || input === "q" || input === "?") {
        setShowHelp(false);
      }
      return;
    }

    // Normal mode
    if (input === "?") {
      setShowHelp(true);
    } else if (input === "s" || input === "S") {
      setMode("search");
    } else if (input === "f" || input === "F") {
      setMode("filter");
    } else if (input === "t" || input === "T") {
      toggleTimestamps();
    } else if (input === "c" || input === "C") {
      toggleComponent();
    } else if (input === "l" || input === "L") {
      toggleFollowTail();
    } else if (input === "x" || input === "X") {
      clearEntries();
    } else if (input === "e" || input === "E") {
      const content = exportToString();
      if (onExport) {
        onExport();
      }
      // Also copy to clipboard if available
      try {
        const { writeFileSync } = require("node:fs");
        const { tmpdir } = require("node:os");
        const { join } = require("node:path");
        const tmpFile = join(tmpdir(), `openfarm-logs-${Date.now()}.txt`);
        writeFileSync(tmpFile, content);
        // eslint-disable-next-line no-console
        console.log(`\nLogs exported to: ${tmpFile}`);
      } catch {
        // Ignore
      }
    } else if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(filteredEntries.length - 1, i + 1));
    } else if (key.pageUp) {
      setSelectedIndex((i) => Math.max(0, i - 10));
    } else if (key.pageDown) {
      setSelectedIndex((i) => Math.min(filteredEntries.length - 1, i + 10));
    } else if (key.home) {
      setSelectedIndex(0);
    } else if (key.end) {
      setSelectedIndex(filteredEntries.length - 1);
    }
  });

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Calculate visible range
  const visibleCount = Math.max(1, height - (showToolbar ? 4 : 2));
  const startIndex = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(visibleCount / 2), filteredEntries.length - visibleCount)
  );
  const visibleEntries = filteredEntries.slice(startIndex, startIndex + visibleCount);

  if (showHelp) {
    return (
      <Box flexDirection="column" borderStyle="single" padding={1}>
        <Text bold>Rich Log View - Help</Text>
        <Box flexDirection="column" marginY={1}>
          <Text color={colors.primary}>Navigation:</Text>
          <Text>  ↑/↓     - Scroll line by line</Text>
          <Text>  PgUp/PgDn - Scroll page</Text>
          <Text>  Home/End - Jump to start/end</Text>
          <Text color={colors.primary}>Actions:</Text>
          <Text>  s - Search mode</Text>
          <Text>  f - Filter by level</Text>
          <Text>  t - Toggle timestamps</Text>
          <Text>  c - Toggle component names</Text>
          <Text>  l - Toggle follow tail</Text>
          <Text>  e - Export logs to file</Text>
          <Text>  x - Clear all logs</Text>
          <Text>  ? - Toggle this help</Text>
          <Text>  q/ESC - Close help/back</Text>
        </Box>
        <Text color={colors.muted}>Press any key to close...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={height}>
      {/* Toolbar */}
      {showToolbar && (
        <Box flexDirection="column">
          {/* Top bar: Filters and status */}
          <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
            <Box flexDirection="row" gap={1}>
              <Text bold color={colors.primary}>
                Logs
              </Text>
              <Text color={colors.muted}>({filteredEntries.length}/{entries.length})</Text>
            </Box>
            <Box flexDirection="row" gap={2}>
              {/* Level filters */}
              {LEVELS.map((level) => (
                <Text
                  key={level}
                  color={filter.levels.includes(level) ? getLevelColor(level) : "gray"}
                  dimColor={!filter.levels.includes(level)}
                >
                  {filter.levels.includes(level) ? "●" : "○"} {level[0].toUpperCase()}
                </Text>
              ))}
            </Box>
          </Box>

          {/* Second bar: Search and toggles */}
          <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
            {mode === "search" ? (
              <Box flexDirection="row" gap={1}>
                <Text color={colors.warning}>🔍</Text>
                <TextInput
                  value={searchInput}
                  onChange={(value) => {
                    setSearchInput(value);
                    setSearchQuery(value);
                  }}
                  placeholder="Search..."
                />
              </Box>
            ) : (
              <Box flexDirection="row" gap={2}>
                {filter.searchQuery ? (
                  <Text color={colors.warning}>🔍 {filter.searchQuery}</Text>
                ) : (
                  <Text color={colors.muted} dimColor>
                    Press 's' to search
                  </Text>
                )}
              </Box>
            )}

            <Box flexDirection="row" gap={2}>
              <Text color={config.showTimestamps ? "white" : "gray"} dimColor={!config.showTimestamps}>
                [T]ime
              </Text>
              <Text color={config.showComponent ? "white" : "gray"} dimColor={!config.showComponent}>
                [C]omp
              </Text>
              <Text color={config.followTail ? "green" : "gray"} dimColor={!config.followTail}>
                [L]ive
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Log entries */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleEntries.length === 0 ? (
          <Box padding={1}>
            <Text color="gray" dimColor>
              {entries.length === 0
                ? "No logs yet..."
                : "No logs match current filters"}
            </Text>
          </Box>
        ) : (
          visibleEntries.map((entry, idx) => {
            const absoluteIndex = startIndex + idx;
            const isSelected = absoluteIndex === selectedIndex;
            const levelColor = config.colorize ? getLevelColor(entry.level) : "white";

            return (
              <Box key={entry.id} flexDirection="row" gap={1}>
                {/* Selection indicator */}
                <Text color={isSelected ? "yellow" : "gray"}>
                  {isSelected ? "▶" : " "}
                </Text>

                {/* Timestamp */}
                {config.showTimestamps && (
                  <Text color="gray" dimColor>
                    {formatTimestamp(entry.timestamp)}
                  </Text>
                )}

                {/* Level icon */}
                <Text color={levelColor}>{getLevelIcon(entry.level)}</Text>

                {/* Component */}
                {config.showComponent && (
                  <Text color={colors.secondary} dimColor>
                    [{entry.component.slice(0, 12).padEnd(12)}]
                  </Text>
                )}

                {/* Message */}
                <Text
                  color={isSelected ? "white" : levelColor}
                  bold={isSelected}
                  wrap="truncate-end"
                >
                  {entry.message}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      {showToolbar && (
        <Box flexDirection="row" justifyContent="space-between" paddingX={1} borderStyle="single">
          <Text color={colors.muted} dimColor>
            [?]help [s]earch [f]ilter [t]ime [c]omp [l]ive [e]xport [x]clear
          </Text>
          {mode !== "normal" && (
            <Text color={colors.warning} bold>
              {mode.toUpperCase()} MODE - ESC to exit
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
