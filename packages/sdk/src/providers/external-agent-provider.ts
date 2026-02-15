/**
 * External Agent Provider for OpenFarm.
 *
 * Este provider permite integrar agentes CLI externos (Claude, Codex, Aider, etc.)
 * mediante output parsing. No modifica el código del agente externo;
 * en cambio, monitorea su output y detecta comandos de comunicación.
 */

import { createCodingEngine } from "@openfarm/agent-system";
import type {
  ProviderCapabilities,
  ProviderConfig,
} from "../provider-system/types";
import type { ExecutionOptions, ExecutionResult } from "../types";

/**
 * Configuración para External Agent Provider
 */
export interface ExternalAgentConfig extends ProviderConfig {
  type: "external-agent";

  /** CLI a ejecutar (claude, codex, gemini, aider, etc.) */
  cli: string;

  /** Argumentos adicionales */
  args?: string[];

  /** Detectar automáticamente comandos de relay */
  relayCompatibility?: boolean;

  /** Modo de inyección de mensajes */
  injectionMode?: "auto" | "manual" | "disabled";

  /** Tiempo de espera para idle detection (ms) */
  idleTimeout?: number;

  /** Intervalo de polling en ms */
  pollInterval?: number;
}

/**
 * Handler para mensajes recibidos de otros agentes
 */
export type MessageHandler = (message: {
  from: string;
  body: string;
  data?: Record<string, unknown>;
}) => void | Promise<void>;

/**
 * Provider para agentes externos basado en Output Parsing.
 *
 * Este provider NO llama a APIs directamente. En cambio:
 * 1. Ejecuta el CLI externo en una sesión tmux
 * 2. Monitorea su output buscando comandos
 * 3. Cuando detecta un comando, lo envía al sistema
 * 4. Recibe mensajes de otros agentes vía daemon
 * 5. Inyecta esos mensajes en la sesión del agente
 *
 * @example
 * ```typescript
 * const provider = new ExternalAgentProvider({
 *   name: 'Alice',
 *   cli: 'claude',
 *   args: ['--some-flag'],
 * });
 *
 * await provider.start();
 *
 * // Escuchar mensajes
 * provider.onMessage((msg) => {
 *   console.log(`Mensaje de ${msg.from}: ${msg.body}`);
 * });
 *
 * // Enviar mensaje a otro agente
 * await provider.sendTo('Bob', 'Please review auth.ts');
 * ```
 */
export class ExternalAgentProvider {
  readonly type = "external-agent";
  readonly name = "External Agent Provider";

  private readonly config: ExternalAgentConfig;
  private running = false;
  private readonly messageHandlers: MessageHandler[] = [];

  // Estos serían importados de @openfarm/agent-wrapper
  // Por ahora usamos implementación mock
  private wrapper?: {
    start(): Promise<void>;
    stop(): Promise<void>;
    sendMessage(message: string): Promise<void>;
    isRunning(): boolean;
    onCommand(callback: (cmd: unknown) => void): void;
    onOutput(callback: (output: string) => void): void;
    onExit(callback: (code: number) => void): void;
  };

  constructor(config: ExternalAgentConfig) {
    this.config = {
      args: [],
      relayCompatibility: true,
      injectionMode: "auto",
      idleTimeout: 1500,
      pollInterval: 200,
      ...config,
    };
  }

  /**
   * Inicia el agente y comienza el monitoreo.
   *
   * Esto crea una sesión y ejecuta el CLI especificado.
   * El agente comienza a monitorear el output buscando comandos.
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error(`Agent ${this.config.name} is already running`);
    }

    // Aquí se inicializaría el wrapper del agente
    // Por ahora es una implementación mock
    console.log(`[${this.config.name}] Starting ${this.config.cli}...`);

    // Mock wrapper
    this.wrapper = {
      start: async () => {
        console.log(`[${this.config.name}] Wrapper started`);
      },
      stop: async () => {
        console.log(`[${this.config.name}] Wrapper stopped`);
      },
      sendMessage: async (msg: string) => {
        console.log(`[${this.config.name}] Received: ${msg}`);
      },
      isRunning: () => this.running,
      onCommand: (cb: (cmd: unknown) => void) => {
        // Mock: no hace nada
      },
      onOutput: (cb: (output: string) => void) => {
        // Mock: no hace nada
      },
      onExit: (cb: (code: number) => void) => {
        // Mock: no hace nada
      },
    };

    await this.wrapper.start();

    // Setup handlers
    this.setupHandlers();

    this.running = true;
    console.log(
      `[${this.config.name}] Agent is running and monitoring for commands.`
    );
  }

  /**
   * Detiene el agente.
   */
  async stop(): Promise<void> {
    if (!(this.running && this.wrapper)) {
      return;
    }

    await this.wrapper.stop();
    this.running = false;
  }

