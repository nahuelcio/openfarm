import React from "react";
import { useTheme } from "../../theme/styles";
import { useAppStore } from "../../store";

export function Header() {
  const theme = useTheme("dark");
  const { config } = useAppStore();

  return (
    <box
      height={3}
      flexDirection="row"
      alignItems="center"
      paddingLeft={2}
      paddingRight={2}
      backgroundColor={theme.colors.surface}
      borderStyle="single"
      borderColor={theme.colors.border}
    >
      {/* Logo */}
      <box width={20}>
        <text>
          <span fg={theme.colors.accent}><strong>🌾 OpenFarm</strong></span>
        </text>
      </box>

      {/* Spacer */}
      <box flexGrow={1} />

      {/* Status */}
      <box flexDirection="row" gap={4}>
        <text>
          <span fg={theme.colors.text.secondary}>Provider: </span>
          <span fg={theme.colors.text.primary}>{config.defaultProvider}</span>
        </text>
        <text>
          <span fg={theme.colors.text.secondary}>Model: </span>
          <span fg={theme.colors.text.primary}>{config.defaultModel || "default"}</span>
        </text>
      </box>
    </box>
  );
}
