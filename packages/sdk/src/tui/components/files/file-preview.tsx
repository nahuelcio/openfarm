/**
 * FilePreview Component
 *
 * Code preview with syntax highlighting for terminal.
 */

import { useEffect, useState } from "react";
import { Box, Text } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";

export interface FilePreviewProps {
  /** File path */
  path: string;
  /** Optional content (if not provided, reads from disk) */
  content?: string;
  /** Lines to highlight (for diffs) */
  highlightedLines?: number[];
  /** Scroll position */
  scrollLine?: number;
  /** Max height */
  maxHeight?: number;
}

/**
 * Renders a file preview with syntax highlighting
 */
export function FilePreview({
  path,
  content: providedContent,
  highlightedLines = [],
  scrollLine = 0,
  maxHeight = 20,
}: FilePreviewProps) {
  const colors = useThemeColors();
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Read file if content not provided
  useEffect(() => {
    if (providedContent !== undefined) {
      setContent(providedContent);
      setError(null);
      return;
    }

    const loadFile = async () => {
      try {
        const fs = await import("fs");
        const data = fs.readFileSync(path, "utf-8");
        setContent(data);
        setError(null);
      } catch (err) {
        setError(String(err));
        setContent("");
      }
    };

    loadFile();
  }, [path, providedContent]);

  const lines = content.split("\n");
  const visibleLines = lines.slice(scrollLine, scrollLine + maxHeight);

  const getLanguage = (filePath: string): string => {
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx"))
      return "typescript";
    if (filePath.endsWith(".js") || filePath.endsWith(".jsx"))
      return "javascript";
    if (filePath.endsWith(".json")) return "json";
    if (filePath.endsWith(".md")) return "markdown";
    if (filePath.endsWith(".css") || filePath.endsWith(".scss")) return "css";
    if (filePath.endsWith(".html")) return "html";
    if (filePath.endsWith(".py")) return "python";
    if (filePath.endsWith(".rs")) return "rust";
    if (filePath.endsWith(".go")) return "go";
    return "text";
  };

  const language = getLanguage(path);

  // Simple syntax highlighting
  const highlightLine = (line: string): JSX.Element => {
    const tokens: Array<{ text: string; color: string }> = [];

    // Keywords
    const keywords = [
      "import",
      "export",
      "const",
      "let",
      "var",
      "function",
      "class",
      "interface",
      "type",
      "return",
      "if",
      "else",
      "for",
      "while",
      "async",
      "await",
      "try",
      "catch",
      "throw",
      "new",
      "this",
    ];

    // Very basic tokenization
    let remaining = line;
    let key = 0;

    // Comments
    if (remaining.trim().startsWith("//")) {
      return (
        <Text color={colors.muted} dimColor>
          {line}
        </Text>
      );
    }

    // String literals
    const stringRegex = /["']([^"']*)["']/g;
    const matches: Array<{ start: number; end: number; text: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = stringRegex.exec(line)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      });
    }

    // Build tokens
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start > lastEnd) {
        tokens.push({
          text: line.slice(lastEnd, m.start),
          color: colors.foreground,
        });
      }
      tokens.push({ text: m.text, color: colors.success });
      lastEnd = m.end;
    }

    if (lastEnd < line.length) {
      tokens.push({ text: line.slice(lastEnd), color: colors.foreground });
    }

    // If no tokens, check for keywords
    if (tokens.length === 0) {
      const words = line.split(/(\s+)/);
      return (
        <>
          {words.map((word, i) => {
            if (keywords.includes(word)) {
              return (
                <Text key={i} color={colors.primary} bold>
                  {word}
                </Text>
              );
            }
            if (/^\d+$/.test(word)) {
              return (
                <Text key={i} color={colors.warning}>
                  {word}
                </Text>
              );
            }
            return <Text key={i}>{word}</Text>;
          })}
        </>
      );
    }

    return (
      <>
        {tokens.map((t, i) => (
          <Text key={i} color={t.color}>
            {t.text}
          </Text>
        ))}
      </>
    );
  };

  if (error) {
    return (
      <Box borderColor={colors.error} borderStyle="single" padding={1}>
        <Text color={colors.error}>Error: {error}</Text>
      </Box>
    );
  }

  return (
    <Box
      borderColor={colors.border}
      borderStyle="single"
      flexDirection="column"
      paddingX={1}
      paddingY={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text bold color={colors.primary}>
          {path.split("/").pop()}
        </Text>
        <Text color={colors.muted} dimColor>
          {language} • {lines.length} lines
        </Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column">
        {visibleLines.map((line, index) => {
          const lineNumber = scrollLine + index + 1;
          const isHighlighted = highlightedLines.includes(lineNumber);

          return (
            <Box key={lineNumber} flexDirection="row">
              <Box width={6}>
                <Text
                  color={colors.muted}
                  dimColor
                  backgroundColor={isHighlighted ? colors.warning : undefined}
                >
                  {lineNumber.toString().padStart(4, " ")}
                </Text>
              </Box>
              <Box flexGrow={1}>
                {isHighlighted ? (
                  <Text
                    backgroundColor={colors.warning}
                    color={colors.background}
                  >
                    {line || " "}
                  </Text>
                ) : (
                  highlightLine(line)
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      {lines.length > maxHeight && (
        <Box marginTop={1}>
          <Text color={colors.muted} dimColor>
            Showing {scrollLine + 1}-
            {Math.min(scrollLine + maxHeight, lines.length)} of {lines.length}{" "}
            lines
          </Text>
        </Box>
      )}
    </Box>
  );
}
