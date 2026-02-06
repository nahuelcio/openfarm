/**
 * @openfarm/web-ui
 *
 * Thin Client web terminal for OpenFarm TUI.
 * Renders the TUI in a browser via xterm.js connected to a PTY backend.
 */

export { startWebServer } from "./server.ts";
export { parseConfig, isLocalhost } from "./config.ts";
export { PtyManager } from "./pty-manager.ts";
export { WsHandler } from "./ws-handler.ts";
export type {
  WebServerConfig,
  WebServerHandle,
  PtyManagerOptions,
} from "./types.ts";
