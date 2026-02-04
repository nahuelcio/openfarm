/**
 * Theme Selector Screen
 *
 * Allows users to switch between available themes.
 */

import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { useStore } from "../store";
import {
  useTheme,
  useThemeActions,
  useAvailableThemes,
  useCurrentThemeId,
} from "../theme";
import { ThemedText } from "../components/themed-text";

export function ThemeSelector() {
  const { setScreen } = useStore();
  const theme = useTheme();
  const currentThemeId = useCurrentThemeId();
  const availableThemes = useAvailableThemes();
  const { setTheme } = useThemeActions();

  const themeList = Object.values(availableThemes);
  const [selectedIndex, setSelectedIndex] = useState(
    themeList.findIndex((t) => t.id === currentThemeId)
  );

  useInput((input, key) => {
    if (key.escape) {
      setScreen("dashboard");
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(themeList.length - 1, i + 1));
    } else if (key.return) {
      const selectedTheme = themeList[selectedIndex];
      if (selectedTheme) {
        setTheme(selectedTheme.id);
        setScreen("dashboard");
      }
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <ThemedText styleType="header">🎨 Theme Selector</ThemedText>
      <ThemedText styleType="border">{"─".repeat(60)}</ThemedText>

      {/* Current theme info */}
      <Box flexDirection="row" gap={1}>
        <ThemedText styleType="label">Current Theme:</ThemedText>
        <ThemedText styleType="value">{theme.name}</ThemedText>
      </Box>

      <ThemedText styleType="border">{"─".repeat(60)}</ThemedText>

      {/* Theme list */}
      <Text color="gray" dimColor>
        Select a theme:
      </Text>

      <Box flexDirection="column" gap={0} paddingLeft={2}>
        {themeList.map((t, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = t.id === currentThemeId;

          return (
            <Box flexDirection="row" gap={1} key={t.id}>
              <Text color={isSelected ? "yellow" : "gray"}>
                {isSelected ? "▶" : " "}
              </Text>
              <Text
                bold={isSelected}
                color={isSelected ? "white" : "gray"}
              >
                {t.name}
              </Text>
              {isCurrent && (
                <Text color="green" bold>
                  (current)
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      <ThemedText styleType="border">{"─".repeat(60)}</ThemedText>

      {/* Preview of selected theme */}
      <Text color="gray" dimColor>
        Preview:
      </Text>

      <Box flexDirection="column" gap={0} paddingLeft={2}>
        {(() => {
          const previewTheme = themeList[selectedIndex];
          if (!previewTheme) return null;

          return (
            <>
              <Text color={previewTheme.styles.header.color} bold>
                Header Text
              </Text>
              <Text color={previewTheme.styles.taskRunning.color} bold>
                Running Task
              </Text>
              <Text color={previewTheme.styles.taskCompleted.color}>
                Completed Task
              </Text>
              <Text color={previewTheme.styles.taskFailed.color}>
                Failed Task
              </Text>
              <Text color={previewTheme.styles.logInfo.color}>
                Info Log Message
              </Text>
              <Text color={previewTheme.styles.logWarn.color}>
                Warning Log Message
              </Text>
              <Text color={previewTheme.styles.logError.color} bold>
                Error Log Message
              </Text>
            </>
          );
        })()}
      </Box>

      <ThemedText styleType="border">{"─".repeat(60)}</ThemedText>

      {/* Help */}
      <Text color="gray">
        ↑↓ Navigate • Enter Select • Esc Cancel
      </Text>
    </Box>
  );
}
