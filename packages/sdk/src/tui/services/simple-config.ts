/**
 * Simple Config Service
 *
 * Persistencia de configuración simple usando filesystem.
 * Reemplaza localStorage que no existe en TUI.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface SimpleConfig {
  task: string;
  workflow: string;
  workspace: string;
  provider: string;
  model: string;
}

const CONFIG_DIR = join(homedir(), ".openfarm");
const CONFIG_FILE = join(CONFIG_DIR, "simple-config.json");

/**
 * Guardar configuración
 */
export function saveConfig(config: SimpleConfig): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("[SimpleConfig] Error saving:", error);
  }
}

/**
 * Cargar configuración
 */
export function loadConfig(): SimpleConfig | null {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return null;
    }
    const data = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as SimpleConfig;
  } catch (error) {
    console.error("[SimpleConfig] Error loading:", error);
    return null;
  }
}

/**
 * Configuración por defecto
 */
export function getDefaultConfig(): SimpleConfig {
  return {
    task: "",
    workflow: "auto",
    workspace: process.cwd(),
    provider: "openai",
    model: "gpt-4o-mini",
  };
}
