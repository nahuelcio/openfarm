import {
  buildConfigMap,
  type ConfigEntry,
  getConfigValue,
  getProviderApiKeyFromMap,
  OpenCodeConfigService,
  resolveEnvModel,
  resolveEnvProviderApiKey,
  resolveStepModel,
  resolveStepProvider,
} from "../src/services/opencode-config";

const baseEntries: ConfigEntry[] = [
  { configKey: "server.defaultProvider", configValue: "copilot" },
  { configKey: "server.defaultModel", configValue: "copilot/gpt-4o-mini" },
  { configKey: "tui.defaultProvider", configValue: "copilot" },
  { configKey: "tui.defaultModel", configValue: "copilot/claude-sonnet-4" },
  { configKey: "tui.maxIterations", configValue: 5 },
  { configKey: "tui.timeoutSeconds", configValue: 300 },
  { configKey: "providers.copilot.apiKey", configValue: "base-copilot" },
  { configKey: "providers.copilot.apiBase", configValue: "http://copilot" },
  { configKey: "providers.copilot.token", configValue: "token-123" },
  { configKey: "providers.anthropic.apiKey", configValue: "anthro" },
  { configKey: "providers.openrouter.apiKey", configValue: "router" },
  {
    configKey: "server.overrides.anthropic.apiKey",
    configValue: "server-override",
  },
  {
    configKey: "tui.overrides.copilot.apiKey",
    configValue: "tui-override",
  },
];

describe("OpenCodeConfigService helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("buildConfigMap parses JSON values", () => {
    const entries: ConfigEntry[] = [
      { configKey: "server.defaultProvider", configValue: "copilot" },
      { configKey: "tui.maxIterations", configValue: "5" },
    ];
    const map = buildConfigMap(entries);

    expect(map.get("server.defaultProvider")).toBe("copilot");
    expect(map.get("tui.maxIterations")).toBe(5);
  });

  it("getConfigValue returns default when missing", () => {
    const map = buildConfigMap([]);
    expect(getConfigValue(map, "server.defaultModel", "fallback")).toBe(
      "fallback"
    );
  });

  it("getProviderApiKeyFromMap prefers overrides", () => {
    const map = buildConfigMap(baseEntries);
    expect(getProviderApiKeyFromMap(map, "anthropic", "server")).toBe(
      "server-override"
    );
    expect(getProviderApiKeyFromMap(map, "copilot", "tui")).toBe(
      "tui-override"
    );
  });

  it("resolveEnvProviderApiKey reads provider env", () => {
    process.env.ANTHROPIC_API_KEY = "env-anthropic";
    process.env.OPENROUTER_API_KEY = "env-router";
    process.env.COPILOT_TOKEN = "env-copilot";

    expect(resolveEnvProviderApiKey("anthropic")).toBe("env-anthropic");
    expect(resolveEnvProviderApiKey("openrouter")).toBe("env-router");
    expect(resolveEnvProviderApiKey("copilot")).toBe("env-copilot");
  });

  it("resolveEnvModel returns OPENCODE_DEFAULT_MODEL", () => {
    process.env.OPENCODE_DEFAULT_MODEL = "opencode/grok-code-fast-1";
    expect(resolveEnvModel()).toBe("opencode/grok-code-fast-1");
  });

  it("resolveStepProvider maps opencode to copilot", () => {
    expect(resolveStepProvider({ provider: "opencode" })).toBe("copilot");
    expect(resolveStepProvider({ provider: "claude-code" })).toBeNull();
  });

  it("resolveStepModel uses step model when provided", () => {
    expect(resolveStepModel({ model: "custom" })).toBe("custom");
  });
});

describe("OpenCodeConfigService resolveModel", () => {
  const service = new OpenCodeConfigService({});
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest
      .spyOn(
        service as unknown as { loadConfigMap: () => Promise<unknown> },
        "loadConfigMap"
      )
      .mockResolvedValue(buildConfigMap(baseEntries));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("uses step config when provided", async () => {
    const resolved = await service.resolveModel("tui", {
      provider: "opencode",
      model: "opencode/custom",
    });

    expect(resolved.provider).toBe("copilot");
    expect(resolved.model).toBe("opencode/custom");
  });

  it("uses agent config when provider is opencode", async () => {
    const resolved = await service.resolveModel("server", undefined, {
      provider: "opencode",
      model: "opencode/agent-model",
      id: "cfg",
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(resolved.provider).toBe("copilot");
    expect(resolved.model).toBe("opencode/agent-model");
  });

  it("falls back to env model then default", async () => {
    process.env.OPENCODE_DEFAULT_MODEL = "opencode/env-model";
    const resolved = await service.resolveModel("server");

    expect(resolved.provider).toBe("copilot");
    expect(resolved.model).toBe("opencode/env-model");
  });
});
