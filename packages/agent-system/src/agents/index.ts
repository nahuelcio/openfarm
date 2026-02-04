import type { AgentRegistry } from "../core/registry";
import { AiderAgentFactory } from "./aider";
import { ClaudeCodeAgentFactory } from "./claude-code";
import { OpenCodeAgentFactory } from "./opencode";

export { AiderAgent, AiderAgentFactory } from "./aider";
export { ClaudeCodeAgent, ClaudeCodeAgentFactory } from "./claude-code";
export { GenericCliAgent, GenericCliAgentFactory } from "./generic-cli";
export { OpenCodeAgent, OpenCodeAgentFactory } from "./opencode";

export function registerBuiltinAgents(registry: AgentRegistry): void {
  registry.registerBuiltin(new ClaudeCodeAgentFactory());
  registry.registerBuiltin(new OpenCodeAgentFactory());
  registry.registerBuiltin(new AiderAgentFactory());
}
