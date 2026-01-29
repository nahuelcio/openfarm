import React from "react";
import { useTheme } from "../../theme/styles";

interface Option {
  id: string;
  label: string;
}

interface FocusSelectProps {
  options: Option[];
  selectedId: string;
  onSelect: (id: string) => void;
  focusedIndex?: number;
  isFocused?: boolean;
}

export function FocusSelect({
  options,
  selectedId,
  onSelect,
  focusedIndex = -1,
  isFocused = false,
}: FocusSelectProps) {
  const theme = useTheme("dark");

  return (
    <box flexDirection="row" gap={1}>
      {options.map((option, index) => {
        const isSelected = option.id === selectedId;
        const isItemFocused = isFocused && index === focusedIndex;

        const bgColor = isSelected 
          ? theme.colors.accent 
          : isItemFocused 
            ? theme.colors.surface 
            : undefined;

        const borderStyle = isItemFocused 
          ? "double" 
          : isSelected 
            ? "single" 
            : undefined;
        
        const borderColor = isItemFocused 
          ? theme.colors.warning 
          : isSelected 
            ? theme.colors.accent 
            : theme.colors.border;

        return (
          <box
            key={option.id}
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            backgroundColor={bgColor}
            borderStyle={borderStyle}
            borderColor={borderColor}
            onMouseDown={() => onSelect(option.id)}
          >
            <text>
              {isSelected || isItemFocused ? (
                <strong>{isSelected ? "● " : "○ "}{option.label}</strong>
              ) : (
                <span fg={theme.colors.text.primary}>○ {option.label}</span>
              )}
            </text>
          </box>
        );
      })}
    </box>
  );
}
