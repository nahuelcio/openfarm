import React, { useState } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button } from "../components/ui";
import { clearExecutions, exportExecutionsToFile } from "../store/storage";

export function Settings() {
  const theme = useTheme("dark");
  const { config, setScreen, theme: appTheme, setTheme, executions, clearExecutions: clearStore } = useAppStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportPath, setExportPath] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleClearHistory = async () => {
    clearStore();
    await clearExecutions();
    setShowClearConfirm(false);
    setMessage("History cleared successfully");
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = async () => {
    if (!exportPath) {
      setMessage("Please enter a file path");
      return;
    }
    
    try {
      await exportExecutionsToFile(executions, exportPath);
      setMessage(`Exported ${executions.length} executions to ${exportPath}`);
      setExportPath("");
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage(`Export failed: ${error}`);
    }
  };

  return (
    <box flexDirection="column" gap={2}>
      <text>
        <span fg={theme.colors.text.primary}><strong>⚙️ Settings</strong></span>
      </text>

      {/* Message */}
      {message && (
        <box
          padding={1}
          borderStyle="single"
          borderColor={theme.colors.success}
          backgroundColor={theme.colors.surface}
        >
          <text>
            <span fg={theme.colors.success}>{message}</span>
          </text>
        </box>
      )}

      {/* General Settings */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.accent}><strong>General</strong></span>
        </text>

        <SettingRow label="Default Provider">
          <text>
            <span fg={theme.colors.text.primary}>{config.defaultProvider}</span>
          </text>
        </SettingRow>

        <SettingRow label="Default Model">
          <text>
            <span fg={theme.colors.text.primary}>{config.defaultModel || "Not set"}</span>
          </text>
        </SettingRow>

        <SettingRow label="Theme">
          <box flexDirection="row" gap={2}>
            <SelectableOption
              label="Dark"
              selected={appTheme === "dark"}
              onPress={() => setTheme("dark")}
            />
            <SelectableOption
              label="Light"
              selected={appTheme === "light"}
              onPress={() => setTheme("light")}
            />
          </box>
        </SettingRow>
      </box>

      {/* History Management */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.accent}><strong>History</strong></span>
        </text>

        <SettingRow label="Executions">
          <text>
            <span fg={theme.colors.text.primary}>{executions.length} saved</span>
          </text>
        </SettingRow>

        {/* Export */}
        <box flexDirection="row" gap={2} alignItems="center">
          <text>
            <span fg={theme.colors.text.secondary}>Export to:</span>
          </text>
          <box flexGrow={1}>
            <text>
              <span fg={theme.colors.text.muted}>./openfarm-export.json</span>
            </text>
          </box>
          <Button onPress={() => handleExport()}>📤 Export</Button>
        </box>

        {/* Clear History */}
        {showClearConfirm ? (
          <box flexDirection="row" gap={2} alignItems="center">
            <text>
              <span fg={theme.colors.error}>Are you sure? This cannot be undone.</span>
            </text>
            <Button onPress={handleClearHistory} variant="danger">
              Yes, Clear
            </Button>
            <Button onPress={() => setShowClearConfirm(false)} variant="secondary">
              Cancel
            </Button>
          </box>
        ) : (
          <Button onPress={() => setShowClearConfirm(true)} variant="danger">
            🗑️ Clear History
          </Button>
        )}
      </box>

      {/* API Settings */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.accent}><strong>API Configuration</strong></span>
        </text>

        <SettingRow label="API URL">
          <text>
            <span fg={theme.colors.text.primary}>{config.apiUrl || "Default"}</span>
          </text>
        </SettingRow>

        <SettingRow label="API Key">
          <text>
            <span fg={theme.colors.text.muted}>
              {config.apiKey ? "********" : "Not set"}
            </span>
          </text>
        </SettingRow>

        <SettingRow label="Timeout">
          <text>
            <span fg={theme.colors.text.primary}>{config.timeout || "60000"}ms</span>
          </text>
        </SettingRow>
      </box>

      {/* Keyboard Shortcuts */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.accent}><strong>Keyboard Shortcuts</strong></span>
        </text>

        <ShortcutRow shortcut="Ctrl+N" action="New Task" />
        <ShortcutRow shortcut="Ctrl+H" action="History" />
        <ShortcutRow shortcut="Ctrl+S" action="Settings" />
        <ShortcutRow shortcut="Ctrl+D" action="Dashboard" />
        <ShortcutRow shortcut="Ctrl+Q" action="Quit" />
        <ShortcutRow shortcut="Esc" action="Back" />
      </box>

      {/* Actions */}
      <box flexDirection="row" gap={2} marginTop={2}>
        <Button onPress={() => setScreen("dashboard")} variant="primary">
          💾 Done
        </Button>
      </box>
    </box>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const theme = useTheme("dark");
  return (
    <box flexDirection="row" alignItems="center" gap={2}>
      <box width={20}>
        <text><span fg={theme.colors.text.secondary}>{label}</span></text>
      </box>
      {children}
    </box>
  );
}

function SelectableOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme("dark");
  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={selected ? theme.colors.accent : theme.colors.surface}
      borderStyle={selected ? "double" : "single"}
      borderColor={selected ? theme.colors.accent : theme.colors.border}
      onMouseDown={onPress}
    >
      <text>
        <span fg={selected ? "#ffffff" : theme.colors.text.primary}>
          {selected ? "● " : "○ "}
          {label}
        </span>
      </text>
    </box>
  );
}

function ShortcutRow({ shortcut, action }: { shortcut: string; action: string }) {
  const theme = useTheme("dark");
  return (
    <box flexDirection="row" alignItems="center" gap={2}>
      <box
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={theme.colors.surface}
        borderStyle="single"
        borderColor={theme.colors.border}
      >
        <text>
          <span fg={theme.colors.text.primary}>{shortcut}</span>
        </text>
      </box>
      <text>
        <span fg={theme.colors.text.secondary}>{action}</span>
      </text>
    </box>
  );
}
