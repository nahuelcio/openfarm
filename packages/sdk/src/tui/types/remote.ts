/**
 * Remote Types (local copy to avoid circular dependency)
 *
 * These types mirror @openfarm/remote-server types
 * to avoid circular dependencies during development.
 */

// Note: Import from @openfarm/task-loop would cause circular dependency
// Using any for now, in production this should be properly typed
type TaskLoopSession = any;

export interface RemoteInstance {
  id: string;
  name: string;
  url: string;
  token?: string;
  status: "connected" | "disconnected" | "error" | "connecting";
  error?: string;
  session?: TaskLoopSession;
  systemInfo?: RemoteSystemInfo;
}

export interface RemoteSystemInfo {
  hostname: string;
  platform: string;
  version: string;
  provider?: string;
  workspace?: string;
}

export interface RemoteClientConfig {
  url: string;
  token?: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnects?: number;
  connectionTimeout?: number;
}

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

// Stub RemoteClient class for type safety
export interface IRemoteClient {
  connect(): Promise<void>;
  disconnect(): void;
  startTaskLoop(config: unknown): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  getStatus(): void;
  getState(): { status: string; error?: string };
  isConnected(): boolean;
}
