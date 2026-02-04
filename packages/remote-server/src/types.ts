/**
 * Remote Server Types
 *
 * WebSocket protocol for remote instance management.
 */

import type { TaskLoopSession } from "@openfarm/task-loop";

/**
 * Remote instance metadata
 */
export interface RemoteInstance {
  /** Unique instance ID */
  id: string;

  /** Display name */
  name: string;

  /** WebSocket URL */
  url: string;

  /** Authentication token */
  token?: string;

  /** Connection status */
  status:
    | "connected"
    | "disconnected"
    | "error"
    | "connecting"
    | "reconnecting";

  /** Last error message */
  error?: string;

  /** Current session if any */
  session?: TaskLoopSession;

  /** System info */
  systemInfo?: RemoteSystemInfo;
}

/**
 * System information from remote
 */
export interface RemoteSystemInfo {
  /** Hostname */
  hostname: string;

  /** Platform */
  platform: string;

  /** OpenFarm version */
  version: string;

  /** Active provider */
  provider?: string;

  /** Current workspace */
  workspace?: string;
}

/**
 * Client -> Server messages
 */
export type ClientMessage =
  | { type: "auth"; token: string }
  | { type: "command.start"; config: unknown }
  | { type: "command.pause" }
  | { type: "command.resume" }
  | { type: "command.cancel" }
  | { type: "command.getStatus" }
  | { type: "ping"; timestamp: number };

/**
 * Server -> Client messages
 */
export type ServerMessage =
  | { type: "auth.success"; instanceId: string }
  | { type: "auth.error"; error: string }
  | { type: "status"; session?: TaskLoopSession; systemInfo: RemoteSystemInfo }
  | {
      type: "log";
      level: string;
      message: string;
      timestamp: string;
      sourceClientId?: string;
    }
  | { type: "event"; eventType: string; data: unknown }
  | { type: "trace"; trace: unknown }
  | { type: "pong"; timestamp: number }
  | { type: "error"; message: string };

/**
 * Configuration for remote server
 */
export interface RemoteServerConfig {
  /** Port to listen on */
  port: number;

  /** Host to bind to */
  host?: string;

  /** Authentication token (required if not empty) */
  authToken?: string;

  /** Enable CORS */
  cors?: boolean;

  /** Maximum connections */
  maxConnections?: number;

  /** Heartbeat interval in ms */
  heartbeatInterval?: number;

  /** Disconnect after this many ms without pong */
  heartbeatTimeout?: number;
}

/**
 * Configuration for remote client
 */
export interface RemoteClientConfig {
  /** Server URL (ws:// or wss://) */
  url: string;

  /** Authentication token */
  token?: string;

  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;

  /** Reconnect delay in ms */
  reconnectDelay?: number;

  /** Maximum reconnect attempts (0 = infinite) */
  maxReconnects?: number;

  /** Connection timeout in ms */
  connectionTimeout?: number;

  /** Ping interval in ms */
  pingInterval?: number;

  /** Max queued messages when disconnected */
  maxQueuedMessages?: number;
}

/**
 * Connection state
 */
export interface ConnectionState {
  status: "idle" | "connecting" | "connected" | "reconnecting" | "error";
  error?: string;
  reconnectAttempts: number;
  lastPing?: number;
  latency?: number;
}

/**
 * Event handlers for remote client
 */
export interface RemoteClientHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onLog?: (level: string, message: string) => void;
  onStatusUpdate?: (
    session?: TaskLoopSession,
    systemInfo?: RemoteSystemInfo
  ) => void;
  onEvent?: (eventType: string, data: unknown) => void;
}

/**
 * Saved remote instance configuration
 */
export interface SavedRemoteInstance {
  id: string;
  name: string;
  url: string;
  tokenEnvVar?: string;
  enabled: boolean;
}

/**
 * Remote instances configuration file
 */
export interface RemoteInstancesConfig {
  instances: SavedRemoteInstance[];
}
