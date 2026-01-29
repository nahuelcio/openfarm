import React, { useState } from "react";
import { useTheme } from "../../theme/styles";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  password?: boolean;
  multiline?: boolean;
  height?: number;
}

export function Input({
  value,
  onChange,
  placeholder,
  password = false,
  multiline = false,
  height = multiline ? 5 : 1,
}: InputProps) {
  const theme = useTheme("dark");
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = password ? "*".repeat(value.length) : value;
  const showPlaceholder = !value && placeholder;

  return (
    <box
      height={height}
      paddingLeft={1}
      paddingRight={1}
      borderStyle={isFocused ? "double" : "single"}
      borderColor={isFocused ? theme.colors.accent : theme.colors.border}
      backgroundColor={theme.colors.surface}
    >
      <text>
        <span fg={showPlaceholder ? theme.colors.text.muted : theme.colors.text.primary}>
          {showPlaceholder ? placeholder : displayValue}
        </span>
        {isFocused && <span fg={theme.colors.accent}>▌</span>}
      </text>
    </box>
  );
}
