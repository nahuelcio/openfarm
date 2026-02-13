import { Box, Text } from "@openfarm/tui-opentui";
import { OverlayContainer } from "./overlay-container";

export function HelpOverlay() {
  return (
    <OverlayContainer title="Task Loop Help">
      <Box flexDirection="column">
        <Text bold>Execution</Text>
        <Text> s start/resume</Text>
        <Text> p pause</Text>
        <Text> +/- change max iterations</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Navigation</Text>
        <Text> j/k or arrows move selection</Text>
        <Text> g top, G bottom</Text>
        <Text> v toggle tasks/iterations</Text>
        <Text> o toggle details/output</Text>
        <Text> Enter toggle details/output</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>System</Text>
        <Text> ? help</Text>
        <Text> , settings</Text>
        <Text> r refresh tasks (ready/paused)</Text>
        <Text> d go dashboard</Text>
        <Text> q/ESC quit</Text>
      </Box>
    </OverlayContainer>
  );
}
