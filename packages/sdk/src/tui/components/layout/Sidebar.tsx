import React, { useState, useCallback } from "react";
import { useTheme } from "../../theme/styles";
import { useAppStore, type Screen } from "../../store";

const menuItems: { id: Screen; label: string; shortcut: string }[] = [
  { id: "dashboard", label: "🏠 Dashboard", shortcut: "D" },
  { id: "execute", label: "🚀 New Task", shortcut: "N" },
  { id: "history", label: "📜 History", shortcut: "H" },
  { id: "settings", label: "⚙️  Settings", shortcut: "S" },
];

function MenuItem({ 
  item, 
  isActive, 
  onPress 
}: { 
  item: typeof menuItems[0]; 
  isActive: boolean; 
  onPress: () => void;
}) {
  const theme = useTheme("dark");
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = useCallback(() => {
    setIsPressed(true);
    onPress();
    setTimeout(() => setIsPressed(false), 100);
  }, [onPress]);

  const bgColor = isActive 
    ? theme.colors.accent 
    : isPressed 
      ? theme.colors.surface 
      : undefined;

  const textColor = isActive 
    ? "#ffffff" 
    : isPressed 
      ? theme.colors.accent 
      : theme.colors.text.primary;

  return (
    <box
      key={item.id}
      height={1}
      flexDirection="row"
      alignItems="center"
      backgroundColor={bgColor}
      paddingLeft={1}
      onMouseDown={handlePress}
    >
      <text>
        {isActive || isPressed ? (
          <strong>{item.label}</strong>
        ) : (
          <span fg={textColor}>{item.label}</span>
        )}
      </text>
    </box>
  );
}

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
      paddingTop={1}
      paddingBottom={1}
    >
      {menuItems.map((item) => (
        <MenuItem
          key={item.id}
          item={item}
          isActive={currentScreen === item.id}
          onPress={() => setScreen(item.id)}
        />
      ))}
    </box>
  );
}
