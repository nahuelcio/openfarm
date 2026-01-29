import React from "react";
import { useTheme } from "../../theme/styles";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  width?: number;
  borderColor?: string;
}

export function Card({ children, title, width, borderColor }: CardProps) {
  const theme = useTheme("dark");
  const border = borderColor || theme.colors.border;

  return (
    <box
      width={width}
      flexDirection="column"
      borderStyle="single"
      borderColor={border}
      backgroundColor={theme.colors.surface}
      padding={1}
    >
      {title && (
        <box marginBottom={1}>
          <text>
            <span fg={theme.colors.accent}><strong>{title}</strong></span>
          </text>
        </box>
      )}
      {children}
    </box>
  );
}
