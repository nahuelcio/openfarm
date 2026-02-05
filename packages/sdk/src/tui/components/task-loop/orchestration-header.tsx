import { Box, Text } from "@openfarm/tui-opentui";
import { formatElapsed } from "../../utils/format-duration";
import { ProgressBar } from "./progress-bar";

interface OrchestrationHeaderProps {
  icon: string;
  taskLabel: string;
  provider: string;
  model?: string;
  completed: number;
  total: number;
  currentIteration: number;
  maxIterations: number;
  elapsedMs: number;
}

export function OrchestrationHeader({
  icon,
  taskLabel,
  provider,
  model,
  completed,
  total,
  currentIteration,
  maxIterations,
  elapsedMs,
}: OrchestrationHeaderProps) {
  return (
    <Box
      borderStyle="single"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
    >
      <Box flexDirection="row" gap={1}>
        <Text bold>
          [{icon}] {taskLabel}
        </Text>
        <Text color="gray">
          {provider}
          {model ? `/${model}` : ""}
        </Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        <ProgressBar completed={completed} total={total} />
        <Text color="gray">
          {completed}/{total}
        </Text>
        <Text color="gray">
          Iter [{currentIteration}/{maxIterations}]
        </Text>
        <Text color="gray">{formatElapsed(elapsedMs)}</Text>
      </Box>
    </Box>
  );
}
