import React, { useState } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button, Input } from "../components/ui";
import type { ExecutorType } from "../../types";

const providers: { id: ExecutorType; name: string }[] = [
  { id: "opencode", name: "OpenCode" },
  { id: "claude-code", name: "Claude Code" },
  { id: "aider", name: "Aider" },
  { id: "direct-api", name: "Direct API" },
];

export function Execute() {
  const theme = useTheme("dark");
  const { config, setScreen } = useAppStore();

  const [task, setTask] = useState("");
  const [provider, setProvider] = useState<ExecutorType>(
    (config.defaultProvider as ExecutorType) || "opencode"
  );

  return (
    <box flexDirection="column" gap={1}>
      <text>
        <span fg={theme.colors.text.primary}><strong>🚀 New Execution</strong></span>
      </text>

      {/* Provider Selection */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.text.secondary}>Provider</span>
        </text>
        <box flexDirection="row" gap={2}>
          {providers.map((p) => (
            <box
              key={p.id}
              paddingLeft={2}
              paddingRight={2}
              paddingTop={1}
              paddingBottom={1}
              backgroundColor={provider === p.id ? theme.colors.accent : theme.colors.surface}
              borderStyle={provider === p.id ? "double" : "single"}
              borderColor={provider === p.id ? theme.colors.accent : theme.colors.border}
              onMouseDown={() => setProvider(p.id)}
            >
              <text>
                {provider === p.id ? (
                  <strong>{p.name}</strong>
                ) : (
                  <span>{p.name}</span>
                )}
              </text>
            </box>
          ))}
        </box>
      </box>

      {/* Task Input */}
      <box flexDirection="column" gap={1} marginTop={2}>
        <text>
          <span fg={theme.colors.text.secondary}>Task Description</span>
        </text>
        <Input
          value={task}
          onChange={setTask}
          placeholder="Describe what you want the AI to do..."
          multiline
          height={5}
        />
      </box>

      {/* Actions */}
      <box flexDirection="row" gap={2} marginTop={2}>
        <Button variant="secondary" onPress={() => setScreen("dashboard")}>
          Cancel
        </Button>
      </box>
    </box>
  );
}
