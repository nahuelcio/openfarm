/**
 * Integrated Terminal Component
 *
 * Real terminal emulation using node-pty.
 * Executes commands in actual shell and captures output.
 */

import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";

// Dynamic import for node-pty to avoid bundling issues
type IPty = {
  write(data: string): void;
  resize(columns: number, rows: number): void;
  kill(signal?: string): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (exitCode: { exitCode: number }) => void): void;
};

export interface TerminalProps {
  /** Shell to use (default: $SHELL or bash) */
  shell?: string;
  /** Initial working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** When command output changes */
  onOutput?: (output: string, command: string) => void;
  /** When a command completes */
  onCommandComplete?: (command: string, output: string, exitCode: number) => void;
  /** Height in rows */
  height?: number;
  /** Read only mode (for showing blocks) */
  readOnly?: boolean;
}

/**
 * Integrated terminal with real shell execution
 */
export function IntegratedTerminal({
  shell = process.env.SHELL || "/bin/bash",
  cwd = process.cwd(),
  env = process.env as Record<string, string>,
  onOutput,
  onCommandComplete,
  height = 10,
  readOnly = false,
}: TerminalProps) {
  const colors = useThemeColors();
  const [lines, setLines] = useState<string[]>([]);
  const [inputLine, setInputLine] = useState("");
  const ptyRef = useRef<IPty | null>(null);
  const bufferRef = useRef("");
  const currentCommandRef = useRef("");
  const [isReady, setIsReady] = useState(false);

  // Initialize PTY
  useEffect(() => {
    if (readOnly) return;

    let pty: IPty | null = null;

    const initPty = async () => {
      try {
        // Dynamic import to avoid bundling issues
        const { spawn } = await import("node-pty");

        pty = spawn(shell, [], {
          name: "xterm-color",
          cols: 80,
          rows: height,
          cwd,
          env: {
            ...env,
            TERM: "xterm-256color",
            FORCE_COLOR: "1",
          },
        }) as IPty;

        ptyRef.current = pty;
        setIsReady(true);

        pty.onData((data: string) => {
          bufferRef.current += data;

          // Parse ANSI sequences and update display
          const processed = processAnsiData(data);

          setLines((prev) => {
            const newLines = [...prev, ...processed];
            // Keep only last N lines
            return newLines.slice(-height);
          });

          onOutput?.(data, currentCommandRef.current);
        });

        pty.onExit(({ exitCode }: { exitCode: number }) => {
          onCommandComplete?.(currentCommandRef.current, bufferRef.current, exitCode);
          bufferRef.current = "";
          currentCommandRef.current = "";
        });
      } catch (error) {
        console.error("[IntegratedTerminal] Failed to spawn PTY:", error);
        setLines(["Error: node-pty not available. Install with: bun add node-pty"]);
      }
    };

    initPty();

    return () => {
      if (pty) {
        pty.kill();
      }
      ptyRef.current = null;
    };
  }, [shell, cwd, env, height, readOnly, onOutput, onCommandComplete]);

  // Handle keyboard input
  useInput((input, key) => {
    if (readOnly || !ptyRef.current) return;

    if (key.return) {
      ptyRef.current.write("\r");
      currentCommandRef.current = inputLine;
      setInputLine("");
    } else if (key.backspace || key.delete) {
      ptyRef.current.write("\b");
      setInputLine((prev) => prev.slice(0, -1));
    } else if (key.ctrl && input === "c") {
      ptyRef.current.write("\x03");
      setInputLine("");
    } else if (key.ctrl && input === "d") {
      ptyRef.current.write("\x04");
    } else if (key.ctrl && input === "l") {
      ptyRef.current.write("\x0c");
      setLines([]);
    } else if (input && !key.ctrl && !key.meta) {
      ptyRef.current.write(input);
      setInputLine((prev) => prev + input);
    }
  });

  return (
    <Box
      borderColor={colors.border}
      borderStyle="single"
      flexDirection="column"
      height={height}
      paddingX={1}
    >
      {lines.map((line, i) => (
        <Text key={i} color={colors.foreground} wrap="truncate-end">
          {line || " "}
        </Text>
      ))}

      {!readOnly && isReady && (
        <Box flexDirection="row">
          <Text color={colors.primary}>$ </Text>
          <Text color={colors.foreground}>{inputLine}</Text>
          <Text color={colors.primary}>_</Text>
        </Box>
      )}

      {!isReady && !readOnly && (
        <Text color={colors.muted} dimColor>
          Initializing terminal...
        </Text>
      )}
    </Box>
  );
}

/**
 * Simple ANSI sequence processor
 */
function processAnsiData(data: string): string[] {
  // Remove common ANSI sequences
  const cleaned = data
    .replace(/\x1b\[[0-9;]*m/g, "") // Color codes
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "") // Cursor movement
    .replace(/\x1b\[\?25[hl]/g, "") // Cursor show/hide
    .replace(/\r\n/g, "\n") // Normalize newlines
    .replace(/\r/g, "\n");

  return cleaned.split("\n");
}

/**
 * Execute a command and return output (for command blocks)
 */
export async function executeCommand(
  command: string,
  cwd: string = process.cwd(),
  timeout: number = 30000
): Promise<{ output: string; exitCode: number; duration: number }> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let pty: IPty | null = null;

    const run = async () => {
      try {
        const { spawn } = await import("node-pty");

        pty = spawn(process.env.SHELL || "/bin/bash", ["-c", command], {
          name: "xterm-color",
          cols: 80,
          rows: 24,
          cwd,
          env: process.env as Record<string, string>,
        }) as IPty;

        let output = "";
        const timer = setTimeout(() => {
          if (pty) {
            pty.kill();
          }
          resolve({
            output: output + "\n[Timed out after 30s]",
            exitCode: -1,
            duration: Date.now() - startTime,
          });
        }, timeout);

        pty.onData((data: string) => {
          output += data;
        });

        pty.onExit(({ exitCode }: { exitCode: number }) => {
          clearTimeout(timer);
          resolve({
            output: output.trim(),
            exitCode: exitCode ?? -1,
            duration: Date.now() - startTime,
          });
        });
      } catch (error) {
        resolve({
          output: `Error: ${error instanceof Error ? error.message : "Failed to execute"}`,
          exitCode: -1,
          duration: Date.now() - startTime,
        });
      }
    };

    run();
  });
}
