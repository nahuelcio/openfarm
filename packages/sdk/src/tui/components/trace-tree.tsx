/**
 * TraceTree Component
 *
 * Visualizes nested agent calls as a collapsible tree.
 * Similar to Ralph TUI's subagent tracing panel.
 */

import { Box, Text, useInput } from "ink";
import { useMemo } from "react";
import { useTracingStore } from "../store/tracing-store";
import type { TraceNode, TraceStatus } from "../types/tracing";

interface TraceTreeProps {
  /** Fixed height for the panel */
  height?: number;

  /** Fixed width for the panel */
  width?: number | string;
}

const STATUS_CONFIG: Record<
  TraceStatus,
  { symbol: string; color: string; bgColor?: string }
> = {
  pending: { symbol: "○", color: "gray" },
  running: { symbol: "▶", color: "yellow" },
  completed: { symbol: "✓", color: "green" },
  failed: { symbol: "✗", color: "red" },
  cancelled: { symbol: "⊘", color: "gray" },
};

function formatDuration(ms: number | undefined): string {
  if (!ms) {
    return "";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function TreeNode({
  node,
  depth = 0,
  isLast = true,
  selected,
  expanded,
  onToggle,
}: {
  node: TraceNode;
  depth?: number;
  isLast?: boolean;
  selected?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_CONFIG[node.status];
  const hasChildren = node.children.length > 0;

  // Build indentation string
  const indent = "  ".repeat(depth);
  const branch = depth === 0 ? "" : isLast ? "└─ " : "├─ ";

  return (
    <Box flexDirection="column">
      {/* Node line */}
      <Box flexDirection="row" height={1}>
        <Text color={selected ? "cyan" : undefined} wrap="truncate-end">
          {indent}
          {branch}
          {hasChildren && <Text color="gray">{expanded ? "▼ " : "▶ "}</Text>}
          {!hasChildren && <Text> </Text>}
          <Text color={status.color}>{status.symbol}</Text>
          <Text> </Text>
          <Text>{node.icon}</Text>
          <Text> </Text>
          <Text bold={selected}>{node.name}</Text>
          {node.durationMs !== undefined && (
            <Text color="gray"> ({formatDuration(node.durationMs)})</Text>
          )}
          {node.error && (
            <Text color="red"> - {node.error.slice(0, 30)}...</Text>
          )}
        </Text>
      </Box>

      {/* Children */}
      {expanded &&
        node.children.map((child, index) => (
          <TreeNode
            depth={depth + 1}
            expanded={false}
            isLast={index === node.children.length - 1}
            key={child.id}
            node={child}
            onToggle={() => {}}
            selected={false}
          />
        ))}
    </Box>
  );
}

export function TraceTree({ height = 15, width = "50%" }: TraceTreeProps) {
  const {
    tree,
    viewState,
    toggleExpanded,
    selectNode,
    expandAll,
    collapseAll,
  } = useTracingStore();

  const { expanded, selected } = viewState;

  // Get flat list of visible nodes for keyboard navigation
  const visibleNodes = useMemo(() => {
    if (!tree) {
      return [];
    }

    const result: TraceNode[] = [];
    const traverse = (node: TraceNode) => {
      result.push(node);
      if (expanded.has(node.id)) {
        node.children.forEach(traverse);
      }
    };
    tree.roots.forEach(traverse);
    return result;
  }, [tree, expanded]);

  const selectedIndex = selected
    ? visibleNodes.findIndex((n) => n.id === selected)
    : -1;

  // Keyboard navigation
  useInput((input, key) => {
    if (!tree) {
      return;
    }

    // Toggle selected node
    if (input === " " || key.return) {
      if (selected) {
        toggleExpanded(selected);
      }
      return;
    }

    // Navigate up/down
    if (key.upArrow) {
      const newIndex =
        selectedIndex > 0 ? selectedIndex - 1 : visibleNodes.length - 1;
      selectNode(visibleNodes[newIndex]?.id);
    } else if (key.downArrow) {
      const newIndex =
        selectedIndex < visibleNodes.length - 1 ? selectedIndex + 1 : 0;
      selectNode(visibleNodes[newIndex]?.id);
    }

    // Expand/collapse all
    if (input === "e" && key.ctrl) {
      expandAll();
    } else if (input === "c" && key.ctrl) {
      collapseAll();
    }
  });

  if (!tree || tree.roots.length === 0) {
    return (
      <Box
        borderColor="gray"
        borderStyle="single"
        height={height}
        paddingX={1}
        width={width}
      >
        <Text color="gray">
          No traces yet. Start an execution to see subagent calls.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      borderColor="cyan"
      borderStyle="single"
      flexDirection="column"
      height={height}
      width={width}
    >
      {/* Header */}
      <Box borderColor="gray" borderStyle="single" paddingX={1}>
        <Text bold color="cyan">
          Subagent Traces
        </Text>
        <Text color="gray">
          {" "}
          ({tree.roots.length} roots, {tree.nodes.size} total)
        </Text>
      </Box>

      {/* Tree content */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingX={1}>
        {tree.roots.map((root, index) => (
          <TreeNode
            expanded={expanded.has(root.id)}
            isLast={index === tree.roots.length - 1}
            key={root.id}
            node={root}
            onToggle={() => toggleExpanded(root.id)}
            selected={root.id === selected}
          />
        ))}
      </Box>

      {/* Footer */}
      <Box borderColor="gray" borderStyle="single" paddingX={1}>
        <Text color="gray">
          [←→ navigate] [space/enter toggle] [Ctrl+e expand all] [Ctrl+c
          collapse all]
        </Text>
      </Box>
    </Box>
  );
}
