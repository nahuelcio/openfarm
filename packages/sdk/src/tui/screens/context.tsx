import { AgentAnalyzer } from "@openfarm/context/agent-analyzer";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import SpinnerComponent from "@openfarm/tui-opentui/spinner";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { OpenFarm } from "../../open-farm.js";
import { ErrorDisplay } from "../components";
import { useStore } from "../store";
import { copyToClipboard } from "../utils/clipboard";
import { type CategorizedError, categorizeError } from "../utils/error-handler";
import { exportContextToFile } from "../utils/export-context";
import { getCurrentGitHash } from "../utils/git-hash";

const Spinner = SpinnerComponent as unknown as React.FC<{ type?: string }>;

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

export function ContextScreen() {
  const {
    contextStatus,
    contextProgress,
    contextResult,
    // contextError - disponible si se necesita mostrar en UI
    contextProvider,
    contextModel,
    setContextStatus,
    setContextProgress,
    setContextResult,
    setContextError,
    resetContext,
    setScreen,
    workspace,
    getCachedContext,
    saveGeneratedContext,
  } = useStore();

  const generateContextRef = useRef<(() => Promise<void>) | null>(null);
  const [gitHash, setGitHash] = useState<string | null>(null);
  const [_useCache, _setUseCache] = useState<boolean | null>(null);
  const [cachedContextData, setCachedContextData] = useState<{
    content: string;
    createdAt: Date;
  } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [categorizedError, setCategorizedError] =
    useState<CategorizedError | null>(null);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [generationDuration, setGenerationDuration] = useState<number>(0);

  // Update elapsed time every second when running
  useEffect(() => {
    if (
      contextStatus === "extracting" ||
      contextStatus === "exploring" ||
      contextStatus === "analyzing" ||
      contextStatus === "formatting"
    ) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [contextStatus, startTime]);

  const createGenerateContext = useCallback(() => {
    return async () => {
      try {
        setContextStatus("extracting");
        setContextProgress(10);

        // Create LLM executor using OpenFarm
        const client = new OpenFarm({ defaultProvider: contextProvider });

        const llmExecutor = {
          async execute(opts: {
            task: string;
            workspace: string;
            provider?: string;
            model?: string;
            temperature?: number;
          }): Promise<ExecutionResult> {
            return (await client.execute({
              task: opts.task,
              workspace: opts.workspace,
              provider: opts.provider,
              model: opts.model,
              temperature: opts.temperature,
            })) as ExecutionResult;
          },
        };

        setContextStatus("exploring");
        setContextProgress(30);

        // Analyze repository using AgentAnalyzer
        const analyzer = new AgentAnalyzer(workspace, llmExecutor);

        setContextStatus("analyzing");
        setContextProgress(50);

        const exploration = await analyzer.explore();

        setContextStatus("formatting");
        setContextProgress(80);

        const result = await analyzer.analyzeWithAgent(exploration, {
          provider: contextProvider,
          model: contextModel || undefined,
        });

        const duration = Date.now() - startTime;
        setGenerationDuration(duration);

        // Save to database
        await saveGeneratedContext({
          id: uuidv4(),
          workspace,
          provider: contextProvider,
          model: contextModel || undefined,
          content: result.agentsMd,
          gitHash: gitHash || undefined,
          filesAnalyzed: result.metadata?.filesExplored,
          duration,
          metadata: result.metadata,
          createdAt: new Date(),
        });

        setContextResult(result.agentsMd);
        setContextStatus("complete");
        setContextProgress(100);
      } catch (_error) {
        const categorized = categorizeError(_error);
        setCategorizedError(categorized);

        const errorMsg =
          _error instanceof Error ? _error.message : "Unknown error";
        setContextError(errorMsg);
      }
    };
  }, [
    contextProvider,
    contextModel,
    workspace,
    setContextStatus,
    setContextProgress,
    setContextResult,
    setContextError,
    gitHash,
    saveGeneratedContext,
    startTime,
  ]);

  useEffect(() => {
    let mounted = true;

    async function checkCacheAndGenerate() {
      if (contextStatus !== "idle" || generateContextRef.current) {
        return;
      }

      try {
        // Get current git hash
        const hash = await getCurrentGitHash(workspace);
        if (mounted) {
          setGitHash(hash);
        }

        // Check for cached context with same git hash
        if (hash) {
          const cached = await getCachedContext(workspace, hash);
          if (cached && mounted) {
            // Check if cache is recent (< 24 hours)
            const cacheAge = Date.now() - new Date(cached.createdAt).getTime();
            const isRecent = cacheAge < 24 * 60 * 60 * 1000; // 24 hours

            if (isRecent) {
              setCachedContextData({
                content: cached.content,
                createdAt: cached.createdAt,
              });
              setContextStatus("selecting");
              return; // Wait for user decision
            }
          }
        }

        // No cache or not recent, generate new
        if (mounted) {
          setStartTime(Date.now());
          generateContextRef.current = createGenerateContext();
          generateContextRef.current();
        }
      } catch (_error) {
        if (mounted) {
          setStartTime(Date.now());
          generateContextRef.current = createGenerateContext();
          generateContextRef.current();
        }
      }
    }

    checkCacheAndGenerate();

    return () => {
      mounted = false;
    };
  }, [
    contextStatus,
    createGenerateContext,
    workspace,
    getCachedContext,
    setContextStatus,
  ]);

  useInput(
    (input, key) => {
      // Handle cache selection
      if (contextStatus === "selecting") {
        if (input === "y" || key.return) {
          // Use cached context
          if (cachedContextData) {
            setContextResult(cachedContextData.content);
            setContextProgress(100);
            setContextStatus("complete");
          }
        } else if (input === "n" || key.escape) {
          // Generate new context
          setStartTime(Date.now());
          generateContextRef.current = createGenerateContext();
          generateContextRef.current();
        } else if (input === "q") {
          resetContext();
          setScreen("context-config");
        }
        return;
      }

      // Handle complete status actions
      if (contextStatus === "complete" && contextResult) {
        if (input === "c") {
          // Copy to clipboard
          const success = copyToClipboard(contextResult);
          if (success) {
            setFeedbackMessage("✓ Copied to clipboard!");
            setTimeout(() => setFeedbackMessage(""), 2000);
          } else {
            setFeedbackMessage("✗ Failed to copy to clipboard");
            setTimeout(() => setFeedbackMessage(""), 2000);
          }
        } else if (input === "e") {
          // Export to file
          exportContextToFile(workspace, contextResult)
            .then((success) => {
              if (success) {
                setFeedbackMessage("✓ Exported to AGENTS.md!");
                setTimeout(() => setFeedbackMessage(""), 2000);
              } else {
                setFeedbackMessage("✗ Failed to export file");
                setTimeout(() => setFeedbackMessage(""), 2000);
              }
            })
            .catch(() => {
              setFeedbackMessage("✗ Failed to export file");
              setTimeout(() => setFeedbackMessage(""), 2000);
            });
        } else if (key.upArrow) {
          setScrollOffset(Math.max(0, scrollOffset - 5));
        } else if (key.downArrow) {
          const lines = contextResult.split("\n");
          setScrollOffset(Math.min(lines.length - 10, scrollOffset + 5));
        }
      }

      if (input === "q" || key.escape) {
        resetContext();
        setScreen("context-config");
      }
    },
    { isActive: true }
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Repo Context Generator</Text>
      <Box marginTop={1}>
        <Text color="gray">Provider: </Text>
        <Text color="green">{contextProvider}</Text>
      </Box>
      {contextModel && (
        <Box marginTop={0}>
          <Text color="gray">Model: </Text>
          <Text color="cyan">{contextModel}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        {contextStatus === "selecting" && cachedContextData && (
          <Box flexDirection="column" gap={1}>
            <Text color="cyan">
              ✓ Found cached context from{" "}
              {new Date(cachedContextData.createdAt).toLocaleString()}
            </Text>
            <Text color="gray">
              Repository hasn't changed since last generation
            </Text>
            <Box marginTop={1}>
              <Text color="yellow">Use cached context? (y/n)</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                y = use cache • n = regenerate • q = cancel
              </Text>
            </Box>
          </Box>
        )}
        {contextStatus === "extracting" && (
          <Box flexDirection="column" gap={0}>
            <Box flexDirection="row" gap={1}>
              <Text color="yellow">
                <Spinner type="dots" />
              </Text>
              <Text>Initializing context analyzer...</Text>
            </Box>
            <Text color="gray" dimColor>
              {elapsedTime}s elapsed
            </Text>
          </Box>
        )}
        {contextStatus === "exploring" && (
          <Box flexDirection="column" gap={0}>
            <Box flexDirection="row" gap={1}>
              <Text color="yellow">
                <Spinner type="dots" />
              </Text>
              <Text>Exploring repository structure...</Text>
            </Box>
            <Text color="gray" dimColor>
              Scanning files, dependencies, and existing documentation •{" "}
              {elapsedTime}s
            </Text>
          </Box>
        )}
        {contextStatus === "analyzing" && (
          <Box flexDirection="column" gap={0}>
            <Box flexDirection="row" gap={1}>
              <Text color="yellow">
                <Spinner type="dots" />
              </Text>
              <Text>Analyzing with LLM...</Text>
            </Box>
            <Text color="gray" dimColor>
              Provider: {contextProvider}
              {contextModel && ` • Model: ${contextModel}`} • {elapsedTime}s
            </Text>
          </Box>
        )}
        {contextStatus === "formatting" && (
          <Box flexDirection="column" gap={0}>
            <Box flexDirection="row" gap={1}>
              <Text color="yellow">
                <Spinner type="dots" />
              </Text>
              <Text>Generating AGENTS.md...</Text>
            </Box>
            <Text color="gray" dimColor>
              Formatting output • {elapsedTime}s
            </Text>
          </Box>
        )}
        {contextStatus === "complete" && (
          <Text color="green">* Context generated successfully</Text>
        )}
      </Box>

      {contextStatus === "error" && categorizedError && (
        <Box marginTop={1}>
          <ErrorDisplay error={categorizedError} />
        </Box>
      )}

      {contextStatus !== "idle" &&
        contextStatus !== "selecting" &&
        contextStatus !== "complete" &&
        contextStatus !== "error" && (
          <Box flexDirection="column" gap={0} marginTop={1}>
            <Box flexDirection="row" gap={1}>
              <Text color="gray">Progress:</Text>
              <Text color="cyan">{contextProgress}%</Text>
            </Box>
            <Box width={40}>
              <Text color="cyan">
                {"█".repeat(Math.floor(contextProgress / 2.5))}
                {"░".repeat(40 - Math.floor(contextProgress / 2.5))}
              </Text>
            </Box>
          </Box>
        )}

      {contextStatus === "complete" && contextResult && (
        <Box flexDirection="column" marginTop={2}>
          {/* Statistics */}
          <Box flexDirection="column" gap={0} marginBottom={1}>
            <Box flexDirection="row" gap={2}>
              <Text color="gray">Size:</Text>
              <Text color="cyan">
                {(contextResult.length / 1024).toFixed(1)} KB
              </Text>
              {generationDuration > 0 && (
                <>
                  <Text color="gray">•</Text>
                  <Text color="gray">Duration:</Text>
                  <Text color="cyan">
                    {(generationDuration / 1000).toFixed(1)}s
                  </Text>
                </>
              )}
              {gitHash && (
                <>
                  <Text color="gray">•</Text>
                  <Text color="gray">Git:</Text>
                  <Text color="cyan">{gitHash.slice(0, 7)}</Text>
                </>
              )}
            </Box>
          </Box>

          {/* Feedback message */}
          {feedbackMessage && (
            <Box marginBottom={1}>
              <Text color={feedbackMessage.startsWith("✓") ? "green" : "red"}>
                {feedbackMessage}
              </Text>
            </Box>
          )}

          {/* Content preview */}
          <Box
            borderColor="cyan"
            borderStyle="round"
            height={18}
            marginTop={1}
            padding={1}
          >
            <Box flexDirection="column">
              {contextResult
                .split("\n")
                .slice(scrollOffset, scrollOffset + 16)
                .map((line, i) => (
                  <Text key={i}>{line}</Text>
                ))}
            </Box>
          </Box>

          {/* Navigation help */}
          <Box flexDirection="column" gap={0} marginTop={1}>
            <Text color="gray">
              c = copy • e = export to AGENTS.md • ↑/↓ = scroll • Esc = back
            </Text>
            {contextResult.split("\n").length > 16 && (
              <Text color="gray" dimColor>
                Showing lines {scrollOffset + 1}-
                {Math.min(scrollOffset + 16, contextResult.split("\n").length)}{" "}
                of {contextResult.split("\n").length}
              </Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
