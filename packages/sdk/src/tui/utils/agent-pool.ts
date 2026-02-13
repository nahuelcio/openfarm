/**
 * Agent Pool Manager
 *
 * Manages multiple AI coding agents running in parallel.
 * Each agent gets isolated workspace, lifecycle tracking, and resource limits.
 */

import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

export type AgentStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "killed"
  | "aborted";

export interface AgentConfig {
  task: string;
  workspace: string;
  provider: string;
  model?: string;
  workflowId?: string;
  branchName?: string;
  externalAgentConfig?: {
    cli: string;
    args: string;
    agentName: string;
  };
}

export interface Agent {
  id: string;
  config: AgentConfig;
  status: AgentStatus;
  worktreePath?: string;
  branchName?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  output?: string;
  error?: string;
  progress?: {
    currentStep: string;
    stepProgress: { current: number; total: number };
  };
  retryCount: number;
}

export interface AgentPoolConfig {
  maxAgents: number;
  defaultCleanupDays: number;
}

interface AgentPoolState {
  agents: Agent[];
  config: AgentPoolConfig;

  // Actions
  spawnAgent: (config: AgentConfig) => string | null;
  killAgent: (agentId: string) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  getAgent: (agentId: string) => Agent | undefined;
  getStatus: () => Agent[];
  getRunningCount: () => number;
  cleanupAgent: (agentId: string) => void;
  cleanupAll: () => void;
  reset: () => void;
}

const DEFAULT_CONFIG: AgentPoolConfig = {
  maxAgents: 8,
  defaultCleanupDays: 7,
};

export const useAgentPoolStore = create<AgentPoolState>((set, get) => ({
  agents: [],
  config: DEFAULT_CONFIG,

  spawnAgent: (config: AgentConfig) => {
    const state = get();
    const runningCount = state.agents.filter(
      (a) => a.status === "running" || a.status === "pending"
    ).length;

    if (runningCount >= state.config.maxAgents) {
      console.error(
        `[AgentPool] Max agents reached (${state.config.maxAgents})`
      );
      return null;
    }

    const agentId = `agent-${uuidv4()}`;
    const branchName = config.branchName || `openfarm-${agentId.slice(-8)}`;

    const newAgent: Agent = {
      id: agentId,
      config: {
        ...config,
        branchName,
      },
      status: "pending",
      branchName,
      createdAt: new Date(),
      retryCount: 0,
    };

    set((state) => ({
      agents: [...state.agents, newAgent],
    }));

    return agentId;
  },

  killAgent: (agentId: string) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              status: "killed" as AgentStatus,
              completedAt: new Date(),
              durationMs: agent.startedAt
                ? Date.now() - agent.startedAt.getTime()
                : undefined,
            }
          : agent
      ),
    }));
  },

  updateAgent: (agentId: string, updates: Partial<Agent>) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      ),
    }));
  },

  getAgent: (agentId: string) => {
    return get().agents.find((a) => a.id === agentId);
  },

  getStatus: () => {
    return get().agents;
  },

  getRunningCount: () => {
    return get().agents.filter(
      (a) => a.status === "running" || a.status === "pending"
    ).length;
  },

  cleanupAgent: (agentId: string) => {
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== agentId),
    }));
  },

  cleanupAll: () => {
    set({ agents: [] });
  },

  reset: () => {
    set({ agents: [], config: DEFAULT_CONFIG });
  },
}));

// Utility functions
export function getAgentStats(agents: Agent[]): {
  total: number;
  running: number;
  completed: number;
  failed: number;
  pending: number;
  killed: number;
} {
  return {
    total: agents.length,
    running: agents.filter((a) => a.status === "running").length,
    completed: agents.filter((a) => a.status === "completed").length,
    failed: agents.filter((a) => a.status === "failed").length,
    pending: agents.filter((a) => a.status === "pending").length,
    killed: agents.filter((a) => a.status === "killed").length,
  };
}

export function canSpawnAgent(store: AgentPoolState): boolean {
  const runningCount = store.agents.filter(
    (a) => a.status === "running" || a.status === "pending"
  ).length;
  return runningCount < store.config.maxAgents;
}
