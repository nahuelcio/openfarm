/**
 * Default port configurations
 * Centralized port definitions to avoid hardcoded values
 */

export const DEFAULT_PORTS = {
  /** OpenCode server default port */
  OPENCODE: 4096,

  /** Backend API server default port */
  BACKEND: 3001,

  /** Vite development server default port */
  VITE_DEV: 5173,

  /** Inngest server default port */
  INNGEST: 8288,

  /** Copilot API default port */
  COPILOT_API: 4141,

  /** Vault server default port */
  VAULT: 8200,

  /** Ollama server default port */
  OLLAMA: 11_434,
} as const;

export const DEFAULT_HOSTS = {
  /** Default localhost IP */
  LOCALHOST: "127.0.0.1",

  /** Default localhost hostname */
  LOCALHOST_NAME: "localhost",
} as const;

export const DEFAULT_TIMEOUTS = {
  /** Default request timeout (10 minutes) */
  REQUEST: 600_000,

  /** Default connection timeout (30 seconds) */
  CONNECTION: 30_000,

  /** Default SSE reconnect delay (3 seconds) */
  SSE_RECONNECT: 3000,
} as const;
