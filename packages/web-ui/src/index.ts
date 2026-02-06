/**
 * @openfarm/web-ui
 *
 * Web runtime for OpenFarm TUI.
 * Drop-in replacement for @openfarm/tui-opentui that renders to DOM.
 */

// Runtime API (compatible con @opentui/react)
export {
  Box,
  Text,
  render,
  useApp,
  useInput,
  useKeyboard,
  useStdout,
  useStdoutDimensions,
} from "./runtime";

export type { BoxProps } from "./runtime";
export type { TextProps } from "./runtime";
export type { InputKey } from "./runtime";

// Utils
export { createWebApp } from "./create-web-app.tsx";