  /**
   * Verifica si el agente está corriendo.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Envía un mensaje a otro agente.
   *
   * @param to - Destinatario (ej: "aider:Bob", "frontend:Alice", "*")
   * @param body - Cuerpo del mensaje
   * @param data - Datos adicionales opcionales
   */
  async sendTo(
    to: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    // Formatear comando según el protocolo
    const command = `->openfarm:${to} ${body}`;

    // En un caso real, esto escribiría en la terminal del agente externo
    // para que él lo "escriba" como si fuera el usuario
    console.log(`[${this.config.name}] Would send: ${command}`);

    // Si tenemos wrapper y está corriendo, enviamos mensaje
    if (this.wrapper?.isRunning()) {
      // Nota: esto es para recibir mensajes DE otros agentes
      // no para enviar mensajes A otros agentes
      // El envío real se hace cuando el agente externo escribe el comando
    }
  }

  /**
   * Inyecta un mensaje en el agente.
   *
   * Esto recibe un mensaje de otro agente y lo muestra en la terminal
   * del agente externo.
   *
   * @param from - Remitente del mensaje
   * @param body - Cuerpo del mensaje
   */
  async injectMessage(from: string, body: string): Promise<void> {
    if (!this.wrapper?.isRunning()) {
      throw new Error("Agent is not running");
    }

    const formatted = `OpenFarm from ${from}: ${body}`;
    await this.wrapper.sendMessage(formatted);
  }

  /**
   * Registra un handler para mensajes recibidos.
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Remueve un handler de mensajes.
   */
  offMessage(handler: MessageHandler): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index !== -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * Ejecuta el provider usando el agente CLI generico.
   *
   * Crea un coding engine con output parsing y ejecuta la tarea.
   */
  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Use CLI from options if provided (from TUI), otherwise from config
      const cli = options.cli || this.config.cli;
      const args = options.args || this.config.args || [];
      const agentName = options.agentName || cli;

      // Create the external agent coding engine with output parsing
      const engine = await createCodingEngine({
        provider: "external-agent",
        cli,
        model: options.model,
        args,
        agentName,
        previewMode: false,
        chatOnly: false,
        onLog: options.onLog,
      });

      // Execute the task
      const result = await engine.applyChanges(
        options.task,
        options.workspace || process.cwd()
      );

      const duration = Date.now() - startTime;

      if (result.ok) {
        const summary = result.value;
        return {
          success: true,
          output: summary.summary || "Task completed successfully",
          duration,
        };
      }
      return {
        success: false,
        output: "",
        error: result.error?.message || "Execution failed",
        duration,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        output: "",
        error: `External agent execution failed: ${message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Test if the provider can connect (check if CLI is available).
   */
  async testConnection(): Promise<boolean> {
    try {
      // Check if the CLI command exists
      const { execSync } = await import("node:child_process");
      execSync(`which ${this.config.cli}`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate provider configuration.
   */
  validateConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") {
      return false;
    }
    const cfg = config as ExternalAgentConfig;
    return (
      cfg.type === "external-agent" &&
      typeof cfg.cli === "string" &&
      cfg.cli.length > 0
    );
  }

  /**
   * Obtiene las capacidades del provider.
   */
  getCapabilities(): ProviderCapabilities {
    return {
      executionModes: ["external-cli", "output-parsing"],
      fileTypes: ["*"],
      supportsStreaming: false,
      supportsLocal: true,
      requiresInternet: false,
      features: [
        "cli-monitoring",
        "output-parsing",
        "inter-agent-messaging",
        "relay-compatibility",
      ],
    };
  }

  /**
   * Setup de handlers para el wrapper.
   */
  private setupHandlers(): void {
    if (!this.wrapper) {
      return;
    }

    // Handler para comandos detectados
    this.wrapper.onCommand(async (cmd: unknown) => {
      // Aquí procesaríamos el comando y lo enviaríamos al daemon/router
      console.log(`[${this.config.name}] Command detected:`, cmd);
    });

    // Handler para output crudo
    this.wrapper.onOutput((output: string) => {
      // Podríamos loguear o procesar el output
      console.debug(`[${this.config.name}] Output:`, output.slice(0, 100));
    });

    // Handler para cuando el agente se detiene
    this.wrapper.onExit((code: number) => {
      console.log(`[${this.config.name}] Agent exited with code ${code}`);
      this.running = false;
    });
  }
}

/**
 * Factory para crear ExternalAgentProvider
 */
export function createExternalAgentProvider(
  config: ExternalAgentConfig
): ExternalAgentProvider {
  return new ExternalAgentProvider(config);
}
