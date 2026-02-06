import { useState } from "react";
import { Box, Text, useInput } from "../runtime";

/**
 * Demo App - muestra las capabilities del runtime web
 *
 * Esto es equivalente a cómo funciona la TUI real pero en el browser.
 */
export function DemoApp() {
  const [activeTab, setActiveTab] = useState(0);
  const [count, setCount] = useState(0);

  const tabs = ["Dashboard", "Execute", "History", "Workflows"];

  // Manejo de input de teclado - misma API que OpenTUI
  useInput((input, key) => {
    if (key.leftArrow) {
      setActiveTab((prev) => Math.max(0, prev - 1));
    }
    if (key.rightArrow) {
      setActiveTab((prev) => Math.min(tabs.length - 1, prev + 1));
    }
    if (input === "q" || input === "Q") {
      window.close();
    }
    if (input === "+") {
      setCount((c) => c + 1);
    }
    if (input === "-") {
      setCount((c) => c - 1);
    }
  });

  return (
    <Box flexDirection="column" height="100%" overflow="hidden">
      {/* Header */}
      <Box
        border
        borderStyle="single"
        flexDirection="row"
        justifyContent="space-between"
        paddingX={1}
        paddingY={0}
      >
        <Text bold color="#60a5fa">
          OpenFarm Web UI
        </Text>
        <Text dimColor>v0.0.1</Text>
      </Box>

      {/* Tab Bar */}
      <Box
        flexDirection="row"
        gap={2}
        padding={1}
        border
        borderStyle="single"
        borderColor="#333"
        marginTop={1}
      >
        {tabs.map((tab, index) => (
          <Box
            key={tab}
            border={index === activeTab}
            borderStyle={index === activeTab ? "bold" : "single"}
            borderColor={index === activeTab ? "#60a5fa" : "#333"}
            paddingX={2}
            paddingY={0}
          >
            <Text
              bold={index === activeTab}
              color={index === activeTab ? "#60a5fa" : undefined}
            >
              {index === activeTab ? "▸ " : "  "}
              {tab}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Main Content */}
      <Box
        flexDirection="column"
        flexGrow={1}
        border
        borderStyle="single"
        padding={2}
        marginTop={1}
        gap={1}
      >
        <Text bold underline color="#4ade80">
          Welcome to OpenFarm Web UI
        </Text>

        <Text dimColor>
          This is a DOM-based renderer with the same API as OpenTUI.
        </Text>

        <Box flexDirection="column" gap={1} marginTop={1}>
          <Text>Active tab: {tabs[activeTab]}</Text>
          <Text>Counter: {count}</Text>
        </Box>

        <Box
          flexDirection="column"
          gap={1}
          marginTop={2}
          padding={1}
          border
          borderStyle="round"
          borderColor="#fbbf24"
        >
          <Text bold color="#fbbf24">
            Keyboard Shortcuts
          </Text>
          <Text>← → : Navigate tabs</Text>
          <Text>+/- : Increment/decrement counter</Text>
          <Text>q : Quit</Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        paddingX={1}
        paddingY={0}
        marginTop={1}
        border
        borderStyle="single"
        borderColor="#333"
      >
        <Text dimColor>Ready</Text>
        <Text dimColor>Press q to quit</Text>
      </Box>
    </Box>
  );
}
