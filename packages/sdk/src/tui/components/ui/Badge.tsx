import React from "react";
import { useTheme } from "../../theme/styles";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = "default" }: BadgeProps) {
  const theme = useTheme("dark");

  const colors: Record<BadgeVariant, string> = {
    default: theme.colors.surface,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
    accent: theme.colors.accent,
  };

  const textColors: Record<BadgeVariant, string> = {
    default: theme.colors.text.primary,
    success: "#ffffff",
    warning: "#000000",
    error: "#ffffff",
    info: "#ffffff",
    accent: "#ffffff",
  };

  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={colors[variant]}
    >
      <text>
        <span fg={textColors[variant]}>{children}</span>
      </text>
    </box>
  );
}
