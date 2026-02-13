import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { type Agent, useAgentPoolStore } from "../../utils/agent-pool";
import {
  approveAgent,
  type DiffResult,
  getAgentDiff,
  rejectAgent,
} from "../../utils/review-workflow";
import { DiffViewer, parseGitDiff } from "./diff-viewer";

interface ReviewPanelProps {
  agent: Agent;
  onClose: () => void;
}

export function ReviewPanel({ agent, onClose }: ReviewPanelProps) {
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const poolStore = useAgentPoolStore.getState();

  useEffect(() => {
    loadDiff();
  }, [agent.id]);

  async function loadDiff() {
    setLoading(true);
    const diff = await getAgentDiff(agent.id);
    setDiffResult(diff);
    setLoading(false);
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);

    const result = await approveAgent(agent.id);

    if (result.success) {
      setSuccessMessage(result.message || "Approved!");
      setTimeout(onClose, 1500);
    } else {
      setError(result.error || "Failed to approve");
    }
    setApproving(false);
  }

  async function handleReject() {
    const reason = "Rejected by user";
    await rejectAgent(agent.id, reason);
    onClose();
  }

  useInput((input, key) => {
    if (input === "a" && !approving) {
      handleApprove();
    } else if (input === "r") {
      handleReject();
    } else if (input === "q" || key.escape) {
      onClose();
    }
  });

  if (loading) {
    return (
      <Box alignItems="center" flex={1} justifyContent="center">
        <Text>Loading diff...</Text>
      </Box>
    );
  }

  if (!diffResult) {
    return (
      <Box alignItems="center" flex={1} justifyContent="center">
        <Text color="red">No diff available</Text>
      </Box>
    );
  }

  const files = parseGitDiff(diffResult.diff);

  return (
    <Box flexDirection="column" height="100%">
      <Box
        borderBottom="single"
        borderColor="green"
        borderStyle="bold"
        flexDirection="row"
        justifyContent="space-between"
        paddingX={2}
        paddingY={1}
      >
        <Text bold color="green">
          ✓ Review Agent Changes
        </Text>
        <Text>[a] Approve | [r] Reject | [q] Quit</Text>
      </Box>

      <Box borderBottom="single" borderStyle="bold" paddingX={2} paddingY={1}>
        <Text>
          {diffResult.files.length} files changed (+{diffResult.additions} -
          {diffResult.deletions})
        </Text>
      </Box>

      <Box flex={1} overflow="hidden">
        <DiffViewer files={files} onClose={onClose} />
      </Box>

      {error && (
        <Box backgroundColor="red" paddingX={2} paddingY={1}>
          <Text color="white">{error}</Text>
        </Box>
      )}

      {successMessage && (
        <Box backgroundColor="green" paddingX={2} paddingY={1}>
          <Text color="white">{successMessage}</Text>
        </Box>
      )}

      <Box
        borderStyle="bold"
        borderTop="single"
        flexDirection="row"
        justifyContent="space-between"
        paddingX={2}
        paddingY={1}
      >
        <Text bold color="green" onClick={handleApprove}>
          {approving ? "Approving..." : "[a] Approve & Merge"}
        </Text>
        <Text color="red" onClick={handleReject}>
          [r] Reject
        </Text>
      </Box>
    </Box>
  );
}
