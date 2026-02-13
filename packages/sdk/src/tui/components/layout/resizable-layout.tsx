/**
 * ResizableLayout Component
 *
 * Multi-panel layout with toggleable sections.
 */

import { Box } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";

export interface LayoutConfig {
  leftPanel: {
    width: number;
    visible: boolean;
  };
  rightPanel: {
    width: number;
    visible: boolean;
  };
  bottomPanel: {
    height: number;
    visible: boolean;
  };
}

export interface ResizableLayoutProps {
  config: LayoutConfig;
  leftPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  leftPanel: { width: 25, visible: true },
  rightPanel: { width: 35, visible: false },
  bottomPanel: { height: 8, visible: false },
};

export function ResizableLayout({
  config,
  leftPanel,
  mainPanel,
  rightPanel,
  bottomPanel,
  header,
  footer,
}: ResizableLayoutProps) {
  const colors = useThemeColors();

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      {header}

      {/* Main area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left panel */}
        {config.leftPanel.visible && (
          <Box
            borderColor={colors.border}
            borderStyle="single"
            flexDirection="column"
            width={config.leftPanel.width}
          >
            {leftPanel}
          </Box>
        )}

        {/* Center area */}
        <Box flexDirection="column" flexGrow={1}>
          {/* Main content */}
          <Box flexDirection="row" flexGrow={1}>
            <Box
              borderColor={colors.border}
              borderStyle="single"
              flexDirection="column"
              flexGrow={1}
            >
              {mainPanel}
            </Box>

            {/* Right panel */}
            {config.rightPanel.visible && rightPanel && (
              <Box
                borderColor={colors.border}
                borderStyle="single"
                flexDirection="column"
                width={config.rightPanel.width}
              >
                {rightPanel}
              </Box>
            )}
          </Box>

          {/* Bottom panel */}
          {config.bottomPanel.visible && bottomPanel && (
            <Box
              borderColor={colors.border}
              borderStyle="single"
              flexDirection="column"
              height={config.bottomPanel.height}
            >
              {bottomPanel}
            </Box>
          )}
        </Box>
      </Box>

      {/* Footer */}
      {footer}
    </Box>
  );
}
