import { Box, Text } from "@openfarm/tui-opentui";
import type { CategorizedError } from "../utils/error-handler";

interface ErrorDisplayProps {
  error: CategorizedError;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  const iconColor =
    error.type === "network" || error.type === "timeout" ? "yellow" : "red";
  const icon = getErrorIcon(error.type);

  return (
    <Box
      borderColor={iconColor}
      borderStyle="round"
      flexDirection="column"
      padding={1}
    >
      <Box flexDirection="row" gap={1}>
        <Text color={iconColor}>{icon}</Text>
        <Text bold color={iconColor}>
          {error.message}
        </Text>
        {error.retryable && <Text color="yellow">(Retryable)</Text>}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">{error.originalError}</Text>
      </Box>

      {error.suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyan">
            Suggestions:
          </Text>
          {error.suggestions.map((suggestion, i) => (
            <Box flexDirection="row" gap={1} key={i}>
              <Text color="cyan">•</Text>
              <Text>{suggestion}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function getErrorIcon(type: CategorizedError["type"]): string {
  switch (type) {
    case "api":
      return "🔑";
    case "network":
      return "🌐";
    case "timeout":
      return "⏱️";
    case "validation":
      return "⚠️";
    default:
      return "❌";
  }
}
