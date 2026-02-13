/**
 * Unit tests for the Remote Store (useRemoteStore).
 *
 * Tests instance management (add, remove, update), connection handling,
 * instance selection, and task loop control operations.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IRemoteClient, RemoteInstance } from "../../types/remote";

// Mock modules BEFORE importing the store
// Note: The remote-store.ts imports from @openfarm/core (which is incorrect),
// so we need to mock the missing exports there
vi.mock("@openfarm/core/db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  getRemoteInstances: vi.fn().mockResolvedValue([]),
  saveRemoteInstances: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@openfarm/remote-server", () => ({
  RemoteClient: class {
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn();
    startTaskLoop = vi.fn();
    pause = vi.fn();
    resume = vi.fn();
    cancel = vi.fn();
    getStatus = vi.fn();
    getState = vi.fn().mockReturnValue({ status: "connected" });
    isConnected = vi.fn().mockReturnValue(true);
  },
}));

// Import the store AFTER mocks are set up
const { useRemoteStore } = await import("../remote-store");

describe("useRemoteStore", () => {
  // Reset store to initial state before each test
  beforeEach(() => {
    useRemoteStore.setState({
      instances: [],
      selectedInstanceId: undefined,
      clients: new Map(),
    });
  });

  describe("Initial State", () => {
    it("should initialize with empty instances array", () => {
      expect(useRemoteStore.getState().instances).toEqual([]);
    });

    it("should initialize with undefined selected instance", () => {
      expect(useRemoteStore.getState().selectedInstanceId).toBeUndefined();
    });

    it("should initialize with empty clients map", () => {
      expect(useRemoteStore.getState().clients.size).toBe(0);
    });
  });

  describe("addInstance", () => {
    it("should add a new instance with disconnected status", () => {
      const { addInstance } = useRemoteStore.getState();

      const newInstance: Omit<RemoteInstance, "status"> = {
        id: "instance-1",
        name: "Test Instance",
        url: "ws://localhost:8080",
        token: "secret-token",
      };

      addInstance(newInstance);

      const instances = useRemoteStore.getState().instances;
      expect(instances).toHaveLength(1);
      expect(instances[0]).toMatchObject({
        ...newInstance,
        status: "disconnected",
      });
    });

    it("should add multiple instances", () => {
      const { addInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      addInstance({
        id: "instance-2",
        name: "Instance 2",
        url: "ws://localhost:8081",
      });

      expect(useRemoteStore.getState().instances).toHaveLength(2);
    });

    it("should preserve existing instances when adding new ones", () => {
      const { addInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      addInstance({
        id: "instance-2",
        name: "Instance 2",
        url: "ws://localhost:8081",
      });

      const instances = useRemoteStore.getState().instances;
      expect(instances[0].id).toBe("instance-1");
      expect(instances[1].id).toBe("instance-2");
    });

    it("should handle instance without optional token", () => {
      const { addInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Public Instance",
        url: "ws://localhost:8080",
      });

      const instance = useRemoteStore.getState().instances[0];
      expect(instance.token).toBeUndefined();
      expect(instance.status).toBe("disconnected");
    });
  });

  describe("removeInstance", () => {
    it("should remove an instance by id", () => {
      const { addInstance, removeInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      addInstance({
        id: "instance-2",
        name: "Instance 2",
        url: "ws://localhost:8081",
      });

      removeInstance("instance-1");

      const instances = useRemoteStore.getState().instances;
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe("instance-2");
    });

    it("should clear selected instance when removing selected instance", () => {
      const { addInstance, selectInstance, removeInstance } =
        useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      selectInstance("instance-1");
      expect(useRemoteStore.getState().selectedInstanceId).toBe("instance-1");

      removeInstance("instance-1");

      expect(useRemoteStore.getState().selectedInstanceId).toBeUndefined();
    });

    it("should not affect selected instance when removing different instance", () => {
      const { addInstance, selectInstance, removeInstance } =
        useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      addInstance({
        id: "instance-2",
        name: "Instance 2",
        url: "ws://localhost:8081",
      });

      selectInstance("instance-1");
      removeInstance("instance-2");

      expect(useRemoteStore.getState().selectedInstanceId).toBe("instance-1");
    });

    it("should disconnect before removing if connected", () => {
      const { addInstance, removeInstance } = useRemoteStore.getState();

      // Add instance and simulate connection
      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      // Mock a connected client
      const mockClient = {
        disconnect: vi.fn(),
      } as unknown as IRemoteClient;

      useRemoteStore.setState({
        clients: new Map([["instance-1", mockClient]]),
      });

      removeInstance("instance-1");

      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it("should handle removing non-existent instance gracefully", () => {
      const { removeInstance } = useRemoteStore.getState();

      // Should not throw
      expect(() => removeInstance("non-existent")).not.toThrow();
      expect(useRemoteStore.getState().instances).toHaveLength(0);
    });
  });

  describe("updateInstance", () => {
    it("should update instance properties", () => {
      const { addInstance, updateInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Old Name",
        url: "ws://localhost:8080",
      });

      updateInstance("instance-1", { name: "New Name" });

      const instance = useRemoteStore.getState().instances[0];
      expect(instance.name).toBe("New Name");
      expect(instance.url).toBe("ws://localhost:8080"); // Unchanged
    });

    it("should update multiple properties at once", () => {
      const { addInstance, updateInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
        token: "old-token",
      });

      updateInstance("instance-1", {
        name: "Updated Instance",
        url: "ws://localhost:9090",
        token: "new-token",
      });

      const instance = useRemoteStore.getState().instances[0];
      expect(instance.name).toBe("Updated Instance");
      expect(instance.url).toBe("ws://localhost:9090");
      expect(instance.token).toBe("new-token");
    });

    it("should update status property", () => {
      const { addInstance, updateInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      const statuses: RemoteInstance["status"][] = [
        "disconnected",
        "connecting",
        "connected",
        "error",
        "reconnecting",
      ];

      for (const status of statuses) {
        updateInstance("instance-1", { status });
        expect(useRemoteStore.getState().instances[0].status).toBe(status);
      }
    });

    it("should not affect other instances when updating", () => {
      const { addInstance, updateInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      addInstance({
        id: "instance-2",
        name: "Instance 2",
        url: "ws://localhost:8081",
      });

      updateInstance("instance-1", { name: "Updated" });

      expect(useRemoteStore.getState().instances[1].name).toBe("Instance 2");
    });

    it("should handle updating non-existent instance gracefully", () => {
      const { updateInstance } = useRemoteStore.getState();

      // Should not throw
      expect(() =>
        updateInstance("non-existent", { name: "New Name" })
      ).not.toThrow();
      expect(useRemoteStore.getState().instances).toHaveLength(0);
    });

    it("should update error property", () => {
      const { addInstance, updateInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      updateInstance("instance-1", {
        status: "error",
        error: "Connection failed",
      });

      const instance = useRemoteStore.getState().instances[0];
      expect(instance.error).toBe("Connection failed");
    });

    it("should update session and systemInfo", () => {
      const { addInstance, updateInstance } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      const session = { id: "session-1", status: "active" };
      const systemInfo = {
        hostname: "test-host",
        platform: "linux",
        version: "1.0.0",
      };

      updateInstance("instance-1", { session, systemInfo });

      const instance = useRemoteStore.getState().instances[0];
      expect(instance.session).toEqual(session);
      expect(instance.systemInfo).toEqual(systemInfo);
    });
  });

  describe("selectInstance", () => {
    it("should set selected instance id", () => {
      const { selectInstance } = useRemoteStore.getState();

      selectInstance("instance-1");
      expect(useRemoteStore.getState().selectedInstanceId).toBe("instance-1");
    });

    it("should change selected instance", () => {
      const { selectInstance } = useRemoteStore.getState();

      selectInstance("instance-1");
      selectInstance("instance-2");

      expect(useRemoteStore.getState().selectedInstanceId).toBe("instance-2");
    });

    it("should allow deselecting by passing undefined", () => {
      const { selectInstance } = useRemoteStore.getState();

      selectInstance("instance-1");
      selectInstance(undefined);

      expect(useRemoteStore.getState().selectedInstanceId).toBeUndefined();
    });
  });

  describe("getConnectionStatus", () => {
    it("should return disconnected for non-existent instance", () => {
      const { getConnectionStatus } = useRemoteStore.getState();

      const status = getConnectionStatus("non-existent");
      expect(status).toBe("disconnected");
    });

    it("should return the status of an existing instance", () => {
      const { addInstance, getConnectionStatus } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      expect(getConnectionStatus("instance-1")).toBe("disconnected");
    });

    it("should return updated status after update", () => {
      const { addInstance, updateInstance, getConnectionStatus } =
        useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      updateInstance("instance-1", { status: "connected" });

      expect(getConnectionStatus("instance-1")).toBe("connected");
    });
  });

  describe("Client Management", () => {
    it("should add client to clients map", () => {
      const mockClient = {
        isConnected: vi.fn().mockReturnValue(true),
      } as unknown as IRemoteClient;

      const newClients = new Map([["instance-1", mockClient]]);
      useRemoteStore.setState({ clients: newClients });

      expect(useRemoteStore.getState().clients.has("instance-1")).toBe(true);
    });

    it("should remove client from clients map on disconnect", () => {
      const mockClient = {
        disconnect: vi.fn(),
      } as unknown as IRemoteClient;

      useRemoteStore.setState({
        clients: new Map([["instance-1", mockClient]]),
      });

      const { disconnect } = useRemoteStore.getState();
      disconnect("instance-1");

      expect(useRemoteStore.getState().clients.has("instance-1")).toBe(false);
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it("should handle disconnecting non-existent client gracefully", () => {
      const { disconnect } = useRemoteStore.getState();

      // Should not throw
      expect(() => disconnect("non-existent")).not.toThrow();
    });
  });

  describe("Task Loop Control", () => {
    const createMockClient = (): IRemoteClient =>
      ({
        startTaskLoop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        getStatus: vi.fn(),
      }) as unknown as IRemoteClient;

    it("should start task loop on connected client", () => {
      const mockClient = createMockClient();

      useRemoteStore.setState({
        clients: new Map([["instance-1", mockClient]]),
      });

      const { startTaskLoop } = useRemoteStore.getState();
      const config = { tasks: ["task-1"] };

      startTaskLoop("instance-1", config);

      expect(mockClient.startTaskLoop).toHaveBeenCalledWith(config);
    });

    it("should not throw when starting task loop on non-existent client", () => {
      const { startTaskLoop } = useRemoteStore.getState();

      expect(() => startTaskLoop("non-existent", {})).not.toThrow();
    });

    it("should pause task loop on connected client", () => {
      const mockClient = createMockClient();

      useRemoteStore.setState({
        clients: new Map([["instance-1", mockClient]]),
      });

      const { pauseTaskLoop } = useRemoteStore.getState();
      pauseTaskLoop("instance-1");

      expect(mockClient.pause).toHaveBeenCalled();
    });

    it("should resume task loop on connected client", () => {
      const mockClient = createMockClient();

      useRemoteStore.setState({
        clients: new Map([["instance-1", mockClient]]),
      });

      const { resumeTaskLoop } = useRemoteStore.getState();
      resumeTaskLoop("instance-1");

      expect(mockClient.resume).toHaveBeenCalled();
    });

    it("should cancel task loop on connected client", () => {
      const mockClient = createMockClient();

      useRemoteStore.setState({
        clients: new Map([["instance-1", mockClient]]),
      });

      const { cancelTaskLoop } = useRemoteStore.getState();
      cancelTaskLoop("instance-1");

      expect(mockClient.cancel).toHaveBeenCalled();
    });

    it("should request status on connected client", () => {
      const mockClient = createMockClient();

      useRemoteStore.setState({
        clients: new Map([["instance-1", mockClient]]),
      });

      const { requestStatus } = useRemoteStore.getState();
      requestStatus("instance-1");

      expect(mockClient.getStatus).toHaveBeenCalled();
    });
  });

  describe("Connect/Disconnect Integration", () => {
    it("should throw error when connecting to non-existent instance", async () => {
      const { connect } = useRemoteStore.getState();

      await expect(connect("non-existent")).rejects.toThrow(
        "Instance not found: non-existent"
      );
    });

    it("should update instance status to connecting when connect is called", async () => {
      const { addInstance, connect } = useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      // Start connection (mock resolves successfully)
      const connectPromise = connect("instance-1");

      // Check that status was updated to connecting
      expect(useRemoteStore.getState().instances[0].status).toBe("connecting");

      // Wait for connection to complete (mock resolves)
      await expect(connectPromise).resolves.toBeUndefined();
    });

    it("should clear error when starting to connect", async () => {
      const { addInstance, updateInstance, connect } =
        useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      updateInstance("instance-1", {
        status: "error",
        error: "Previous error",
      });

      // Start connection
      const connectPromise = connect("instance-1");

      // Error should be cleared
      expect(useRemoteStore.getState().instances[0].error).toBeUndefined();

      // Mock resolves successfully
      await expect(connectPromise).resolves.toBeUndefined();
    });

    it("should set status to disconnected on disconnect", () => {
      const { addInstance, updateInstance, disconnect } =
        useRemoteStore.getState();

      addInstance({
        id: "instance-1",
        name: "Instance 1",
        url: "ws://localhost:8080",
      });

      updateInstance("instance-1", { status: "connected" });
      disconnect("instance-1");

      expect(useRemoteStore.getState().instances[0].status).toBe(
        "disconnected"
      );
    });
  });
});
