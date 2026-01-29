import React from "react";
import { useTheme } from "../../theme/styles";

const shortcuts = [
  { key: "Ctrl+N", action: "New" },
  { key: "Ctrl+H", action: "History" },
  { key: "Ctrl+Q", action: "Quit" },
];

export function Footer() {
  const theme = useTheme("dark");

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
          <text>
            <span fg={theme.colors.text.muted}>{key}</span>
          </text>
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
