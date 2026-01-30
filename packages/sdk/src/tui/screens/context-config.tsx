import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getAvailableModels } from "../utils/models";

interface ProviderOption {
  id: string;
  name: string;
}

export function ContextConfigScreen() {
  const { setScreen, setContextProvider, setContextModel } = useStore();

  const [step, setStep] = useState<"provider" | "model">("provider");
  const [providers] = useState<ProviderOption[]>([
    { id: "direct-api", name: "OpenAI" },
    { id: "claude", name: "Claude" },
    { id: "opencode", name: "OpenCode" },
    { id: "aider", name: "Aider" },
  ]);
  const [providerIndex, setProviderIndex] = useState(0);
  const [modelSearch, setModelSearch] = useState("");
  const [modelIndex, setModelIndex] = useState(0);
  const [isSelectingFromList, setIsSelectingFromList] = useState(false);

  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const selectedProvider = providers[providerIndex];

  const filteredModels = modelOptions
    .filter((m) => m.toLowerCase().includes(modelSearch.toLowerCase()))
    .slice(0, 10);

  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      const models = await getAvailableModels(selectedProvider.id);
      if (mounted) {
        setModelOptions(models);
      }
    }

    loadModels();

    return () => {
      mounted = false;
    };
  }, [selectedProvider.id]);

  useEffect(() => {
    if (step === "model") {
      setModelSearch("");
      setModelIndex(0);
      setIsSelectingFromList(false);
    }
  }, [step]);

  useInput((input, key) => {
    if (step === "provider") {
      if (key.upArrow) {
        setProviderIndex((prev) =>
          prev > 0 ? prev - 1 : providers.length - 1
        );
      }
      if (key.downArrow) {
        setProviderIndex((prev) =>
          prev < providers.length - 1 ? prev + 1 : 0
        );
      }
      if (key.return) {
        setContextProvider(selectedProvider.id);
        setStep("model");
      }
      if (input === "q" || key.escape) {
        setScreen("dashboard");
      }
    } else if (step === "model") {
      if (key.downArrow && !isSelectingFromList && filteredModels.length > 0) {
        setIsSelectingFromList(true);
        setModelIndex(0);
      } else if (key.upArrow && isSelectingFromList) {
        if (modelIndex === 0) {
          setIsSelectingFromList(false);
        } else {
          setModelIndex((prev) => prev - 1);
        }
      } else if (key.downArrow && isSelectingFromList) {
        setModelIndex((prev) => Math.min(filteredModels.length - 1, prev + 1));
      } else if (key.return) {
        if (isSelectingFromList && filteredModels.length > 0) {
          setContextModel(filteredModels[modelIndex]);
        } else {
          setContextModel(modelSearch);
        }
        setScreen("context");
      }
      if (key.escape) {
        if (isSelectingFromList) {
          setIsSelectingFromList(false);
        } else {
          setModelSearch("");
          setStep("provider");
        }
      }
      if (input === "q") {
        setScreen("dashboard");
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Generate Context</Text>

      {step === "provider" && (
        <>
          <Box marginTop={1}>
            <Text color="gray">
              Step 1/2: Select Provider (arrows, Enter, q to cancel)
            </Text>
          </Box>

          <Box flexDirection="column" marginTop={2}>
            <Text bold>Provider:</Text>
            {providers.map((provider, index) => (
              <Text
                color={index === providerIndex ? "green" : undefined}
                key={provider.id}
              >
                {index === providerIndex ? "▶" : " "} {provider.name}
              </Text>
            ))}
          </Box>

          <Box marginTop={2}>
            <Text color="gray">Selected: </Text>
            <Text color="green">{selectedProvider.name}</Text>
          </Box>

          <Box marginTop={2}>
            <Text color="yellow">Press Enter to continue, q to cancel</Text>
          </Box>
        </>
      )}

      {step === "model" && (
        <>
          <Box marginTop={1}>
            <Text color="gray">
              Step 2/2: Select Model (↓ list, Enter use, Esc back, q cancel)
            </Text>
          </Box>

          <Box flexDirection="column" gap={1} marginTop={2}>
            <Box flexDirection="column" gap={0}>
              <Text color="gray" dimColor>
                {modelOptions.length > 0
                  ? `Search ${modelOptions.length} models or type custom:`
                  : "Type model name:"}
              </Text>
              <Box
                borderColor={isSelectingFromList ? "gray" : "yellow"}
                borderStyle="single"
                padding={1}
              >
                <TextInput
                  onChange={setModelSearch}
                  placeholder="e.g. claude, gemini, gpt..."
                  value={modelSearch}
                />
              </Box>
            </Box>

            {filteredModels.length > 0 && (
              <Box flexDirection="column" gap={0} marginTop={1}>
                <Text color="gray" dimColor>
                  {filteredModels.length} match
                  {filteredModels.length !== 1 ? "es" : ""}:
                </Text>
                {filteredModels.map((model, index) => (
                  <Box flexDirection="row" gap={1} key={model}>
                    <Text
                      color={
                        isSelectingFromList && index === modelIndex
                          ? "yellow"
                          : "gray"
                      }
                    >
                      {isSelectingFromList && index === modelIndex ? "▶" : " "}
                    </Text>
                    <Text
                      bold={isSelectingFromList && index === modelIndex}
                      color={
                        isSelectingFromList && index === modelIndex
                          ? "white"
                          : "gray"
                      }
                    >
                      {model}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}

            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {isSelectingFromList
                  ? "↑↓ Navigate • Enter Select • Esc Back"
                  : modelSearch.trim()
                    ? "↓ Select from list • Enter Use custom"
                    : "Type to search • Enter Skip (use default)"}
              </Text>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
