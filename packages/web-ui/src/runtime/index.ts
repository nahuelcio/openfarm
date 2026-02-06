/**
 * Web Runtime for OpenTUI
 *
 * API-compatible with @opentui/react pero renderiza a DOM en vez de terminal.
 * Drop-in replacement para usar la misma codebase TUI en web.
 */

export { Box } from "./box";
export { Text } from "./text";
export { render, useApp, useStdout, useStdoutDimensions } from "./renderer";
export { useInput, useKeyboard } from "./input";
export type { BoxProps } from "./box";
export type { TextProps } from "./text";
export type { InputKey } from "./input";
