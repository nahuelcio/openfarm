import React, { useState, useCallback, useEffect } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Input } from "../components/ui";
import { useRenderer } from "@opentui/react";
import type { ExecutorType } from "../../types";

const providers: { id: ExecutorType; name: string }[] = [
  { id: "opencode", name: "OpenCode" },
  { id: "claude-code", name: "Claude Code" },
  { id: "aider", name: "Aider" },
  { id: "direct-api", name: "Direct API" },
];

type FocusArea = "providers" | "task" | "actions";

export function Execute() {
  const theme = useTheme("dark");
  const { config, setScreen, addExecution } = useAppStore();
  const renderer = useRenderer();

  const [task, setTask] = useState("");
  const [provider, setProvider] = useState<ExecutorType>(
    (config.defaultProvider as ExecutorType) || "opencode"
  );
  const [focusArea, setFocusArea] = useState<FocusArea>("providers");
  const [providerIndex, setProviderIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);

  // Navigation with Tab and Arrows
  useEffect(() => {
    if (!renderer) return;

    const handleKey = (event: { name: string; ctrl: boolean }) => {
      if (event.ctrl) return;

      switch (event.name) {
        case "tab":
          if (focusArea === "providers") {
            setFocusArea("task");
          } else if (focusArea === "task") {
            setFocusArea("actions");
            setActionIndex(0);
          } else {
            setFocusArea("providers");
            setProviderIndex(0);
          }
          break;
        
        case "down":
          if (focusArea === "providers") {
            setProviderIndex((i) => Math.min(i + 1, providers.length - 1));
          } else if (focusArea === "actions") {
            setActionIndex((i) => Math.min(i + 1, 1));
          }
          break;
        
        case "up":
          if (focusArea === "providers") {
            setProviderIndex((i) => Math.max(i - 1, 0));
          } else if (focusArea === "actions") {
            setActionIndex((i) => Math.max(i - 1, 0));
          }
          break;
        
        case "enter":
        case "return":
          if (focusArea === "providers") {
            setProvider(providers[providerIndex].id);
          } else if (focusArea === "actions") {
            if (actionIndex === 0 && task.trim()) {
              handleExecute();
            } else if (actionIndex === 1) {
              setScreen("dashboard");
            }
          }
          break;
        
        case "escape":
          setScreen("dashboard");
          break;
      }
    };

    renderer.keyInput.on("key", handleKey);
    return () => {
      renderer.keyInput.off("key", handleKey);
    };
  }, [renderer, focusArea, providerIndex, actionIndex, task, setScreen, setProvider, setFocusArea, setProviderIndex, setActionIndex]);

  const handleExecute = useCallback(() => {
    if (!task.trim()) return;

    const execution = {
      id: `exec_${Date.now()}`,
      task: task.trim(),
      provider,
      status: "pending" as const,
      startedAt: new Date(),
    };

    addExecution(execution);
    setScreen("executing");
  }, [task, provider, addExecution, setScreen]);

  return (
    <box flexDirection="column" gap={2}>
      {/* Title */}
      <text>
        <span fg={theme.colors.text.primary}><strong>🚀 New Execution</strong></span>
      </text>

      {/* Provider Selection */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={focusArea === "providers" ? theme.colors.accent : theme.colors.text.secondary}>
            <strong>1. Select Provider</strong> (Use ↑↓ arrows, Enter to select)
          </span>
        </text>
        <box flexDirection="column" gap={1}>
          {providers.map((p, index) => {
            const isSelected = provider === p.id;
            const isFocused = focusArea === "providers" && providerIndex === index;

            return (
              <box
                key={p.id}
                flexDirection="row"
                alignItems="center"
                gap={2}
                paddingLeft={2}
                paddingRight={2}
                paddingTop={1}
                paddingBottom={1}
                backgroundColor={isFocused ? theme.colors.surface : undefined}
                borderStyle={isFocused ? "double" : undefined}
                borderColor={isFocused ? theme.colors.warning : undefined}
                onMouseDown={() => {
                  setProvider(p.id);
                  setFocusArea("task");
                }}
              >
                <text>
                  {isSelected ? (
                    <span fg={theme.colors.success}>●</span>
                  ) : (
                    <span fg={theme.colors.text.muted}>○</span>
                  )}
                </text>
                <text>
                  {isFocused || isSelected ? (
                    <strong>{p.name}</strong>
                  ) : (
                    <span fg={theme.colors.text.primary}>{p.name}</span>
                  )}
                </text>
              </box>
            );
          })}
        </box>
      </box>

      {/* Task Input */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={focusArea === "task" ? theme.colors.accent : theme.colors.text.secondary}>
            <strong>2. Describe Task</strong> (Tab to focus)
          </span>
        </text>
        <Input
          value={task}
          onChange={setTask}
          placeholder="What should the AI do? (e.g., 'Create a hello world function')"
          multiline
          height={5}
        />
      </box>

      {/* Actions */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={focusArea === "actions" ? theme.colors.accent : theme.colors.text.secondary}>
            <strong>3. Actions</strong> (Tab to focus, ↑↓ to select, Enter to execute)
          </span>
        </text>
        <box flexDirection="row" gap={2}>
          {/* Execute Button */}
          <box
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            backgroundColor={
              focusArea === "actions" && actionIndex === 0
                ? theme.colors.accent
                : theme.colors.surface
            }
            borderStyle={
              focusArea === "actions" && actionIndex === 0 ? "double" : "single"
            }
            borderColor={
              focusArea === "actions" && actionIndex === 0
                ? theme.colors.warning
                : theme.colors.border
            }
          >
            <text>
              {focusArea === "actions" && actionIndex === 0 ? (
                <strong>▶️ Execute</strong>
              ) : (
                <span fg={task.trim() ? theme.colors.text.primary : theme.colors.text.muted}>
                  ▶️ Execute
                </span>
              )}
            </text>
          </box>

          {/* Cancel Button */}
          <box
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            backgroundColor={
              focusArea === "actions" && actionIndex === 1
                ? theme.colors.surface
                : undefined
            }
            borderStyle={
              focusArea === "actions" && actionIndex === 1 ? "double" : "single"
            }
            borderColor={
              focusArea === "actions" && actionIndex === 1
                ? theme.colors.warning
                : theme.colors.border
            }
          >
            <text>
              {focusArea === "actions" && actionIndex === 1 ? (
                <strong>Cancel</strong>
              ) : (
                <span fg={theme.colors.text.secondary}>Cancel</span>
              )}
            </text>
          </box>
        </box>
      </box>

      {/* Help */}
      <box marginTop={2}>
        <text>
          <span fg={theme.colors.text.muted}>
            Tab: Next field • ↑↓: Navigate • Enter: Select/Execute • Esc: Cancel
          </span>
        </text>
      </box>
    </box>
  );
}
