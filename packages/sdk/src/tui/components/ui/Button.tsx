import React, { useState, useCallback } from "react";
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
  const [isPressed, setIsPressed] = useState(false);

  const colors = {
    primary: theme.colors.accent,
    secondary: theme.colors.surface,
    danger: theme.colors.error,
  };

  // Visual feedback when pressed
  const bgColor = disabled 
    ? theme.colors.border 
    : isPressed 
      ? theme.colors.text.primary // Invert color when pressed
      : colors[variant];
  
  const textColor = disabled 
    ? theme.colors.text.muted 
    : isPressed 
      ? theme.colors.background // Invert text when pressed
      : "#ffffff";

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    
    // Immediate visual feedback
    setIsPressed(true);
    
    // Execute handler
    onPress();
    
    // Reset after short delay
    setTimeout(() => setIsPressed(false), 100);
  }, [disabled, onPress]);

  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={bgColor}
      borderStyle={isPressed ? "double" : "single"}
      borderColor={isPressed ? theme.colors.text.primary : bgColor}
      onMouseDown={handlePress}
    >
      <text>
        <span fg={textColor}>
          {isPressed ? <strong>{children}</strong> : <span>{children}</span>}
        </span>
      </text>
    </box>
  );
}
