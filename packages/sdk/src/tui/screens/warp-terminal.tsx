/**
 * Warp Terminal Screen
 *
 * The main terminal interface combining:
 * - Real terminal execution
 * - AI chat assistant
 * - Command blocks with history
 * - File explorer panel
 */

import { useEffect, useState, useRef } from "react";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useThemeColors } from "../theme/hooks";
import { WarpInput } from "../components/terminal/warp-input";
import { TerminalBlock, type TerminalBlockData } from "../components/terminal/command-block";
import { FileTree } from "../components/files/file-tree";
import { useNavigationKeys } from "../hooks";
import { useStore } from "../store";
import { KeyHelpBar } from "../components";
import { detectSmartContext, buildContextPrompt } from "../services/context-resolver";
import {
  AIService,
  createAIServiceFromEnv,
  MockAIService,
} from "../services/ai-service";

type InputMode = "ai" | "terminal";
type Panel = "none" | "files" | "ai";

interface Block {
  id: string;
  type: "terminal" | "ai";
  content: string;
  output?: string;
  status: TerminalBlockData["status"];
  exitCode?: number;
  duration?: number;
  timestamp: Date;
}

export function WarpTerminal() {
  const { setScreen } = useStore();
  const colors = useThemeColors();

  // State
  const [mode, setMode] = useState<InputMode>("terminal");
  const [activePanel, setActivePanel] = useState<Panel>("none");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<number>(-1);

  // AI Service
  const aiServiceRef = useRef<AIService | MockAIService | null>(null);

  useEffect(() => {
    aiServiceRef.current = createAIServiceFromEnv() || new MockAIService();
  }, []);

  // Navigation
  useNavigationKeys({
    screen: "warp-terminal",
    parentScreen: "dashboard",
    enableHelp: true,
    onNavigate: setScreen,
  });

  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === "b") {
      setActivePanel((p) => (p === "files" ? "none" : "files"));
    } else if (key.ctrl && input === "a") {
      setActivePanel((p) => (p === "ai" ? "none" : "ai"));
      setMode("ai");
    } else if (key.ctrl && input === "t") {
      setActivePanel("none");
      setMode("terminal");
    } else if (input === "j" || (key.ctrl && input === "n")) {
      // Next block
      setSelectedBlock((prev) => Math.min(blocks.length - 1, prev + 1));
    } else if (input === "k" || (key.ctrl && input === "p")) {
      // Previous block
      setSelectedBlock((prev) => Math.max(-1, prev - 1));
    }
  });

  // Execute terminal command
  const handleTerminalCommand = async (command: string, output: string, exitCode: number) => {
    const { TerminalBlock } = await import("../components/terminal/command-block");

    setBlocks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "terminal",
        content: command,
        output,
        status: exitCode === 0 ? "success" : "error",
        exitCode,
        duration: 0, // Would track actual duration
        timestamp: new Date(),
      },
    ]);

    // If AI panel is open, also send context to AI
    if (activePanel === "ai") {
      const context = await detectSmartContext(process.cwd());
      const prompt = buildContextPrompt(context);

      setAiMessages((prev) => [
        ...prev,
        { role: "user", content: `I ran: ${command}\n\nOutput:\n${output}\n\n${prompt}` },
      ]);
    }
  };

  // Send AI message
  const handleAIMessage = async (message: string) => {
    if (!aiServiceRef.current) return;

    setIsStreaming(true);
    setAiMessages((prev) => [...prev, { role: "user", content: message }]);

    let fullResponse = "";

    try {
      // Get smart context
      const context = await detectSmartContext(process.cwd());
      const contextPrompt = buildContextPrompt(context);

      const stream = aiServiceRef.current.streamChatCompletion({
        messages: [
          { role: "system", content: contextPrompt },
          ...aiMessages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
          { role: "user", content: message },
        ],
      });

      for await (const chunk of stream) {
        fullResponse += chunk;
      }

      setAiMessages((prev) => [...prev, { role: "assistant", content: fullResponse }]);

      // Check if AI suggested a command
      const commandMatch = fullResponse.match(/```(?:bash|sh)?\n?\$?\s*([^`]+)```/);
      if (commandMatch) {
        const suggestedCommand = commandMatch[1].trim();
        // Could show suggestion to user
      }
    } catch (error) {
      console.error("AI error:", error);
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error}` },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box
        borderColor={colors.border}
        borderStyle="single"
        flexDirection="row"
        justifyContent="space-between"
        paddingX={1}
      >
        <Text bold color={colors.primary}>
          🚀 OpenFarm Warp Terminal
        </Text>
        <Box flexDirection="row" gap={2}>
          <Text color={mode === "ai" ? colors.primary : colors.muted}>
            {mode === "ai" ? "🤖 AI" : "⚡ Terminal"}
          </Text>
          {activePanel === "files" && <Text color={colors.info}>🗂️ Files</Text>}
          <Text color={colors.muted}>
            {blocks.length} commands
          </Text>
        </Box>
      </Box>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1}>
        {/* File panel */}
        {activePanel === "files" && (
          <Box borderColor={colors.border} borderStyle="single" width={30} padding={1}>
            <Text bold color={colors.primary} marginBottom={1}>
              🗂️ Files
            </Text>
            <FileTree
              rootPath={process.cwd()}
              onFileSelect={(path) => {
                // Could preview file or add to context
              }}
            />
          </Box>
        )}

        {/* Terminal + Blocks area */}
        <Box flexDirection="column" flexGrow={1} padding={1}>
          {/* Blocks history */}
          <Box flexDirection="column" flexGrow={1} overflow="hidden">
            {blocks.length === 0 ? (
              <Box flexDirection="column" alignItems="center" paddingY={4}>
                <Text color={colors.muted} dimColor>
                  🚀 Welcome to OpenFarm Warp Terminal
                </Text>
                <Text color={colors.muted} dimColor marginTop={1}>
                  Type commands or press Tab to switch to AI mode
                </Text>
                <Text color={colors.muted} dimCode marginTop={1}>
                  Ctrl+B: Files • Ctrl+A: AI Panel • Ctrl+T: Terminal
                </Text>
              </Box>
            ) : (
              blocks.slice(-10).map((block, index) => (
                <Box key={block.id} flexDirection="column">
                  {block.type === "terminal" ? (
                    <TerminalBlock
                      block={{
                        id: block.id,
                        command: block.content,
                        output: block.output || "",
                        status: block.status,
                        exitCode: block.exitCode || 0,
                        duration: block.duration || 0,
                        timestamp: block.timestamp,
                      }}
                      onDelete={() => {
                        setBlocks((prev) => prev.filter((b) => b.id !== block.id));
                      }}
                    />
                  ) : (
                    <Box borderColor={colors.primary} borderStyle="single" padding={1} marginY={1}>
                      <Text color={colors.primary} bold>
                        🤖 AI
                      </Text>
                      <Text color={colors.foreground}>{block.content}</Text>
                    </Box>
                  )}
                </Box>
              ))
            )}

            {/* AI Messages */}
            {activePanel === "ai" && aiMessages.length > 0 && (
              <Box
                borderColor={colors.primary}
                borderStyle="single"
                flexDirection="column"
                marginTop={1}
                padding={1}
              >
                <Text bold color={colors.primary} marginBottom={1}>
                  🤖 AI Chat
                </Text>
                {aiMessages.slice(-5).map((msg, i) => (
                  <Box key={i} flexDirection="column" marginY={1}>
                    <Text color={msg.role === "user" ? colors.warning : colors.primary} bold>
                      {msg.role === "user" ? "You:" : "AI:"}
                    </Text>
                    <Text color={colors.foreground}>{msg.content}</Text>
                  </Box>
                ))}
                {isStreaming && (
                  <Text color={colors.info}>
                    ◉ Thinking...
                  </Text>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Input bar */}
      <Box paddingX={1} paddingBottom={1}>
        <WarpInput
          mode={mode}
          onModeChange={setMode}
          onAIMessage={handleAIMessage}
          onTerminalCommand={handleTerminalCommand}
          isStreaming={isStreaming}
          suggestions={[
            "git status",
            "bun run build",
            "ls -la",
            "Explain this error",
          ]}
        />
      </Box>

      {/* Footer */}
      <KeyHelpBar
        hints={[
          { key: "Tab", label: "Mode" },
          { key: "Ctrl+B", label: "Files" },
          { key: "Ctrl+A", label: "AI" },
          { key: "Ctrl+T", label: "Term" },
          { key: "Esc", label: "Back" },
        ]}
      />
    </Box>
  );
}
