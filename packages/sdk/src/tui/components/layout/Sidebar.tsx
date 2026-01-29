import React from "react";
import { useTheme } from "../../theme/styles";
import { useAppStore, type Screen } from "../../store";

const menuItems: { id: Screen; label: string; shortcut: string }[] = [
  { id: "dashboard", label: "🏠 Dashboard", shortcut: "D" },
  { id: "execute", label: "🚀 New Task", shortcut: "N" },
  { id: "history", label: "📜 History", shortcut: "H" },
  { id: "settings", label: "⚙️  Settings", shortcut: "S" },
];

export function Sidebar() {
  const theme = useTheme("dark");
  const { currentScreen, setScreen } = useAppStore();

  return (
    <box
      width={20}
      flexDirection="column"
      backgroundColor={theme.colors.surface}
      borderStyle="single"
      borderColor={theme.colors.border}
      padding={1}
    >
      {menuItems.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <box
            key={item.id}
            height={1}
            flexDirection="row"
            alignItems="center"
            backgroundColor={isActive ? theme.colors.accent : undefined}
            onMouseDown={() => setScreen(item.id)}
          >
            <text>
              {isActive ? (
                <strong>{item.label}</strong>
              ) : (
                <span>{item.label}</span>
              )}
            </text>
          </box>
        );
      })}
    </box>
  );
}
