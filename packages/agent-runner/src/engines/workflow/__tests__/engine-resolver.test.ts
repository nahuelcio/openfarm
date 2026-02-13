import type { CodingEngine } from "@openfarm/core/types/adapters";
import type { AgentConfiguration } from "@openfarm/core/types/domain";
import { describe, expect, it, vi } from "vitest";
import {
  buildEngineConfig,
  type EngineConfig,
  type EngineOptions,
  type EngineResolutionContext,
  type EngineResolverServices,
  resolveEngine,
  resolveRuntimeType,
  shouldUseDefaultEngine,
} from "../engine-resolver";
import type { AgentCodeConfig } from "../executors/validation";

describe("Engine Resolver", () => {
  // Test fixtures
  const createDefaultEngineOptions = (
    overrides?: Partial<EngineOptions>
  ): EngineOptions => ({
    provider: "opencode",
    model: "gpt-4",
    previewMode: false,
    chatOnly: false,
    runtimeType: "local",
    mcpServers: [],
    ...overrides,
  });

  const createAgentCodeConfig = (
    overrides?: Partial<AgentCodeConfig>
  ): AgentCodeConfig => ({
    ...overrides,
  });

  const createContext = (
    overrides?: Partial<EngineResolutionContext>
  ): EngineResolutionContext => ({
    agentConfiguration: {
      provider: "opencode",
      model: "gpt-4",
    } as AgentConfiguration,
    ...overrides,
  });

  describe("shouldUseDefaultEngine", () => {
    it("should return true when no overrides are provided", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(true);
    });

    it("should return false when provider is explicitly overridden", () => {
      const config = createAgentCodeConfig({ provider: "claude-code" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ provider: "opencode" });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return true when provider matches default", () => {
      const config = createAgentCodeConfig({ provider: "opencode" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ provider: "opencode" });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(true);
    });

    it("should return false when model is explicitly overridden", () => {
      const config = createAgentCodeConfig({ model: "gpt-5" });
      const context = createContext({
        agentConfiguration: {
          provider: "opencode",
          model: "gpt-4",
        } as AgentConfiguration,
      });
      const defaults = createDefaultEngineOptions({ model: "gpt-4" });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when previewMode is explicitly overridden", () => {
      const config = createAgentCodeConfig({ previewMode: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ previewMode: false });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when readOnly is explicitly overridden", () => {
      const config = createAgentCodeConfig({ readOnly: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ previewMode: false });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when chatOnly is explicitly overridden", () => {
      const config = createAgentCodeConfig({ chatOnly: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ chatOnly: false });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when runtimeType is explicitly overridden", () => {
      const config = createAgentCodeConfig({ runtimeType: "docker" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ runtimeType: "local" });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when worktreePath is explicitly overridden", () => {
      const config = createAgentCodeConfig({ worktreePath: "/custom/path" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({
        worktreePath: "/default/path",
      });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when containerName is explicitly overridden", () => {
      const config = createAgentCodeConfig({
        containerName: "custom-container",
      });
      const context = createContext();
      const defaults = createDefaultEngineOptions({
        containerName: "default-container",
      });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when podName is explicitly overridden", () => {
      const config = createAgentCodeConfig({ podName: "custom-pod" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ podName: "default-pod" });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when namespace is explicitly overridden", () => {
      const config = createAgentCodeConfig({ namespace: "custom-ns" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ namespace: "default-ns" });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when imageName is explicitly overridden", () => {
      const config = createAgentCodeConfig({ imageName: "custom-image" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({
        imageName: "default-image",
      });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return false when ephemeral is explicitly overridden", () => {
      const config = createAgentCodeConfig({ ephemeral: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ ephemeral: false });

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(false);
    });

    it("should return true when multiple undefined values match defaults", () => {
      const config = createAgentCodeConfig({
        provider: undefined,
        model: undefined,
        previewMode: undefined,
      });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = shouldUseDefaultEngine(config, context, defaults);

      expect(result).toBe(true);
    });
  });

  describe("resolveRuntimeType", () => {
    it("should return kubernetes when runtimeType is explicitly set", () => {
      const config = createAgentCodeConfig({ runtimeType: "kubernetes" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("kubernetes");
    });

    it("should return worktree when runtimeType is explicitly set", () => {
      const config = createAgentCodeConfig({ runtimeType: "worktree" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("worktree");
    });

    it("should return docker when runtimeType is explicitly set", () => {
      const config = createAgentCodeConfig({ runtimeType: "docker" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("docker");
    });

    it("should return local when runtimeType is explicitly set", () => {
      const config = createAgentCodeConfig({ runtimeType: "local" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("local");
    });

    it("should return kubernetes when podName is in context", () => {
      const config = createAgentCodeConfig();
      const context = createContext({ podName: "my-pod" });
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("kubernetes");
    });

    it("should return kubernetes when podName is in config", () => {
      const config = createAgentCodeConfig({ podName: "my-pod" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("kubernetes");
    });

    it("should return kubernetes when podName is in defaults", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({ podName: "my-pod" });

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("kubernetes");
    });

    it("should return worktree when worktreePath is in context", () => {
      const config = createAgentCodeConfig();
      const context = createContext({ worktreePath: "/tmp/worktree" });
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("worktree");
    });

    it("should return worktree when worktreePath is in config", () => {
      const config = createAgentCodeConfig({ worktreePath: "/tmp/worktree" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("worktree");
    });

    it("should return worktree when worktreePath is in defaults", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({
        worktreePath: "/tmp/worktree",
      });

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("worktree");
    });

    it("should return docker when containerName is in defaults", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({
        containerName: "my-container",
      });

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("docker");
    });

    it("should return docker when ephemeral is in defaults", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({ ephemeral: true });

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("docker");
    });

    it("should return docker when imageName is in defaults", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({ imageName: "node:18" });

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("docker");
    });

    it("should return docker when containerName is in config", () => {
      const config = createAgentCodeConfig({ containerName: "my-container" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("docker");
    });

    it("should return docker when ephemeral is in config", () => {
      const config = createAgentCodeConfig({ ephemeral: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("docker");
    });

    it("should return docker when imageName is in config", () => {
      const config = createAgentCodeConfig({ imageName: "node:18" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("docker");
    });

    it("should return local when no specific runtime indicators are present", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("local");
    });

    it("should prioritize config runtimeType over podName", () => {
      const config = createAgentCodeConfig({ runtimeType: "local" });
      const context = createContext({ podName: "my-pod" });
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("local");
    });

    it("should prioritize podName over worktreePath", () => {
      const config = createAgentCodeConfig();
      const context = createContext({
        podName: "my-pod",
        worktreePath: "/tmp/worktree",
      });
      const defaults = createDefaultEngineOptions();

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("kubernetes");
    });

    it("should prioritize worktreePath over docker settings", () => {
      const config = createAgentCodeConfig();
      const context = createContext({ worktreePath: "/tmp/worktree" });
      const defaults = createDefaultEngineOptions({
        containerName: "my-container",
      });

      const result = resolveRuntimeType(config, context, defaults);

      expect(result).toBe("worktree");
    });
  });

  describe("buildEngineConfig", () => {
    it("should build basic config with defaults", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults);

      expect(result.provider).toBe("opencode");
      expect(result.model).toBe("gpt-4");
      expect(result.previewMode).toBe(false);
      expect(result.chatOnly).toBe(false);
      expect(result.runtimeType).toBe("local");
    });

    it("should use config provider over context and defaults", () => {
      const config = createAgentCodeConfig({ provider: "claude-code" });
      const context = createContext({
        agentConfiguration: {
          provider: "direct-llm",
          model: "gpt-4",
        } as AgentConfiguration,
      });
      const defaults = createDefaultEngineOptions({ provider: "opencode" });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.provider).toBe("claude-code");
    });

    it("should use context provider when config provider is not set", () => {
      const config = createAgentCodeConfig();
      const context = createContext({
        agentConfiguration: {
          provider: "claude-code",
          model: "gpt-4",
        } as AgentConfiguration,
      });
      const defaults = createDefaultEngineOptions({ provider: "opencode" });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.provider).toBe("claude-code");
    });

    it("should use default provider when no other provider is set", () => {
      const config = createAgentCodeConfig();
      const context = createContext({ agentConfiguration: undefined });
      const defaults = createDefaultEngineOptions({ provider: "opencode" });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.provider).toBe("opencode");
    });

    it("should use additionalOptions provider as fallback", () => {
      const config = createAgentCodeConfig();
      const context = createContext({ agentConfiguration: undefined });
      const defaults = createDefaultEngineOptions({ provider: undefined });

      const result = buildEngineConfig(config, context, defaults, {
        useOpenCode: true,
      });

      expect(result.provider).toBe("opencode");
    });

    it("should use additionalOptions model over config model", () => {
      const config = createAgentCodeConfig({ model: "gpt-4" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults, {
        resolvedModel: "gpt-5",
      });

      expect(result.model).toBe("gpt-5");
    });

    it("should fall back to config model when additionalOptions model is not provided", () => {
      const config = createAgentCodeConfig({ model: "gpt-5" });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ model: "gpt-4" });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.model).toBe("gpt-5");
    });

    it("should fall back to context model when config and additionalOptions model are not provided", () => {
      const config = createAgentCodeConfig();
      const context = createContext({
        agentConfiguration: {
          provider: "opencode",
          model: "gpt-5",
        } as AgentConfiguration,
      });
      const defaults = createDefaultEngineOptions({ model: "gpt-4" });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.model).toBe("gpt-5");
    });

    it("should use previewMode from config when set", () => {
      const config = createAgentCodeConfig({ previewMode: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ previewMode: false });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.previewMode).toBe(true);
    });

    it("should use readOnly as previewMode alias when previewMode is not set", () => {
      const config = createAgentCodeConfig({ readOnly: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ previewMode: false });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.previewMode).toBe(true);
    });

    it("should default previewMode to false when not set anywhere", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({ previewMode: undefined });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.previewMode).toBe(false);
    });

    it("should use chatOnly from config when set", () => {
      const config = createAgentCodeConfig({ chatOnly: true });
      const context = createContext();
      const defaults = createDefaultEngineOptions({ chatOnly: false });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.chatOnly).toBe(true);
    });

    it("should use chatOnly from defaults when config is not set", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({ chatOnly: true });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.chatOnly).toBe(true);
    });

    it("should default chatOnly to false when not set anywhere", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({ chatOnly: undefined });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.chatOnly).toBe(false);
    });

    it("should include worktreePath from config", () => {
      const config = createAgentCodeConfig({ worktreePath: "/custom/path" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults);

      expect(result.worktreePath).toBe("/custom/path");
    });

    it("should include worktreePath from context when config not set", () => {
      const config = createAgentCodeConfig();
      const context = createContext({ worktreePath: "/context/path" });
      const defaults = createDefaultEngineOptions({
        worktreePath: "/default/path",
      });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.worktreePath).toBe("/context/path");
    });

    it("should include worktreePath from defaults when others not set", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({
        worktreePath: "/default/path",
      });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.worktreePath).toBe("/default/path");
    });

    it("should include baseBranch from config", () => {
      const config = createAgentCodeConfig({ baseBranch: "feature-branch" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults);

      expect(result.baseBranch).toBe("feature-branch");
    });

    it("should include baseBranch from context defaultBranch when config not set", () => {
      const config = createAgentCodeConfig();
      const context = createContext({ defaultBranch: "develop" });
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults);

      expect(result.baseBranch).toBe("develop");
    });

    it("should include podName from config", () => {
      const config = createAgentCodeConfig({ podName: "custom-pod" });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults);

      expect(result.podName).toBe("custom-pod");
    });

    it("should include maxIterations from additionalOptions", () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults, {
        maxIterations: 5,
      });

      expect(result.maxIterations).toBe(5);
    });

    it("should include mcpServers from defaults", () => {
      const mcpServers = ["github", "filesystem"];
      const config = createAgentCodeConfig();
      const context = createContext();
      const defaults = createDefaultEngineOptions({ mcpServers });

      const result = buildEngineConfig(config, context, defaults);

      expect(result.mcpServers).toEqual(mcpServers);
    });

    it("should include all runtime options", () => {
      const config = createAgentCodeConfig({
        containerName: "my-container",
        namespace: "my-namespace",
        imageName: "node:18",
        ephemeral: true,
      });
      const context = createContext();
      const defaults = createDefaultEngineOptions();

      const result = buildEngineConfig(config, context, defaults);

      expect(result.containerName).toBe("my-container");
      expect(result.namespace).toBe("my-namespace");
      expect(result.imageName).toBe("node:18");
      expect(result.ephemeral).toBe(true);
    });
  });

  describe("resolveEngine", () => {
    it("should reuse existing engine when configuration matches", async () => {
      const mockEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const config = createAgentCodeConfig();
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: mockEngine,
        defaultEngineOptions: createDefaultEngineOptions(),
      };

      const result = await resolveEngine(config, context, services);

      expect(result).toBe(mockEngine);
    });

    it("should create new engine when factory is provided and config differs", async () => {
      const mockEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const newEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const engineFactory = vi.fn().mockReturnValue(newEngine);

      const config = createAgentCodeConfig({ provider: "claude-code" });
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: mockEngine,
        codingEngineFactory: engineFactory,
        defaultEngineOptions: createDefaultEngineOptions({
          provider: "opencode",
        }),
      };

      const result = await resolveEngine(config, context, services);

      expect(result).toBe(newEngine);
      expect(engineFactory).toHaveBeenCalledOnce();
    });

    it("should create new engine when no existing engine", async () => {
      const newEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const engineFactory = vi.fn().mockReturnValue(newEngine);

      const config = createAgentCodeConfig();
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: undefined,
        codingEngineFactory: engineFactory,
        defaultEngineOptions: createDefaultEngineOptions(),
      };

      const result = await resolveEngine(config, context, services);

      expect(result).toBe(newEngine);
      expect(engineFactory).toHaveBeenCalledOnce();
    });

    it("should throw error when no defaultEngineOptions provided", async () => {
      const config = createAgentCodeConfig();
      const context = createContext();
      const services: EngineResolverServices = {
        defaultEngineOptions: undefined,
      };

      await expect(resolveEngine(config, context, services)).rejects.toThrow(
        "defaultEngineOptions service is required for engine resolution"
      );
    });

    it("should throw error when no factory available and engine cannot be reused", async () => {
      const mockEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const config = createAgentCodeConfig({ provider: "claude-code" });
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: mockEngine,
        codingEngineFactory: undefined,
        defaultEngineOptions: createDefaultEngineOptions({
          provider: "opencode",
        }),
      };

      await expect(resolveEngine(config, context, services)).rejects.toThrow(
        "codingEngineFactory is required to create new engine instance"
      );
    });

    it("should pass callbacks to factory when provided in additionalOptions", async () => {
      const newEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const engineFactory = vi.fn().mockReturnValue(newEngine);
      const onLog = vi.fn();
      const onChanges = vi.fn();
      const onChatMessage = vi.fn();

      const config = createAgentCodeConfig({ provider: "claude-code" });
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: undefined,
        codingEngineFactory: engineFactory,
        defaultEngineOptions: createDefaultEngineOptions(),
      };

      await resolveEngine(config, context, services, {
        onLog,
        onChanges,
        onChatMessage,
      });

      expect(engineFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          onLog,
          onChanges,
          onChatMessage,
        })
      );
    });

    it("should pass callbacks from defaults when additionalOptions callbacks not provided", async () => {
      const newEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const engineFactory = vi.fn().mockReturnValue(newEngine);
      const onLog = vi.fn();

      const config = createAgentCodeConfig({ provider: "claude-code" });
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: undefined,
        codingEngineFactory: engineFactory,
        defaultEngineOptions: createDefaultEngineOptions({ onLog }),
      };

      await resolveEngine(config, context, services);

      expect(engineFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          onLog,
        })
      );
    });

    it("should pass resolved model to factory", async () => {
      const newEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const engineFactory = vi.fn().mockReturnValue(newEngine);

      const config = createAgentCodeConfig();
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: undefined,
        codingEngineFactory: engineFactory,
        defaultEngineOptions: createDefaultEngineOptions(),
      };

      await resolveEngine(config, context, services, {
        resolvedModel: "gpt-5",
      });

      expect(engineFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5",
        })
      );
    });

    it("should pass maxIterations to factory", async () => {
      const newEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const engineFactory = vi.fn().mockReturnValue(newEngine);

      const config = createAgentCodeConfig();
      const context = createContext();
      const services: EngineResolverServices = {
        codingEngine: undefined,
        codingEngineFactory: engineFactory,
        defaultEngineOptions: createDefaultEngineOptions(),
      };

      await resolveEngine(config, context, services, { maxIterations: 10 });

      expect(engineFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          maxIterations: 10,
        })
      );
    });

    it("should build correct engine config with all options", async () => {
      const newEngine = { applyChanges: vi.fn() } as unknown as CodingEngine;
      const engineFactory = vi.fn().mockReturnValue(newEngine);

      const config = createAgentCodeConfig({
        provider: "claude-code",
        model: "claude-3-opus",
        previewMode: true,
        chatOnly: true,
        worktreePath: "/tmp/worktree",
        baseBranch: "main",
      });
      const context = createContext({ defaultBranch: "develop" });
      const mcpServers = ["github", "filesystem"];
      const services: EngineResolverServices = {
        codingEngine: undefined,
        codingEngineFactory: engineFactory,
        defaultEngineOptions: createDefaultEngineOptions({
          mcpServers,
          runtimeType: "worktree",
        }),
      };

      await resolveEngine(config, context, services, {
        resolvedModel: "claude-3-opus",
        maxIterations: 5,
      });

      const expectedConfig: Partial<EngineConfig> = {
        provider: "claude-code",
        model: "claude-3-opus",
        previewMode: true,
        chatOnly: true,
        runtimeType: "worktree",
        worktreePath: "/tmp/worktree",
        baseBranch: "main",
        mcpServers,
        maxIterations: 5,
      };

      expect(engineFactory).toHaveBeenCalledWith(
        expect.objectContaining(expectedConfig)
      );
    });
  });
});
