import React, { useState, useCallback } from "react";
import { useTheme } from "../../theme/styles";

interface FocusButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  isFocused?: boolean;
  id?: string;
  index?: number;
}

export function FocusButton({
  children,
  onPress,
  variant = "primary",
  disabled = false,
  isFocused = false,
}: FocusButtonProps) {
  const theme = useTheme("dark");
  const [isPressed, setIsPressed] = useState(false);

  const colors = {
    primary: theme.colors.accent,
    secondary: theme.colors.surface,
    danger: theme.colors.error,
  };

  // Focused state: show border, pressed: invert colors
  const bgColor = disabled 
    ? theme.colors.border 
    : isPressed 
      ? theme.colors.text.primary 
      : colors[variant];
  
  const textColor = disabled 
    ? theme.colors.text.muted 
    : isPressed 
      ? theme.colors.background 
      : "#ffffff";

  // Focus indicator: different border
  const borderStyle = isFocused ? "double" : isPressed ? "double" : "single";
  const borderColor = isFocused 
    ? theme.colors.warning  // Yellow border when focused
    : isPressed 
      ? theme.colors.text.primary 
      : bgColor;

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    setIsPressed(true);
    onPress();
    setTimeout(() => setIsPressed(false), 150);
  }, [disabled, onPress]);

  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={bgColor}
      borderStyle={borderStyle}
      borderColor={borderColor}
      onMouseDown={handlePress}
    >
      <text>
        {isFocused ? (
          <strong>{children}</strong>
        ) : (
          <span fg={textColor}>{children}</span>
        )}
      </text>
    </box>
  );
}
