import React from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button } from "../components/ui";

export function Settings() {
  const theme = useTheme("dark");
  const { config, setScreen, theme: appTheme, setTheme } = useAppStore();

  return (
    <box flexDirection="column" gap={2}>
      <text>
        <span fg={theme.colors.text.primary}><strong>⚙️ Settings</strong></span>
      </text>

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
        <ShortcutRow shortcut="Ctrl+Q" action="Quit" />
        <ShortcutRow shortcut="Esc" action="Back" />
      </box>

      {/* Actions */}
      <box flexDirection="row" gap={2} marginTop={2}>
        <Button onPress={() => setScreen("dashboard")} variant="primary">
          💾 Save
        </Button>
        <Button onPress={() => setScreen("dashboard")} variant="secondary">
          Cancel
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
