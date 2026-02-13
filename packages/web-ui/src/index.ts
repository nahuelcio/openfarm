/**
 * @openfarm/web-ui
 *
 * Thin Client web terminal for OpenFarm TUI.
 * Renders the TUI in a browser via xterm.js connected to a PTY backend.
 */

export { isLocalhost, parseConfig } from "./config.ts";
export { PtyManager } from "./pty-manager.ts";
export { startWebServer } from "./server.ts";
export type {
  PtyManagerOptions,
  WebServerConfig,
  WebServerHandle,
} from "./types.ts";
export { WsHandler } from "./ws-handler.ts";
