import React from "react";
import { useTheme } from "../../theme/styles";

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  const theme = useTheme("dark");

  const colors = {
    primary: theme.colors.accent,
    secondary: theme.colors.surface,
    danger: theme.colors.error,
  };

  const bgColor = disabled ? theme.colors.border : colors[variant];
  const textColor = disabled ? theme.colors.text.muted : "#ffffff";

  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={bgColor}
      onMouseDown={disabled ? undefined : onPress}
    >
      <text>
        <span fg={textColor}><strong>{children}</strong></span>
      </text>
    </box>
  );
}
