import { Box, Text, useInput } from "ink";
import React from "react";
import { generateAgentsMd } from "../generators/agents-md";
import { useStore } from "../store";

export function ContextScreen() {
  const {
    contextStatus,
    contextProgress,
    contextResult,
    contextError,
    contextProvider,
    setContextStatus,
    setContextProgress,
    setContextResult,
    setContextError,
    resetContext,
    setScreen,
    workspace,
  } = useStore();

  const generateContextRef = React.useRef<(() => Promise<void>) | null>(null);

  React.useEffect(() => {
    if (contextStatus === "idle" && !generateContextRef.current) {
      generateContextRef.current = createGenerateContext();
      generateContextRef.current();
    }
  }, [contextStatus]);

  const createGenerateContext = () => {
    return async () => {
      try {
        setContextStatus("extracting");
        setContextProgress(10);

        const result = await generateAgentsMd({
          workspace,
          provider: contextProvider,
          model: undefined,
          onProgress: (message) => {
            if (message.includes("structure")) {
              setContextStatus("exploring");
              setContextProgress(30);
            } else if (
              message.includes("tech stack") ||
              message.includes("stack")
            ) {
              setContextStatus("analyzing");
              setContextProgress(50);
            } else if (
              message.includes("Merging") ||
              message.includes("existing")
            ) {
              setContextStatus("formatting");
              setContextProgress(90);
            }
          },
        });

        setContextResult(result);
        setContextStatus("complete");
        setContextProgress(100);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        if (errorMsg.includes("401") || errorMsg.includes("API key")) {
          setContextError("API key required for " + contextProvider);
        } else {
          setContextError(errorMsg);
        }
      }
    };
  };

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
