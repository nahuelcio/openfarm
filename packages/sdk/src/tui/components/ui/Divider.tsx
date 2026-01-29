import React from "react";
import { useTheme } from "../../theme/styles";

interface DividerProps {
  label?: string;
}

export function Divider({ label }: DividerProps) {
  const theme = useTheme("dark");
  
  if (label) {
    return (
      <box flexDirection="row" alignItems="center" gap={1}>
        <box flexGrow={1}>
          <text>
            <span fg={theme.colors.border}>{"─".repeat(20)}</span>
          </text>
        </box>
        <text>
          <span fg={theme.colors.text.secondary}>{label}</span>
        </text>
        <box flexGrow={1}>
          <text>
            <span fg={theme.colors.border}>{"─".repeat(20)}</span>
          </text>
        </box>
      </box>
    );
  }

  return (
    <box>
      <text>
        <span fg={theme.colors.border}>{"─".repeat(50)}</span>
      </text>
    </box>
  );
}
