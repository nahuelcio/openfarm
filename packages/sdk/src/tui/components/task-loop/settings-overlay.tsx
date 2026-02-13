import { Box, Text } from "@openfarm/tui-opentui";
import { OverlayContainer } from "./overlay-container";

interface SettingsOverlayProps {
  provider: string;
  model: string;
  maxIterations: number;
  stopOnFailure: boolean;
}

export function SettingsOverlay({
  provider,
  model,
  maxIterations,
  stopOnFailure,
}: SettingsOverlayProps) {
  return (
    <OverlayContainer footer="Press ESC to close" title="Settings">
      <Box flexDirection="column" marginY={1}>
        <Text>Provider: {provider}</Text>
        <Text>Model: {model || "default"}</Text>
        <Text>Max Iterations: {maxIterations}</Text>
        <Text>Stop On Failure: {stopOnFailure ? "yes" : "no"}</Text>
      </Box>
      <Box flexDirection="column">
        <Text>p cycle provider</Text>
        <Text>m cycle model preset</Text>
        <Text>+/- max iterations</Text>
        <Text>f toggle stop on failure</Text>
      </Box>
    </OverlayContainer>
  );
}
