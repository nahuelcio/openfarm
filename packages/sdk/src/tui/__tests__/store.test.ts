import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../store";
import { serializeExecutions, deserializeExecutions } from "../store/storage";

describe("TUI Store", () => {
  beforeEach(() => {
    useAppStore.setState({
      executions: [],
      currentExecution: null,
      currentScreen: "dashboard",
      screenHistory: [],
      config: {
        defaultProvider: "opencode",
        defaultModel: "claude-3.5-sonnet",
      },
      theme: "dark",
      sidebarOpen: true,
    });
  });

  it("should change screen", () => {
    useAppStore.getState().setScreen("settings");
    expect(useAppStore.getState().currentScreen).toBe("settings");
  });

  it("should add execution", () => {
    const execution = {
      id: "test-1",
      task: "Test task",
      provider: "opencode",
      status: "pending" as const,
      startedAt: new Date(),
    };

    useAppStore.getState().addExecution(execution);
    expect(useAppStore.getState().executions).toHaveLength(1);
  });

  it("should support all themes", () => {
    const themes = ["dark", "light", "dracula", "monokai", "nord", "oneDark"] as const;
    for (const theme of themes) {
      useAppStore.getState().setTheme(theme);
      expect(useAppStore.getState().theme).toBe(theme);
    }
  });
});

describe("Storage Serialization", () => {
  it("should serialize and deserialize executions", () => {
    const executions = [
      {
        id: "test-1",
        task: "Test task",
        provider: "opencode",
        status: "completed" as const,
        startedAt: new Date("2024-01-01"),
        completedAt: new Date("2024-01-02"),
      },
    ];

    const serialized = serializeExecutions(executions);
    const deserialized = deserializeExecutions(serialized);

    expect(deserialized).toHaveLength(1);
    expect(deserialized[0].task).toBe("Test task");
  });
});
