import { Box } from "@openfarm/tui-opentui";
import type { ReactNode } from "react";
import { OverlayContainer } from "../task-loop/overlay-container";

export interface HelpOverlayProps {
  /** Title displayed at top of overlay */
  title?: string;

  /** Help content (supports text, lists, or complex JSX) */
  content?: ReactNode;
  children?: ReactNode;

  /** Footer text (default: "Press ESC to close") */
  footer?: string;

  /** Optional box props to customize container */
  boxProps?: Record<string, unknown>;

  /** Width of the overlay */
  width?: number;
}

export function HelpOverlay({
  title = "Help",
  content,
  children,
  footer = "Press ESC to close",
  boxProps,
  width,
}: HelpOverlayProps) {
  const overlayContent = content ?? children;

  return (
    <OverlayContainer boxProps={boxProps} footer={footer} title={title}>
      <Box flexDirection="column" gap={1} width={width || 60}>
        {overlayContent}
      </Box>
    </OverlayContainer>
  );
}
