/**
 * Remote Store
 *
 * Manages connections to multiple remote OpenFarm instances.
 */

import { create } from "zustand";
import type {
  IRemoteClient,
  RemoteClientHandlers,
  RemoteInstance,
} from "../types/remote";

// Stub RemoteClient implementation for now
// In production, this would import from @openfarm/remote-server
class StubRemoteClient implements IRemoteClient {
  private config: { url: string; token?: string };
  private handlers: RemoteClientHandlers;
  private connected = false;

  constructor(
    config: { url: string; token?: string },
    handlers: RemoteClientHandlers
  ) {
    this.config = config;
    this.handlers = handlers;
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.handlers.onConnect?.();
  }

  disconnect(): void {
    this.connected = false;
    this.handlers.onDisconnect?.("manual");
  }

  startTaskLoop(_config: unknown): void {
    this.handlers.onLog?.("info", "Starting task loop...");
  }

  pause(): void {
    this.handlers.onLog?.("info", "Pausing...");
  }

  resume(): void {
    this.handlers.onLog?.("info", "Resuming...");
  }

  cancel(): void {
    this.handlers.onLog?.("info", "Cancelling...");
  }

  getStatus(): void {
    this.handlers.onLog?.("info", "Getting status...");
  }

  getState() {
    return { status: this.connected ? "connected" : "disconnected" };
  }

  isConnected() {
    return this.connected;
  }
}

interface RemoteState {
  /** List of configured remote instances */
  instances: RemoteInstance[];

  /** Currently selected instance ID */
  selectedInstanceId?: string;

  /** Active client connections */
  clients: Map<string, IRemoteClient>;

  /** Add a new remote instance */
  addInstance: (instance: Omit<RemoteInstance, "status">) => void;

  /** Remove an instance */
  removeInstance: (id: string) => void;

  /** Update instance configuration */
  updateInstance: (id: string, updates: Partial<RemoteInstance>) => void;

  /** Connect to an instance */
  connect: (id: string) => Promise<void>;

  /** Disconnect from an instance */
  disconnect: (id: string) => void;

  /** Select an instance for viewing */
  selectInstance: (id: string | undefined) => void;

  /** Get connection status */
  getConnectionStatus: (id: string) => RemoteInstance["status"];

  /** Load instances from config */
  loadInstances: () => Promise<void>;

  /** Save instances to config */
  saveInstances: () => Promise<void>;
}

export const useRemoteStore = create<RemoteState>((set, get) => ({
  instances: [],
  selectedInstanceId: undefined,
  clients: new Map(),

  addInstance: (instance) => {
    const newInstance: RemoteInstance = {
      ...instance,
      status: "disconnected",
    };
    set((state) => ({
      instances: [...state.instances, newInstance],
    }));
  },

  removeInstance: (id) => {
    const { clients, disconnect } = get();

    // Disconnect if connected
    if (clients.has(id)) {
      disconnect(id);
    }

    set((state) => ({
      instances: state.instances.filter((i) => i.id !== id),
      selectedInstanceId:
        state.selectedInstanceId === id ? undefined : state.selectedInstanceId,
    }));
  },

  updateInstance: (id, updates) => {
    set((state) => ({
      instances: state.instances.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }));
  },

  connect: async (id) => {
    const { instances, clients, updateInstance } = get();
    const instance = instances.find((i) => i.id === id);

    if (!instance) {
      throw new Error(`Instance not found: ${id}`);
    }

    // Update status
    updateInstance(id, { status: "connecting", error: undefined });

    try {
      const client = new StubRemoteClient(
        {
          url: instance.url,
          token: instance.token,
        },
        {
          onConnect: () => {
            updateInstance(id, { status: "connected", error: undefined });
          },
          onDisconnect: (reason: string) => {
            updateInstance(id, { status: "disconnected" });
          },
          onError: (error: Error) => {
            updateInstance(id, { status: "error", error: error.message });
          },
          onLog: (level: string, message: string) => {
            console.log(`[${instance.name}] ${level}: ${message}`);
          },
          onStatusUpdate: (session, systemInfo) => {
            updateInstance(id, { session: session as any, systemInfo });
          },
        }
      );

      await client.connect();
      clients.set(id, client);

      set({ clients: new Map(clients) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateInstance(id, { status: "error", error: message });
      throw error;
    }
  },

  disconnect: (id) => {
    const { clients } = get();
    const client = clients.get(id);

    if (client) {
      client.disconnect();
      clients.delete(id);
      set({ clients: new Map(clients) });
    }

    get().updateInstance(id, { status: "disconnected" });
  },

  selectInstance: (id) => {
    set({ selectedInstanceId: id });
  },

  getConnectionStatus: (id) => {
    const instance = get().instances.find((i) => i.id === id);
    return instance?.status || "disconnected";
  },

  loadInstances: async () => {
    // TODO: Load from config file
    // For now, return empty
    set({ instances: [] });
  },

  saveInstances: async () => {
    // TODO: Save to config file
  },
}));
