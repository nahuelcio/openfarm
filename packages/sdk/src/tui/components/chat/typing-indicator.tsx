/**
 * TypingIndicator Component
 *
 * Shows animated dots when the AI is "typing"/streaming.
 */

import { Box, Text } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { useThemeColors } from "../../theme/hooks";

const TYPING_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

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

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % TYPING_FRAMES.length);
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="row" gap={1} paddingX={1}>
      <Text color={colors.info}>{TYPING_FRAMES[frame]}</Text>
      <Text color={colors.muted} dimColor>
        {text}
      </Text>
    </Box>
  );
}
