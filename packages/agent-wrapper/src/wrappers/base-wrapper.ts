import type { ParsedCommand } from "@openfarm/output-parser";

/**
 * Opciones de configuración para el wrapper
 */
export interface WrapperOptions {
  /** Nombre del agente */
  agentName: string;

  /** Comando CLI a ejecutar (ej: 'claude', 'codex', 'aider') */
  command: string;

  /** Argumentos del comando */
  args?: string[];

  /** Directorio de trabajo */
  workingDirectory?: string;

  /** Variables de entorno */
  env?: Record<string, string>;

  /** Path del socket del daemon */
  daemonSocketPath?: string;

  /** Intervalo de polling en ms (default: 200) */
  pollInterval?: number;

  /** Timeout para idle detection en ms (default: 1500) */
  idleTimeout?: number;
}

/**
 * Handler para eventos de comandos
 */
export type CommandHandler = (command: ParsedCommand) => void | Promise<void>;

/**
 * Handler para eventos de output
 */
export type OutputHandler = (output: string) => void;

/**
 * Handler para evento de salida
 */
export type ExitHandler = (code: number) => void;

/**
 * Interface base para wrappers de agentes
 */
export interface Wrapper {
  /** Iniciar el agente y comenzar monitoreo */
  start(): Promise<void>;

  /** Detener el agente */
  stop(): Promise<void>;

  /** Enviar mensaje al agente */
  sendMessage(message: string): Promise<void>;

  /** Verificar si el agente está corriendo */
  isRunning(): boolean;

  /** Evento: Comando detectado en output */
  onCommand(callback: CommandHandler): void;

  /** Evento: Output crudo del agente */
  onOutput(callback: OutputHandler): void;

  /** Evento: Agente se detuvo */
  onExit(callback: ExitHandler): void;

  /** Remover handler de comandos */
  offCommand(callback: CommandHandler): void;

  /** Remover handler de output */
  offOutput(callback: OutputHandler): void;

  /** Remover handler de exit */
  offExit(callback: ExitHandler): void;
}

/**
 * Clase base abstracta para wrappers
 */
export abstract class BaseWrapper implements Wrapper {
  protected options: WrapperOptions;
  protected commandHandlers: CommandHandler[] = [];
  protected outputHandlers: OutputHandler[] = [];
  protected exitHandlers: ExitHandler[] = [];
  protected running = false;

  constructor(options: WrapperOptions) {
    this.options = {
      args: [],
      workingDirectory: process.cwd(),
      env: {},
      pollInterval: 200,
      idleTimeout: 1500,
      ...options,
    };
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract sendMessage(message: string): Promise<void>;

  isRunning(): boolean {
    return this.running;
  }

  onCommand(callback: CommandHandler): void {
    this.commandHandlers.push(callback);
  }

  onOutput(callback: OutputHandler): void {
    this.outputHandlers.push(callback);
  }

  onExit(callback: ExitHandler): void {
    this.exitHandlers.push(callback);
  }

  offCommand(callback: CommandHandler): void {
    const index = this.commandHandlers.indexOf(callback);
    if (index !== -1) {
      this.commandHandlers.splice(index, 1);
    }
  }

  offOutput(callback: OutputHandler): void {
    const index = this.outputHandlers.indexOf(callback);
    if (index !== -1) {
      this.outputHandlers.splice(index, 1);
    }
  }

  offExit(callback: ExitHandler): void {
    const index = this.exitHandlers.indexOf(callback);
    if (index !== -1) {
      this.exitHandlers.splice(index, 1);
    }
  }

  /**
   * Notifica a los handlers de comandos
   */
  protected async notifyCommand(command: ParsedCommand): Promise<void> {
    for (const handler of this.commandHandlers) {
      try {
        await handler(command);
      } catch (error) {
        console.error("Error in command handler:", error);
      }
    }
  }

  /**
   * Notifica a los handlers de output
   */
  protected notifyOutput(output: string): void {
    for (const handler of this.outputHandlers) {
      try {
        handler(output);
      } catch (error) {
        console.error("Error in output handler:", error);
      }
    }
  }

  /**
   * Notifica a los handlers de exit
   */
  protected notifyExit(code: number): void {
    for (const handler of this.exitHandlers) {
      try {
        handler(code);
      } catch (error) {
        console.error("Error in exit handler:", error);
      }
    }
  }
}
