/**
 * Running Screen with Subagent Tracing
 *
 * Shows execution progress with real-time subagent trace tree.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect } from "react";
import { TraceTree } from "../components/trace-tree";
import { useTracing } from "../hooks/use-tracing";
import { useStore } from "../store";

export function RunningWithTracing() {
  const { currentExecution } = useStore();
  const {
    isVisible,
    toggleVisibility,
    initTree,
    startTrace,
    completeTrace,
    tree,
  } = useTracing({
    sessionId: currentExecution?.id,
    autoInit: false,
  });

  // Initialize tree when execution starts
  useEffect(() => {
    if (currentExecution?.id && !tree) {
      initTree(currentExecution.id);

      // Example: Create some dummy traces for demo
      const rootId = startTrace(
        undefined,
        "analyze-codebase",
        "🔍",
        "Find auth bugs"
      );

      setTimeout(() => {
        const child1 = startTrace(
          rootId,
          "search-files",
          "📁",
          "Search for auth patterns"
        );

        setTimeout(() => {
          completeTrace(child1, "Found 3 matches");

          const child2 = startTrace(
            rootId,
            "read-file",
            "📄",
            "Read src/auth.ts"
          );

          setTimeout(() => {
            completeTrace(child2);
            completeTrace(rootId, "Analysis complete");
          }, 2000);
        }, 1500);
      }, 1000);
    }
  }, [currentExecution?.id, initTree, startTrace, completeTrace, tree]);

  // Toggle tracing panel
  useInput((input) => {
    if (input === "T") {
      toggleVisibility();
    }
  });

  if (!currentExecution) {
    return (
      <Box padding={1}>
        <Text color="gray">No active execution</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Main content */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left: Execution logs */}
        <Box flexDirection="column" width={isVisible ? "50%" : "100%"}>
          <Text bold>Execution: {currentExecution.task}</Text>
          <Text color="gray">Status: {currentExecution.status}</Text>
          <Text color="gray">Provider: {currentExecution.provider}</Text>
          <Box marginTop={1}>
            <Text color="yellow">Press [T] to toggle subagent traces</Text>
          </Box>
        </Box>

        {/* Right: Trace tree */}
        {isVisible && (
          <Box width="50%">
            <TraceTree height={20} width="100%" />
          </Box>
        )}
      </Box>
    </Box>
  );
}
