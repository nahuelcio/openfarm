import { Box, type BoxProps, Text } from "@openfarm/tui-opentui";
import type { ReactNode } from "react";
import { useTheme } from "../../store/theme-store";

interface OverlayContainerProps {
  title: string;
  children: ReactNode;
  footer?: string;
  boxProps?: BoxProps;
}

export function OverlayContainer({
  title,
  children,
  footer = "Press ESC to close",
  boxProps,
}: OverlayContainerProps) {
  const { colors } = useTheme();

  return (
    <Box
      borderColor={colors.border}
      borderStyle="single"
      flexDirection="column"
      padding={1}
      {...boxProps}
    >
      <Text bold color={colors.primary}>
        {title}
      </Text>
      <Box flexDirection="column" marginY={1}>
        {children}
      </Box>
      <Text color={colors.muted}>{footer}</Text>
    </Box>
  );
}
