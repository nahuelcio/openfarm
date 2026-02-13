// Ambient type declarations for dynamically loaded providers
import type { ProviderFactory, ProviderMetadata, Provider, ContextMetadata } from "../provider-system/types";

declare module "@openfarm/provider-opencode" {
  export class OpenCodeProviderFactory implements ProviderFactory {
    create(config?: unknown): Provider;
    getMetadata(): ProviderMetadata;
    canCreate(type: string): boolean;
  }
}

declare module "@openfarm/provider-aider" {
  export class AiderProviderFactory implements ProviderFactory {
    create(config?: unknown): Provider;
    getMetadata(): ProviderMetadata;
    canCreate(type: string): boolean;
  }
}

declare module "@openfarm/provider-claude" {
  export class ClaudeProviderFactory implements ProviderFactory {
    create(config?: unknown): Provider;
    getMetadata(): ProviderMetadata;
    canCreate(type: string): boolean;
  }
}

declare module "@openfarm/context" {
  interface ExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
    duration?: number;
  }

  interface LLMExecutor {
    execute(options: {
      task: string;
      workspace: string;
      provider?: string;
      model?: string;
      temperature?: number;
    }): Promise<ExecutionResult>;
  }

  interface ExplorationResult {
    fileStructure: string[];
    packageJson: Record<string, unknown> | null;
    existingInstructions: string[];
    techStack: string[];
    architecture: string;
  }

  interface AgentAnalysisOptions {
    provider?: string;
    model?: string;
  }

  interface GeneratedContextMetadata extends ContextMetadata {
    analyzedAt: string;
    provider: string;
    filesExplored: number;
    [key: string]: unknown;
  }

  interface GeneratedContext {
    agentsMd: string;
    summary: string;
    techStack: string[];
    conventions: string[];
    metadata: GeneratedContextMetadata;
  }

  export class AgentAnalyzer {
    constructor(workspace: string, llmExecutor?: LLMExecutor);
    explore(): Promise<ExplorationResult>;
    analyzeWithAgent(exploration: ExplorationResult, options?: AgentAnalysisOptions): Promise<GeneratedContext>;
  }
}
