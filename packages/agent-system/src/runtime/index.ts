export { DockerRuntime } from "./docker";
export { KubernetesRuntime } from "./kubernetes";
export { LocalRuntime } from "./local";
export type {
  ExecutionRuntime,
  ExecutionRuntimeConfig,
  RuntimeSpawnOptions,
} from "./runtime";
export { WorktreeRuntime } from "./worktree";

import { DockerRuntime } from "./docker";
import { KubernetesRuntime } from "./kubernetes";
import { LocalRuntime } from "./local";
import type { ExecutionRuntime, ExecutionRuntimeConfig } from "./runtime";
import { WorktreeRuntime } from "./worktree";

export function createRuntime(
  config: ExecutionRuntimeConfig
): ExecutionRuntime {
  switch (config.type) {
    case "local":
      return new LocalRuntime();
    case "docker":
      return new DockerRuntime(config);
    case "kubernetes":
      return new KubernetesRuntime(config);
    case "worktree":
      return new WorktreeRuntime(config);
    default:
      throw new Error(`Unsupported runtime type: ${config.type}`);
  }
}
