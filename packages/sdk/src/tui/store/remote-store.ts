/**
 * Remote Store
 *
 * Manages connections to multiple remote OpenFarm instances.
 */

import { RemoteClient } from "@openfarm/remote-server";
import { create } from "zustand";
import type {
  IRemoteClient,
  RemoteClientHandlers,
  RemoteInstance,
} from "../types/remote";

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

  /** Start remote task loop */
  startTaskLoop: (id: string, config: unknown) => void;

  /** Pause remote task loop */
  pauseTaskLoop: (id: string) => void;

  /** Resume remote task loop */
  resumeTaskLoop: (id: string) => void;

  /** Cancel remote task loop */
  cancelTaskLoop: (id: string) => void;

  /** Request current remote status */
  requestStatus: (id: string) => void;
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
      const handlers: RemoteClientHandlers = {
        onConnect: () => {
          updateInstance(id, { status: "connected", error: undefined });
        },
        onDisconnect: (_reason: string) => {
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
        onEvent: (eventType, data) => {
          const event = data as { sessionId?: string };
          if (
            eventType.startsWith("session.") &&
            event.sessionId &&
            get().selectedInstanceId === id
          ) {
            console.log(`[${instance.name}] event: ${eventType}`);
          }
        },
      };

      const client = new RemoteClient(
        {
          url: instance.url,
          token: instance.token,
        },
        handlers
      );

      await client.connect();
      client.getStatus();
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

  startTaskLoop: (id, config) => {
    const client = get().clients.get(id);
    client?.startTaskLoop(config);
  },

  pauseTaskLoop: (id) => {
    const client = get().clients.get(id);
    client?.pause();
  },

  resumeTaskLoop: (id) => {
    const client = get().clients.get(id);
    client?.resume();
  },

  cancelTaskLoop: (id) => {
    const client = get().clients.get(id);
    client?.cancel();
  },

  requestStatus: (id) => {
    const client = get().clients.get(id);
    client?.getStatus();
  },
}));
