import { Box, Text, useInput } from "ink";
import React from "react";
import { useStore } from "../store";

export function ContextConfigScreen() {
  const { setScreen, contextProvider, setContextProvider, setContextStatus } =
    useStore();

  const [providers, setProviders] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Always show all available providers - user selects based on their needs
    const availableProviders: Array<{ id: string; name: string }> = [
      { id: "direct-api", name: "OpenAI" },
      { id: "claude", name: "Claude" },
      { id: "opencode", name: "OpenCode" },
      { id: "aider", name: "Aider" },
    ];

    setProviders(availableProviders);
    setLoading(false);
  }, []);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : Math.max(0, providers.length - 1)
      );
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < providers.length - 1 ? prev + 1 : 0));
    }
    if (key.return && providers.length > 0) {
      setContextProvider(providers[selectedIndex].id);
      setContextStatus("idle");
      setScreen("context");
    }
    if (input === "q" || key.escape) {
      setScreen("dashboard");
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>Generate Context</Text>
        <Box marginTop={1}>
          <Text color="yellow">Detecting available providers...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Generate Context - Select Provider</Text>
      <Box marginTop={1}>
        <Text color="gray">
          Use arrow keys to select, Enter to confirm, q to cancel
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Text bold>Available Providers:</Text>
        {providers.map((provider, index) => (
          <Text
            color={index === selectedIndex ? "green" : undefined}
            key={provider.id}
          >
            {index === selectedIndex ? "▶" : " "} {provider.name}
          </Text>
        ))}
      </Box>

      {providers.length > 0 && (
        <Box marginTop={2}>
          <Text color="gray">Selected: </Text>
          <Text color="green">{providers[selectedIndex].name}</Text>
        </Box>
      )}

      <Box marginTop={2}>
        <Text color="yellow">Press Enter to continue, q to cancel</Text>
      </Box>
    </Box>
  );
}
