import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  AgentDetectResult,
  AgentPlugin,
  AgentPluginConfig,
  AgentPluginFactory,
  AgentPluginMeta,
  RegisteredPlugin,
} from "./types";

export interface PluginLoadResult {
  pluginId: string;
  loaded: boolean;
  error?: string;
}

export class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private readonly plugins: Map<string, RegisteredPlugin> = new Map();

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  async getInstance(config: AgentPluginConfig): Promise<AgentPlugin> {
    const entry = this.plugins.get(config.id);
    if (!entry) {
      throw new Error(`Agent plugin '${config.id}' not found`);
    }
    const instance = entry.factory.create(config.config);
    await instance.initialize(config.config ?? {});
    return instance;
  }

  registerBuiltin(factory: AgentPluginFactory): void {
    this.register(factory, true);
  }

  register(factory: AgentPluginFactory, isBuiltin = false): void {
    const meta = factory.getMeta();
    if (this.plugins.has(meta.id)) {
      throw new Error(`Agent plugin '${meta.id}' is already registered`);
    }
    this.plugins.set(meta.id, { meta, factory, isBuiltin });
  }

  async discoverUserPlugins(): Promise<PluginLoadResult[]> {
    const baseDir =
      process.env.OPENFARM_AGENT_PLUGIN_DIR ||
      resolve(
        process.env.HOME || process.env.USERPROFILE || "",
        ".config/openfarm/plugins/agents"
      );

    if (!(baseDir && existsSync(baseDir))) {
      return [];
    }

    const entries = await readdir(baseDir, { withFileTypes: true });
    const results: PluginLoadResult[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const pluginPath = resolve(baseDir, entry.name, "index.js");
      if (!existsSync(pluginPath)) {
        results.push({
          pluginId: entry.name,
          loaded: false,
          error: "index.js not found",
        });
        continue;
      }

      try {
        const mod = await import(pathToFileURL(pluginPath).toString());
        const factory = mod?.default as AgentPluginFactory | undefined;
        if (!factory || typeof factory.getMeta !== "function") {
          results.push({
            pluginId: entry.name,
            loaded: false,
            error: "Default export is not a valid AgentPluginFactory",
          });
          continue;
        }
        this.register(factory, false);
        results.push({ pluginId: factory.getMeta().id, loaded: true });
      } catch (error) {
        results.push({
          pluginId: entry.name,
          loaded: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  async detectAvailableAgents(): Promise<AgentDetectResult[]> {
    const results: AgentDetectResult[] = [];
    for (const plugin of this.plugins.values()) {
      const instance = plugin.factory.create();
      results.push(await instance.detect());
    }
    return results;
  }

  createInstance(pluginId: string): AgentPlugin | undefined {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return undefined;
    }
    return entry.factory.create();
  }

  getRegisteredPlugins(): AgentPluginMeta[] {
    return Array.from(this.plugins.values()).map((plugin) => plugin.meta);
  }

  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }
}
