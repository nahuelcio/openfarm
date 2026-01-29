import type { OpenFarmConfig } from "../../types";

export interface TUIConfig extends OpenFarmConfig {
  theme?: "dark" | "light";
  shortcuts?: {
    newTask?: string;
    history?: string;
    settings?: string;
    dashboard?: string;
    quit?: string;
  };
  ui?: {
    sidebarOpen?: boolean;
    showProgressBar?: boolean;
    maxLogLines?: number;
  };
}

const DEFAULT_CONFIG: TUIConfig = {
  defaultProvider: "opencode",
  defaultModel: "claude-3.5-sonnet",
  theme: "dark",
  shortcuts: {
    newTask: "Ctrl+N",
    history: "Ctrl+H",
    settings: "Ctrl+S",
    dashboard: "Ctrl+D",
    quit: "Ctrl+Q",
  },
  ui: {
    sidebarOpen: true,
    showProgressBar: true,
    maxLogLines: 1000,
  },
};

// Try to load config from file (Node.js only)
async function loadFromFile(): Promise<Partial<TUIConfig> | null> {
  try {
    // Check if we're in Node.js
    if (typeof process === "undefined" || !process.versions?.node) {
      return null;
    }

    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");

    // Try multiple locations
    const paths = [
      // Current directory
      path.resolve(".openfarmrc.json"),
      // Home directory
      path.join(os.homedir(), ".openfarmrc.json"),
      // Config directory
      path.join(os.homedir(), ".config", "openfarm", "config.json"),
    ];

    for (const configPath of paths) {
      try {
        const content = await fs.readFile(configPath, "utf-8");
        const config = JSON.parse(content);
        console.log(`Loaded config from ${configPath}`);
        return config;
      } catch {
        // File doesn't exist or is invalid, try next
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Load config from environment variables
function loadFromEnv(): Partial<TUIConfig> {
  const config: Partial<TUIConfig> = {};

  if (process.env.OPENFARM_API_URL) {
    config.apiUrl = process.env.OPENFARM_API_URL;
  }
  if (process.env.OPENFARM_API_KEY) {
    config.apiKey = process.env.OPENFARM_API_KEY;
  }
  if (process.env.OPENFARM_PROVIDER) {
    config.defaultProvider = process.env.OPENFARM_PROVIDER;
  }
  if (process.env.OPENFARM_MODEL) {
    config.defaultModel = process.env.OPENFARM_MODEL;
  }
  if (process.env.OPENFARM_TIMEOUT) {
    config.timeout = parseInt(process.env.OPENFARM_TIMEOUT, 10);
  }
  if (process.env.OPENFARM_THEME) {
    config.theme = process.env.OPENFARM_THEME as "dark" | "light";
  }

  return config;
}

// Merge configs with priority: env > file > defaults
export async function loadConfig(): Promise<TUIConfig> {
  const fileConfig = await loadFromFile();
  const envConfig = loadFromEnv();

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
  };
}

// Save config to file
export async function saveConfig(config: TUIConfig): Promise<void> {
  try {
    if (typeof process === "undefined" || !process.versions?.node) {
      throw new Error("Cannot save config in browser environment");
    }

    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");

    const configDir = path.join(os.homedir(), ".openfarm");
    await fs.mkdir(configDir, { recursive: true });

    const configPath = path.join(configDir, ".openfarmrc.json");
    
    // Only save certain fields
    const saveableConfig = {
      defaultProvider: config.defaultProvider,
      defaultModel: config.defaultModel,
      apiUrl: config.apiUrl,
      theme: config.theme,
      shortcuts: config.shortcuts,
      ui: config.ui,
    };

    await fs.writeFile(configPath, JSON.stringify(saveableConfig, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save config:", error);
    throw error;
  }
}

// Create default config file
export async function createDefaultConfig(): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const os = await import("os");

  const configDir = path.join(os.homedir(), ".openfarm");
  const configPath = path.join(configDir, ".openfarmrc.json");

  try {
    // Check if file already exists
    await fs.access(configPath);
    console.log("Config file already exists at", configPath);
  } catch {
    // File doesn't exist, create it
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      "utf-8"
    );
    console.log("Created default config at", configPath);
  }
}

// Example config file content
export const EXAMPLE_CONFIG = `{
  // Default AI provider (opencode, claude-code, aider, direct-api)
  "defaultProvider": "opencode",
  
  // Default model to use
  "defaultModel": "claude-3.5-sonnet",
  
  // API configuration (optional)
  "apiUrl": "http://localhost:3000",
  "apiKey": "your-api-key-here",
  
  // UI theme
  "theme": "dark",
  
  // Keyboard shortcuts
  "shortcuts": {
    "newTask": "Ctrl+N",
    "history": "Ctrl+H",
    "settings": "Ctrl+S",
    "dashboard": "Ctrl+D",
    "quit": "Ctrl+Q"
  },
  
  // UI settings
  "ui": {
    "sidebarOpen": true,
    "showProgressBar": true,
    "maxLogLines": 1000
  }
}`;
