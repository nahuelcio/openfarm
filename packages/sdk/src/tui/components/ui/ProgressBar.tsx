import React from "react";
import { useTheme } from "../../theme/styles";

interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
  label?: string;
}

export function ProgressBar({
  current,
  total,
  width = 40,
  showPercentage = true,
  label,
}: ProgressBarProps) {
  const theme = useTheme("dark");
  const percentage = Math.min(100, Math.max(0, total > 0 ? (current / total) * 100 : 0));
  const filledWidth = Math.floor((width * percentage) / 100);
  const emptyWidth = width - filledWidth;

  return (
    <box flexDirection="column" gap={1}>
      {label && (
        <text>
          <span fg={theme.colors.text.secondary}>{label}</span>
        </text>
      )}
      <box flexDirection="row" alignItems="center" gap={1}>
        <box flexDirection="row">
          <text>
            <span fg={theme.colors.accent}>{"█".repeat(filledWidth)}</span>
            <span fg={theme.colors.border}>{"░".repeat(emptyWidth)}</span>
          </text>
        </box>
        {showPercentage && (
          <text>
            <span fg={theme.colors.text.secondary}>
              {percentage.toFixed(0)}%
            </span>
          </text>
        )}
      </box>
    </box>
  );
}
