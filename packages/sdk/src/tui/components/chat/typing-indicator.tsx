/**
 * TypingIndicator Component
 *
 * Shows animated dots when the AI is "typing"/streaming.
 */

import { Box, Text } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { useThemeColors } from "../../theme/hooks";

export interface TypingIndicatorProps {
  /** Optional custom text */
  text?: string;
}

/**
 * Animated typing indicator
 */
export function TypingIndicator({
  text = "AI is thinking",
}: TypingIndicatorProps) {
  const colors = useThemeColors();
  const [frame, setFrame] = useState(0);

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="row" gap={1} paddingX={1}>
      <Text color={colors.info}>{frames[frame]}</Text>
      <Text color={colors.muted} dimColor>
        {text}
      </Text>
    </Box>
  );
}
