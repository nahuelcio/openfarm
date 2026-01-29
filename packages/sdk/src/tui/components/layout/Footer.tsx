import React from "react";
import { useTheme } from "../../theme/styles";
import { useAppStore } from "../../store";

export function Footer() {
  const theme = useTheme("dark");
  const { currentScreen } = useAppStore();

  // Screen-specific shortcuts
  const getShortcuts = () => {
    const common = [
      { key: "Ctrl+N", action: "New" },
      { key: "Ctrl+Q", action: "Quit" },
    ];

    switch (currentScreen) {
      case "dashboard":
        return [
          { key: "1", action: "New" },
          { key: "2", action: "History" },
          { key: "3", action: "Settings" },
          ...common,
        ];
      case "execute":
        return [
          { key: "Tab", action: "Next" },
          { key: "↑↓", action: "Select" },
          { key: "Enter", action: "Confirm" },
          { key: "Esc", action: "Cancel" },
        ];
      case "executing":
        return [
          { key: "Esc", action: "Stop" },
          ...common,
        ];
      case "history":
      case "execution-detail":
        return [
          { key: "↑↓", action: "Navigate" },
          { key: "Enter", action: "Open" },
          { key: "Esc", action: "Back" },
          ...common,
        ];
      case "settings":
        return [
          { key: "Tab", action: "Next" },
          { key: "Enter", action: "Select" },
          { key: "Esc", action: "Back" },
        ];
      default:
        return common;
    }
  };

  const shortcuts = getShortcuts();

  return (
    <box
      height={1}
      flexDirection="row"
      alignItems="center"
      paddingLeft={2}
      paddingRight={2}
      backgroundColor={theme.colors.surface}
      borderStyle="single"
      borderColor={theme.colors.border}
    >
      {shortcuts.map(({ key, action }, index) => (
        <React.Fragment key={key}>
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={theme.colors.border}
          >
            <text>
              <span fg={theme.colors.text.primary}>{key}</span>
            </text>
          </box>
          <text>
            <span fg={theme.colors.text.secondary}> {action} </span>
          </text>
          {index < shortcuts.length - 1 && (
            <text>
              <span fg={theme.colors.border}>│</span>
            </text>
          )}
        </React.Fragment>
      ))}
    </box>
  );
}
