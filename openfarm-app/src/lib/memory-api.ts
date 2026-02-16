import { invoke } from "@tauri-apps/api/core";

// Define types locally since we can't import from Rust directly
export interface CreateMemoryInput {
  title: string;
  content: string;
  tags?: string[];
  bankId?: string;
}

export interface SearchMemoryInput {
  query: string;
  bankIds?: string[];
  limit?: number;
}

export interface MemoryDocument {
  id: string;
  title: string;
  slug: string;
  bankId: string;
  scope: string;
  path: string;
  content: string;
  tags: string[];
  observations: MemoryObservation[];
  relations: MemoryRelation[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryObservation {
  kind: string;
  value: string;
  tags: string[];
}

export interface MemoryRelation {
  type: string;
  target: string;
}

export interface MemoryBankConfig {
  id: string;
  name: string;
  path: string;
  scope: string;
  enabled: boolean;
}

export interface WorkspaceMemoryBinding {
  workspaceId: string;
  rootPath: string;
  sharedBankIds: string[];
}

export interface MemorySystemConfig {
  version: number;
  localBankPath: string;
  globalBanksRoot: string;
  multiWorkspaceEnabled: boolean;
  banks: MemoryBankConfig[];
  workspaces: WorkspaceMemoryBinding[];
}

export interface MemoryAPI {
  // Memory operations
  createMemory(input: CreateMemoryInput): Promise<MemoryDocument>;
  readMemory(id: string): Promise<MemoryDocument | null>;
  searchMemories(input: SearchMemoryInput): Promise<MemoryDocument[]>;

  // Bank management
  listMemoryBanks(): Promise<MemoryBankConfig[]>;
  attachSharedBank(bankId: string, name: string): Promise<MemoryBankConfig>;

  // Multi-workspace
  bindWorkspace(
    workspaceId: string,
    rootPath: string,
    sharedBankIds: string[],
  ): Promise<void>;
  getWorkspaceBindings(): Promise<WorkspaceMemoryBinding[]>;
  setMultiWorkspaceEnabled(enabled: boolean): Promise<void>;
}

export const memoryAPI: MemoryAPI = {
  createMemory: (input: CreateMemoryInput) => invoke("create_memory", { input }),
  readMemory: (id: string) => invoke("read_memory", { id }),
  searchMemories: (input: SearchMemoryInput) => invoke("search_memories", { input }),
  listMemoryBanks: () => invoke("list_memory_banks"),
  attachSharedBank: (bankId: string, name: string) =>
    invoke("attach_shared_bank", { bankId, name }),
  bindWorkspace: (
    workspaceId: string,
    rootPath: string,
    sharedBankIds: string[],
  ) => invoke("bind_workspace", { workspaceId, rootPath, sharedBankIds }),
  getWorkspaceBindings: () => invoke("get_workspace_bindings"),
  setMultiWorkspaceEnabled: (enabled: boolean) =>
    invoke("set_multi_workspace_enabled", { enabled }),
};
