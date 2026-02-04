/**
 * Themed Text Component
 *
 * A wrapper around Ink's Text component that applies theme styles.
 */

import { Text } from "ink";
import type React from "react";
import { useThemeStyle } from "../theme/hooks";
import type { TextStyle } from "../theme/types";

interface ThemedTextProps {
  /**
   * The theme style to apply (from theme.styles)
   */
  styleType?: keyof import("../theme/types").Theme["styles"];

  /**
   * Override or extend the theme style with custom props
   */
  style?: Partial<TextStyle>;

  /**
   * Text content
   */
  children: React.ReactNode;
}

/**
 * A Text component that applies theme styles.
 *
 * Usage:
 * ```tsx
 * <ThemedText styleType="header">Header Text</ThemedText>
 * <ThemedText styleType="taskRunning">Running task</ThemedText>
 * ```
 */
export function ThemedText({ styleType, style, children }: ThemedTextProps) {
  // Get theme style if styleType is provided
  const themeStyle = styleType ? useThemeStyle(styleType) : {};

  // Merge theme style with custom overrides
  const finalStyle = { ...themeStyle, ...style };

  return <Text {...finalStyle}>{children}</Text>;
}
