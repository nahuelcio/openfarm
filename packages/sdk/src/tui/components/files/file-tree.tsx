/**
 * FileTree Component
 *
 * Navigable file tree with fuzzy search.
 */

import { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  isExpanded?: boolean;
}

export interface FileTreeProps {
  /** Root path */
  rootPath: string;
  /** Currently selected path */
  selectedPath?: string;
  /** Callback when file is selected */
  onFileSelect?: (path: string, node: FileNode) => void;
  /** Callback when directory is toggled */
  onDirectoryToggle?: (path: string) => void;
  /** Filter text */
  filter?: string;
}

/**
 * Renders a navigable file tree
 */
export function FileTree({
  rootPath,
  selectedPath,
  onFileSelect,
  onDirectoryToggle,
  filter,
}: FileTreeProps) {
  const colors = useThemeColors();
  const [tree, setTree] = useState<FileNode | null>(null);
  const [cursor, setCursor] = useState(0);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([rootPath]));

  // Build tree from filesystem
  useEffect(() => {
    const buildTree = async () => {
      try {
        const fs = await import("fs");
        const path = await import("path");

        const buildNode = (dirPath: string): FileNode => {
          const stats = fs.statSync(dirPath);
          const name = path.basename(dirPath);

          if (stats.isDirectory()) {
            const children: FileNode[] = [];
            try {
              const entries = fs.readdirSync(dirPath);
              for (const entry of entries) {
                // Skip hidden files and node_modules
                if (entry.startsWith(".") || entry === "node_modules") continue;
                const fullPath = path.join(dirPath, entry);
                children.push(buildNode(fullPath));
              }
              // Sort: directories first, then alphabetically
              children.sort((a, b) => {
                if (a.type !== b.type) {
                  return a.type === "directory" ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
              });
            } catch {
              // Permission denied or other error
            }

            return {
              name,
              path: dirPath,
              type: "directory",
              children,
              isExpanded: expandedDirs.has(dirPath),
            };
          }

          return {
            name,
            path: dirPath,
            type: "file",
          };
        };

        const rootNode = buildNode(rootPath);
        setTree(rootNode);
      } catch (error) {
        console.error("[FileTree] Error building tree:", error);
      }
    };

    buildTree();
  }, [rootPath, expandedDirs]);

  // Flatten tree for navigation
  const flattenedNodes = useMemo(() => {
    const nodes: { node: FileNode; depth: number }[] = [];

    const flatten = (node: FileNode, depth: number) => {
      nodes.push({ node, depth });
      if (node.type === "directory" && node.isExpanded && node.children) {
        for (const child of node.children) {
          flatten(child, depth + 1);
        }
      }
    };

    if (tree) {
      flatten(tree, 0);
    }

    return nodes;
  }, [tree]);

  // Filter nodes
  const visibleNodes = useMemo(() => {
    if (!filter) return flattenedNodes;
    const lowerFilter = filter.toLowerCase();
    return flattenedNodes.filter(({ node }) =>
      node.name.toLowerCase().includes(lowerFilter)
    );
  }, [flattenedNodes, filter]);

  // Update cursor when selected path changes
  useEffect(() => {
    if (selectedPath) {
      const index = visibleNodes.findIndex(({ node }) => node.path === selectedPath);
      if (index !== -1) {
        setCursor(index);
      }
    }
  }, [selectedPath, visibleNodes]);

  // Navigation
  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setCursor((prev) => Math.min(visibleNodes.length - 1, prev + 1));
    } else if (key.return) {
      const { node } = visibleNodes[cursor] || {};
      if (!node) return;

      if (node.type === "directory") {
        const newExpanded = new Set(expandedDirs);
        if (newExpanded.has(node.path)) {
          newExpanded.delete(node.path);
        } else {
          newExpanded.add(node.path);
        }
        setExpandedDirs(newExpanded);
        onDirectoryToggle?.(node.path);
      } else {
        onFileSelect?.(node.path, node);
      }
    } else if (input === " ") {
      const { node } = visibleNodes[cursor] || {};
      if (node?.type === "directory") {
        const newExpanded = new Set(expandedDirs);
        if (newExpanded.has(node.path)) {
          newExpanded.delete(node.path);
        } else {
          newExpanded.add(node.path);
        }
        setExpandedDirs(newExpanded);
        onDirectoryToggle?.(node.path);
      }
    }
  });

  const getFileIcon = (name: string, type: FileNode["type"]) => {
    if (type === "directory") return "📁";
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return "🟦";
    if (name.endsWith(".js") || name.endsWith(".jsx")) return "🟨";
    if (name.endsWith(".json")) return "📋";
    if (name.endsWith(".md")) return "📝";
    if (name.endsWith(".css") || name.endsWith(".scss")) return "🎨";
    if (name.endsWith(".html")) return "🌐";
    if (name.endsWith(".test.ts") || name.endsWith(".spec.ts")) return "🧪";
    return "📄";
  };

  return (
    <Box flexDirection="column">
      {visibleNodes.map(({ node, depth }, index) => {
        const isSelected = index === cursor;
        const isActive = node.path === selectedPath;

        return (
          <Box
            key={node.path}
            flexDirection="row"
            gap={1}
            paddingLeft={depth * 2 + 1}
            backgroundColor={isSelected ? colors.selectedBg : undefined}
          >
            <Text color={colors.muted}>
              {node.type === "directory"
                ? expandedDirs.has(node.path)
                  ? "▼"
                  : "▶"
                : " "}
            </Text>
            <Text>{getFileIcon(node.name, node.type)}</Text>
            <Text
              color={
                isSelected
                  ? colors.selectedFg
                  : isActive
                    ? colors.primary
                    : colors.foreground
              }
              bold={isActive}
              wrap="truncate-end"
            >
              {node.name}
            </Text>
          </Box>
        );
      })}

      {visibleNodes.length === 0 && (
        <Text color={colors.muted} dimColor>
          No files found
        </Text>
      )}
    </Box>
  );
}
