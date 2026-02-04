/**
 * Status Helpers
 *
 * Shared utilities for mapping execution statuses to colors and icons.
 * Single source of truth for status → color/icon mapping across all screens.
 */

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "idle"
  | "paused"
  | string;

/**
 * Get the color for a given execution status
 * @param status - The execution status
 * @returns The color string (Ink-compatible color)
 */
export function getStatusColor(status: ExecutionStatus): string {
  switch (status) {
    case "completed":
      return "green";
    case "failed":
    case "error":
      return "red";
    case "running":
      return "yellow";
    case "paused":
      return "yellow";
    case "cancelled":
      return "gray";
    case "idle":
      return "gray";
    default:
      return "gray";
  }
}

/**
 * Get the icon for a given execution status
 * @param status - The execution status
 * @returns The icon character
 */
export function getStatusIcon(status: ExecutionStatus): string {
  switch (status) {
    case "completed":
      return "✓";
    case "failed":
    case "error":
      return "✗";
    case "running":
      return "◐";
    case "paused":
      return "⏸";
    case "cancelled":
      return "⊘";
    case "idle":
      return "○";
    default:
      return "○";
  }
}

/**
 * Get both color and icon for a status (convenience function)
 * @param status - The execution status
 * @returns Object with color and icon
 */
export function getStatusStyle(status: ExecutionStatus): {
  color: string;
  icon: string;
} {
  return {
    color: getStatusColor(status),
    icon: getStatusIcon(status),
  };
}
