import { AgentAnalyzer } from "@openfarm/context";
import { Box, Text, useInput } from "ink";
import { useCallback, useEffect, useRef } from "react";
import { OpenFarm } from "../../open-farm.js";
import { useStore } from "../store";

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
    contextError,
    contextProvider,
    contextModel,
    setContextStatus,
    setContextProgress,
    setContextResult,
    setContextError,
    resetContext,
    setScreen,
    workspace,
  } = useStore();

  const generateContextRef = useRef<(() => Promise<void>) | null>(null);

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

        setContextResult(result.agentsMd);
        setContextStatus("complete");
        setContextProgress(100);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        if (errorMsg.includes("401") || errorMsg.includes("API key")) {
          setContextError(`API key required for ${contextProvider}`);
        } else {
          setContextError(errorMsg);
        }
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
  ]);

  useEffect(() => {
    if (contextStatus === "idle" && !generateContextRef.current) {
      generateContextRef.current = createGenerateContext();
      generateContextRef.current();
    }
  }, [contextStatus, createGenerateContext]);

  useInput((input, key) => {
    if (input === "q") {
      resetContext();
      setScreen("context-config");
    }
    if (
      (input === "c" || key.return) &&
      contextStatus === "complete" &&
      contextResult
    ) {
      process.stdout.write("\x1b[32mContext copied to clipboard!\x1b[0m\n");
    }
  });

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
        {contextStatus === "extracting" && (
          <>
            <Text color="yellow">*</Text>
            <Text> Initializing...</Text>
          </>
        )}
        {contextStatus === "exploring" && (
          <>
            <Text color="yellow">*</Text>
            <Text> Exploring repository structure...</Text>
          </>
        )}
        {contextStatus === "analyzing" && (
          <>
            <Text color="yellow">*</Text>
            <Text> Analyzing with LLM...</Text>
          </>
        )}
        {contextStatus === "formatting" && (
          <>
            <Text color="yellow">*</Text>
            <Text> Formatting AGENTS.md...</Text>
          </>
        )}
        {contextStatus === "complete" && (
          <Text color="green">* Context generated successfully</Text>
        )}
        {contextStatus === "error" && (
          <Text color="red">* Error: {contextError}</Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Progress: {contextProgress}%</Text>
      </Box>

      {contextStatus === "complete" && contextResult && (
        <Box flexDirection="column" marginTop={2}>
          <Text color="gray">
            (Press 'c' or Enter to copy, 'q' to change provider)
          </Text>
          <Box
            borderColor="gray"
            borderStyle="round"
            height={16}
            marginTop={1}
            overflow="hidden"
            padding={1}
          >
            <Text>{contextResult.slice(0, 1100)}</Text>
            {contextResult.length > 1100 && <Text>...</Text>}
          </Box>
        </Box>
      )}
    </Box>
  );
}
