import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useState } from "react";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";

export function ExecuteScreen() {
  const { setScreen, provider, setProvider, task, setTask } = useStore();
  const colors = useThemeColors();
  const [mode, setMode] = useState<"input" | "provider">("input");
  const [inputValue, setInputValue] = useState("");

  const providers = [
    { id: "external-agent", label: "External Agent (CLI)" },
    { id: "aider", label: "Aider" },
    { id: "claude", label: "Claude Code" },
    { id: "opencode", label: "OpenCode" },
  ];

  useInput((input, key) => {
    if (key.escape) {
      setScreen("dashboard");
    } else if (key.return && inputValue.trim()) {
      setTask(inputValue);
      setMode("provider");
    } else if (key.backspace) {
      setInputValue((v) => v.slice(0, -1));
    } else if (input) {
      setInputValue((v) => v + input);
    }
  });

  if (mode === "provider") {
    return (
      <Box flexDirection="column" padding={3} gap={2}>
        <Text bold fontSize={18}>Select Provider</Text>
        <Text color="gray">Task: {task}</Text>
        
        <Box flexDirection="column" gap={1} marginTop={2}>
          {providers.map((p, i) => (
            <Text key={p.id}>
              {i + 1}. {p.label}
            </Text>
          ))}
        </Box>
        
        <Text color="gray" marginTop={2}>
          Press number to select | Esc to go back
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={3} gap={2}>
      <Text bold fontSize={18}>Execute Task</Text>
      <Text color="gray">Provider: {provider}</Text>
      
      <Box flexDirection="column" gap={1} marginTop={2}>
        <Text>Enter your task:</Text>
        <Text color="cyan">{" > "}{inputValue}</Text>
      </Box>
      
      <Box flexDirection="column" gap={1} marginTop={2}>
        <Text bold>Examples:</Text>
        <Text color="gray">- Add tests to src/</Text>
        <Text color="gray">- Fix bug in utils.ts</Text>
        <Text color="gray">- Refactor component X</Text>
      </Box>
      
      <Text color="gray" marginTop={2}>
        Enter to continue | Esc to go back
      </Text>
    </Box>
  );
}
