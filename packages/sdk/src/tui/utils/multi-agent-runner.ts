import {
  type Agent,
  type AgentConfig,
  type AgentStatus,
  useAgentPoolStore,
} from "./agent-pool";
import { type StartExecutionParams, startExecution } from "./execution-runner";

export interface MultiAgentConfig {
  maxParallel?: number;
  stopOnFailure?: boolean;
  onAgentStart?: (agentId: string) => void;
  onAgentProgress?: (agentId: string, progress: Agent["progress"]) => void;
  onAgentComplete?: (agentId: string, result: AgentResult) => void;
  onAgentError?: (agentId: string, error: string) => void;
}

export interface AgentResult {
  success: boolean;
  worktreePath?: string;
  output?: string;
  error?: string;
  durationMs?: number;
  diff?: string;
  filesModified?: string[];
}

class MultiAgentRunner {
  private config: MultiAgentConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: MultiAgentConfig = {}) {
    this.config = {
      maxParallel: 8,
      stopOnFailure: false,
      ...config,
    };
  }

  async runAgents(configs: AgentConfig[]): Promise<string[]> {
    const agentIds: string[] = [];
    const poolStore = useAgentPoolStore.getState();

    for (const config of configs) {
      const agentId = poolStore.spawnAgent(config);

      if (!agentId) {
        console.warn("[MultiAgentRunner] Failed to spawn agent, pool full");
        continue;
      }

      agentIds.push(agentId);
      this.runAgent(agentId, config);
    }

    return agentIds;
  }

  private async runAgent(agentId: string, config: AgentConfig): Promise<void> {
    const poolStore = useAgentPoolStore.getState();
    const abortController = new AbortController();
    this.abortControllers.set(agentId, abortController);

    poolStore.updateAgent(agentId, {
      status: "running",
      startedAt: new Date(),
    });

    this.config.onAgentStart?.(agentId);

    try {
      const { useExecutionRuntimeStore } = await import(
        "../store/execution-runtime-store"
      );
      const { useStore } = await import("../store");

      const runtimeStore = useExecutionRuntimeStore;
      const appStore = useStore;

      const executionId = `exec-${agentId}-${Date.now()}`;

      const params: StartExecutionParams = {
        executionId,
        task: config.task,
        workspace: config.workspace,
        provider: config.provider,
        model: config.model,
        workflowId: config.workflowId || "task_runner",
        externalAgentConfig: config.externalAgentConfig,
        runtimeStore,
        appStore,
      };

      await startExecution(params);

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          const session = runtimeStore.getState().getSession(executionId);
          if (session?.isDone) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
      });

      const session = runtimeStore.getState().getSession(executionId);
      const finalStatus: AgentStatus = abortController.signal.aborted
        ? "aborted"
        : session?.isDone
          ? session.success
            ? "completed"
            : "failed"
          : "failed";

      poolStore.updateAgent(agentId, {
        status: finalStatus,
        completedAt: new Date(),
        durationMs:
          Date.now() -
          (poolStore.getAgent(agentId)?.startedAt?.getTime() || Date.now()),
        output: session?.logs.join("\n"),
        error: session?.categorizedError?.message,
      });

      this.config.onAgentComplete?.(agentId, {
        success: session?.success ?? false,
        output: session?.logs.join("\n"),
        error: session?.categorizedError?.message,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      poolStore.updateAgent(agentId, {
        status: "failed",
        completedAt: new Date(),
        error: errorMessage,
      });

      this.config.onAgentError?.(agentId, errorMessage);
    } finally {
      this.abortControllers.delete(agentId);
    }
  }

  abortAgent(agentId: string): void {
    const controller = this.abortControllers.get(agentId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(agentId);
    }

    const poolStore = useAgentPoolStore.getState();
    const agent = poolStore.getAgent(agentId);

    if (agent && agent.status === "running") {
      poolStore.killAgent(agentId);
    }
  }

  abortAll(): void {
    for (const [agentId] of this.abortControllers) {
      this.abortAgent(agentId);
    }
  }

  getRunningAgents(): Agent[] {
    const poolStore = useAgentPoolStore.getState();
    return poolStore.agents.filter(
      (a) => a.status === "running" || a.status === "pending"
    );
  }
}

let globalRunner: MultiAgentRunner | null = null;

export function getMultiAgentRunner(
  config?: MultiAgentConfig
): MultiAgentRunner {
  if (!globalRunner) {
    globalRunner = new MultiAgentRunner(config);
  }
  return globalRunner;
}

export function createMultiAgentRunner(
  config?: MultiAgentConfig
): MultiAgentRunner {
  return new MultiAgentRunner(config);
}

export async function runAgentsParallel(
  configs: AgentConfig[],
  config?: MultiAgentConfig
): Promise<string[]> {
  const runner = createMultiAgentRunner(config);
  return runner.runAgents(configs);
}
