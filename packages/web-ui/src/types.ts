export interface WebServerConfig {
  /** Port to listen on (default: 3001) */
  port: number;
  /** Host to bind to (default: "127.0.0.1") */
  host: string;
  /** Open browser automatically (default: true) */
  open: boolean;
  /** Command to run in the PTY (default: ["bun", "run", "tui"]) */
  command: string[];
  /** Working directory for the PTY process */
  cwd: string;
  /** Security token for remote access (auto-generated when host is 0.0.0.0) */
  token?: string;
}

export interface PtyManagerOptions {
  command: string[];
  cwd: string;
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
}

export interface WebServerHandle {
  url: string;
  token?: string;
  close: () => void;
}

/** Control message prefix byte - \x00 never appears in normal terminal output */
export const CONTROL_PREFIX = 0x00;

export enum ControlMessage {
  Resize = "resize",
  Ping = "ping",
  Pong = "pong",
}
