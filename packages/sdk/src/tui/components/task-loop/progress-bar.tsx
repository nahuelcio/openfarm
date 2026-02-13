import { Text } from "@openfarm/tui-opentui";
import { useTheme } from "../../store/theme-store";

interface ProgressBarProps {
  completed: number;
  total: number;
  width?: number;
}

export function ProgressBar({
  completed,
  total,
  width = 14,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const safeTotal = Math.max(1, total);
  const ratio = Math.min(1, Math.max(0, completed / safeTotal));
  const filled = Math.round(width * ratio);
  const bar = `${"=".repeat(Math.max(0, filled - 1))}${filled > 0 ? ">" : ""}${" ".repeat(width - filled)}`;
  const pct = `${Math.round(ratio * 100)}%`;

  return (
    <Text color={colors.muted}>
      [<Text color={colors.success}>{bar}</Text>] {pct}
    </Text>
  );
}
