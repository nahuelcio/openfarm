import { Box, Text, useStdout } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { useThemeStore } from "../theme/store";

const OPENFARM_ASCII = `
░█▀█░█▀█░█▀▀░█▀█░░░█▀▀░█▀█░█▀▄░█▄█░░░░
░█░█░█▀▀░█▀▀░█░█░░░█▀▀░█▀█░█▀▄░█░█░░░░
░▀▀▀░▀░░░▀▀▀░▀░▀░░░▀░░░▀░▀░▀░▀░▀░▀░░░░
`;

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

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-ready when progress reaches 100
  useEffect(() => {
    if (loadingProgress >= 100) {
      const timer = setTimeout(() => {
        onReady();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, onReady]);

  // Calculate center position
  const terminalWidth = stdout?.columns || 80;
  const terminalHeight = stdout?.rows || 24;
  const asciiLines = OPENFARM_ASCII.split("\n");
  const asciiHeight = asciiLines.length;
  const totalContentHeight = asciiHeight + 3;

  const paddingTop = Math.max(
    0,
    Math.floor((terminalHeight - totalContentHeight) / 2)
  );

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

      {/* ASCII Logo */}
      <Box alignItems="center" flexDirection="column">
        {asciiLines.map((line, i) => (
          <Text bold color={theme.colors.primary} key={`logo-${i}`}>
            {line || " "}
          </Text>
        ))}
      </Box>

      {/* Loading bar */}
      <Box alignItems="center" flexDirection="column" marginTop={2}>
        <Box borderStyle="single" paddingX={1} width={40}>
          <Text>
            {"█".repeat(Math.floor(loadingProgress / 2.5))}
            {"░".repeat(40 - Math.floor(loadingProgress / 2.5))}
          </Text>
        </Box>
        <Text color={theme.colors.secondary} dimColor>
          {loadingText}
          {".".repeat(dots)}
          {" ".repeat(3 - dots)}
          {loadingProgress}%
        </Text>
      </Box>

      {/* Version */}
      <Box marginTop={1}>
        <Text color={theme.colors.muted} dimColor>
          v0.1.0 — Open Source AI Farming
        </Text>
      </Box>
    </Box>
  );
}
