import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getCurrentGitHash } from "../utils/git-hash";

export function ContextHistoryScreen() {
  const {
    setScreen,
    generatedContexts,
    loadContextsFromDb,
    workspace,
    setContextResult,
    setContextStatus,
    setContextProgress,
  } = useStore();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentGitHash, setCurrentGitHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load contexts on mount
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      await loadContextsFromDb();
      const hash = await getCurrentGitHash(workspace);
      if (mounted) {
        setCurrentGitHash(hash);
        setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [loadContextsFromDb, workspace]);

  // Filter contexts for current workspace
  const workspaceContexts = generatedContexts.filter(
    (ctx) => ctx.workspace === workspace
  );

  useInput((input, key) => {
    if (key.escape) {
      setScreen("context-config");
    }
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(
        Math.min(workspaceContexts.length - 1, selectedIndex + 1)
      );
    }
    if ((key.return || input === "r") && workspaceContexts.length > 0) {
      const selected = workspaceContexts[selectedIndex];
      if (selected) {
        // Reuse selected context
        setContextResult(selected.content);
        setContextProgress(100);
        setContextStatus("complete");
        setScreen("context");
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color="cyan">
          📚 Context History
        </Text>
        <Text color="gray">Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Text bold color="cyan">
        📚 Context History
      </Text>
      <Text color="gray">{"-".repeat(70)}</Text>

      {/* Info */}
      <Box flexDirection="row" gap={1}>
        <Text color="gray">Workspace:</Text>
        <Text color="cyan">{workspace}</Text>
        {currentGitHash && (
          <>
            <Text color="gray">•</Text>
            <Text color="gray">Current git:</Text>
            <Text color="cyan">{currentGitHash.slice(0, 7)}</Text>
          </>
        )}
      </Box>

      <Text color="gray">{"-".repeat(70)}</Text>

      {/* List */}
      {workspaceContexts.length === 0 ? (
        <Text color="gray">No contexts generated yet.</Text>
      ) : (
        workspaceContexts.map((ctx, i) => {
          const isCached = ctx.gitHash === currentGitHash;
          const timestamp = new Date(ctx.createdAt).toLocaleString();
          const sizeKB = ctx.sizeBytes
            ? (ctx.sizeBytes / 1024).toFixed(1)
            : "?";
          const durationSec = ctx.duration
            ? (ctx.duration / 1000).toFixed(1)
            : "?";

          return (
            <Box flexDirection="row" gap={1} key={ctx.id}>
              <Text color={i === selectedIndex ? "yellow" : "gray"}>
                {i === selectedIndex ? "▶" : " "}
              </Text>
              {isCached && <Text color="green">●</Text>}
              {!isCached && <Text color="gray">○</Text>}
              <Box flexDirection="column" flexGrow={1}>
                <Box flexDirection="row" gap={1}>
                  <Text color={i === selectedIndex ? "white" : "gray"}>
                    {timestamp}
                  </Text>
                  <Text color="gray">•</Text>
                  <Text color={i === selectedIndex ? "cyan" : "gray"}>
                    {ctx.provider}
                  </Text>
                  {ctx.model && (
                    <>
                      <Text color="gray">•</Text>
                      <Text color="gray" dimColor>
                        {ctx.model}
                      </Text>
                    </>
                  )}
                </Box>
                <Box flexDirection="row" gap={1}>
                  {ctx.gitHash && (
                    <>
                      <Text color="gray" dimColor>
                        git: {ctx.gitHash.slice(0, 7)}
                      </Text>
                      <Text color="gray">•</Text>
                    </>
                  )}
                  <Text color="gray" dimColor>
                    {sizeKB} KB
                  </Text>
                  <Text color="gray">•</Text>
                  <Text color="gray" dimColor>
                    {durationSec}s
                  </Text>
                  {ctx.filesAnalyzed && (
                    <>
                      <Text color="gray">•</Text>
                      <Text color="gray" dimColor>
                        {ctx.filesAnalyzed} files
                      </Text>
                    </>
                  )}
                  {isCached && (
                    <>
                      <Text color="gray">•</Text>
                      <Text color="green">cached</Text>
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })
      )}

      <Text color="gray">{"-".repeat(70)}</Text>

      {/* Help */}
      <Text color="gray">↑/↓ navigate • Enter/r use context • Esc back</Text>
      {currentGitHash && (
        <Text color="gray" dimColor>
          ● = cached (matches current git hash)
        </Text>
      )}
    </Box>
  );
}
