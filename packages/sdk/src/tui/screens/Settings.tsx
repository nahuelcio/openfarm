import React, { useState } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button } from "../components/ui";
import { clearExecutions } from "../store/storage";
import { availableThemes, type Theme } from "../theme/colors";

export function Settings() {
  const theme = useTheme("dark");
  const { config, setScreen, theme: appTheme, setTheme, executions, clearExecutions: clearStore } = useAppStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClearHistory = async () => {
    clearStore();
    await clearExecutions();
    setShowClearConfirm(false);
    setMessage("History cleared successfully");
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = async () => {
    try {
      const data = JSON.stringify(executions, null, 2);
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `openfarm-export-${timestamp}.json`;
      
      // In Node.js, write to file
      if (typeof process !== "undefined" && process.versions?.node) {
        const fs = await import("fs/promises");
        const path = await import("path");
        const os = await import("os");
        const filePath = path.join(os.homedir(), filename);
        await fs.writeFile(filePath, data, "utf-8");
        setMessage(`Exported to ${filePath}`);
      } else {
        // In browser, copy to clipboard
        if (typeof navigator !== "undefined" && (navigator as any).clipboard) {
          await (navigator as any).clipboard.writeText(data);
          setMessage("Copied to clipboard!");
        }
      }
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
      </box>

      {/* Theme Selection */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.accent}><strong>Theme</strong></span>
        </text>
        <box flexDirection="row" flexWrap="wrap" gap={1}>
          {availableThemes.map((t) => (
            <ThemeOption
              key={t.id}
              id={t.id}
              name={t.name}
              icon={t.icon}
              selected={appTheme === t.id}
              onPress={() => setTheme(t.id as any)}
            />
          ))}
        </box>
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

        <box flexDirection="row" gap={2}>
          <Button onPress={handleExport}>📤 Export</Button>
          
          {showClearConfirm ? (
            <>
              <text>
                <span fg={theme.colors.error}>Sure?</span>
              </text>
              <Button onPress={handleClearHistory} variant="danger">
                Yes
              </Button>
              <Button onPress={() => setShowClearConfirm(false)} variant="secondary">
                No
              </Button>
            </>
          ) : (
            <Button onPress={() => setShowClearConfirm(true)} variant="danger">
              🗑️ Clear
            </Button>
          )}
        </box>
      </box>

      {/* API Settings */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.accent}><strong>API</strong></span>
        </text>

        <SettingRow label="API URL">
          <text>
            <span fg={theme.colors.text.primary}>{config.apiUrl || "Default"}</span>
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
          <span fg={theme.colors.accent}><strong>Shortcuts</strong></span>
        </text>

        <box flexDirection="row" flexWrap="wrap" gap={2}>
          <ShortcutRow shortcut="Ctrl+N" action="New" />
          <ShortcutRow shortcut="Ctrl+H" action="History" />
          <ShortcutRow shortcut="Ctrl+S" action="Settings" />
          <ShortcutRow shortcut="Ctrl+D" action="Dashboard" />
          <ShortcutRow shortcut="Ctrl+Q" action="Quit" />
          <ShortcutRow shortcut="Esc" action="Back" />
        </box>
      </box>

      <box flexDirection="row" gap={2} marginTop={2}>
        <Button onPress={() => setScreen("dashboard")} variant="primary">
          Done
        </Button>
      </box>
    </box>
  );
}

function ThemeOption({
  id,
  name,
  icon,
  selected,
  onPress,
}: {
  id: Theme;
  name: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme("dark");
  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={selected ? theme.colors.accent : theme.colors.surface}
      borderStyle={selected ? "double" : "single"}
      borderColor={selected ? theme.colors.accent : theme.colors.border}
      onMouseDown={onPress}
    >
      <text>
        {selected ? <strong>{icon} {name}</strong> : <span>{icon} {name}</span>}
      </text>
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
      <box width={18}>
        <text><span fg={theme.colors.text.secondary}>{label}</span></text>
      </box>
      {children}
    </box>
  );
}

function ShortcutRow({ shortcut, action }: { shortcut: string; action: string }) {
  const theme = useTheme("dark");
  return (
    <box flexDirection="row" alignItems="center" gap={1}>
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
