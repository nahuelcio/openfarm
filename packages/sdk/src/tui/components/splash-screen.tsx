import { Box, Text, useStdout } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { useThemeStore } from "../theme/store";

// Pixel-art style logo using block characters
const PIXEL_LOGO = [
  "██████╗ ██████╗ ███████╗███╗   ██╗    ███████╗ █████╗ ██████╗ ███╗   ███╗",
  "██╔═══██╗██╔══██╗██╔════╝████╗  ██║    ██╔════╝██╔══██╗██╔══██╗████╗ ████║",
  "██║   ██║██████╔╝█████╗  ██╔██╗ ██║    █████╗  ███████║██████╔╝██╔████╔██║",
  "██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║    ██╔══╝  ██╔══██║██╔══██╗██║╚██╔╝██║",
  "╚██████╔╝██║     ███████╗██║ ╚████║    ██║     ██║  ██║██║  ██║██║ ╚═╝ ██║",
  " ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝",
];

// Smaller compact version for smaller terminals
const COMPACT_LOGO = [
  "╔═╗╔═╗╔═╗╔╗╔  ╔═╗╔═╗╦═╗╔╦╗",
  "╠═╝║ ║║ ║║║║  ╠╣ ╠═╣╠╦╝║║║",
  "╩  ╚═╝╚═╝╝╚╝  ╚  ╩ ╩╩╚═╩ ╩",
];

interface SplashScreenProps {
  onReady: () => void;
  loadingProgress: number;
  loadingText: string;
}

export function SplashScreen({
  onReady,
  loadingProgress,
  loadingText,
}: SplashScreenProps) {
  const { currentTheme: theme } = useThemeStore();
  const { stdout } = useStdout();
  const [dots, setDots] = useState(0);
  const [pulse, setPulse] = useState(0);

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for the progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p + 1) % 3);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Auto-ready when progress reaches 100
  useEffect(() => {
    if (loadingProgress >= 100) {
      const timer = setTimeout(() => {
        onReady();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, onReady]);

  // Calculate dimensions
  const terminalWidth = stdout?.columns || 80;
  const terminalHeight = stdout?.rows || 24;

  // Choose logo based on terminal width
  const useCompact = terminalWidth < 80;
  const logoLines = useCompact ? COMPACT_LOGO : PIXEL_LOGO;
  const logoHeight = logoLines.length;
  const totalContentHeight = logoHeight + 6; // logo + spacing + progress + version

  const paddingTop = Math.max(
    0,
    Math.floor((terminalHeight - totalContentHeight) / 2)
  );

  // Progress bar configuration
  const barWidth = Math.min(50, terminalWidth - 10);
  const filledWidth = Math.floor((loadingProgress / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  // Animated progress bar characters
  const pulseChar = pulse === 0 ? "▓" : pulse === 1 ? "▒" : "░";
  const filledBar =
    "█".repeat(filledWidth) +
    (filledWidth < barWidth && loadingProgress > 0 ? pulseChar : "");
  const emptyBar = "░".repeat(emptyWidth);

  // Status indicators
  const statusIcons = ["◐", "◓", "◑", "◒"];
  const currentIcon = statusIcons[dots];

  return (
    <Box
      alignItems="center"
      flexDirection="column"
      height={terminalHeight}
      justifyContent="center"
      width={terminalWidth}
    >
      {/* Top padding */}
      {Array.from({ length: paddingTop }).map((_, i) => (
        <Text key={`pad-${i}`}> </Text>
      ))}

      {/* Pixel Logo */}
      <Box alignItems="center" flexDirection="column">
        {logoLines.map((line, i) => (
          <Text bold color={theme.colors.primary} key={`logo-${i}`}>
            {line}
          </Text>
        ))}
      </Box>

      {/* Spacing */}
      <Box marginY={1} />

      {/* Progress Section */}
      <Box alignItems="center" flexDirection="column">
        {/* Progress Bar Container */}
        <Box
          borderColor={theme.colors.border}
          borderStyle="single"
          paddingX={1}
          width={barWidth + 4}
        >
          <Text>
            <Text color={theme.colors.primary}>{filledBar}</Text>
            <Text color={theme.colors.muted} dimColor>
              {emptyBar}
            </Text>
          </Text>
        </Box>

        {/* Status Line */}
        <Box marginTop={1}>
          <Text color={theme.colors.secondary}>
            {currentIcon} {loadingText}
            {" ".repeat(Math.max(0, 12 - loadingText.length))}
          </Text>
          <Text bold color={theme.colors.primary}>
            {loadingProgress.toString().padStart(3, " ")}%
          </Text>
        </Box>
      </Box>

      {/* Version & Tagline */}
      <Box alignItems="center" flexDirection="column" marginTop={2}>
        <Text color={theme.colors.muted} dimColor>
          v0.1.0 — Open Source AI Farming
        </Text>
        {loadingProgress >= 100 && (
          <Text color={theme.colors.success} dimColor>
            Press any key to continue...
          </Text>
        )}
      </Box>
    </Box>
  );
}
