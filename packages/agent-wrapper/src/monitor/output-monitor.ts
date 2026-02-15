import type { CommandParser, ParsedCommand } from "@openfarm/output-parser";

/**
 * Opciones para el OutputMonitor
 */
export interface OutputMonitorOptions {
  /** Función para capturar output */
  captureFn: () => Promise<string>;
  /** Parser de comandos */
  parser: CommandParser;
  /** Intervalo de polling en ms */
  interval?: number;
  /** Callback para nuevos comandos */
  onCommand?: (command: ParsedCommand) => void;
  /** Callback para output crudo */
  onOutput?: (output: string) => void;
  /** Callback cuando hay error */
  onError?: (error: Error) => void;
}

/**
 * Monitorea output de un proceso y detecta comandos
 */
export class OutputMonitor {
  private readonly options: Required<OutputMonitorOptions>;
  private timer?: ReturnType<typeof setInterval>;
  private lastOutput = "";
  private lastHash = "";
  private running = false;

  constructor(options: OutputMonitorOptions) {
    this.options = {
      interval: 200,
      onCommand: () => {},
      onOutput: () => {},
      onError: () => {},
      ...options,
    };
  }

  /**
   * Inicia el monitoreo
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.timer = setInterval(() => {
      this.checkOutput().catch((error) => {
        this.options.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      });
    }, this.options.interval);
  }

  /**
   * Detiene el monitoreo
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Verifica si está corriendo
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Fuerza una verificación inmediata
   */
  async checkNow(): Promise<void> {
    await this.checkOutput();
  }

  /**
   * Obtiene el último output capturado
   */
  getLastOutput(): string {
    return this.lastOutput;
  }

  /**
   * Limpia el buffer de output
   */
  clearBuffer(): void {
    this.lastOutput = "";
    this.lastHash = "";
  }

  /**
   * Verifica el output y notifica cambios
   */
  private async checkOutput(): Promise<void> {
    try {
      const output = await this.options.captureFn();
      const hash = this.simpleHash(output);

      if (hash === this.lastHash) {
        return; // Sin cambios
      }

      this.lastHash = hash;

      // Calcular delta
      const freshContent = output.slice(this.lastOutput.length);
      this.lastOutput = output;

      // Notificar output nuevo
      if (freshContent.trim()) {
        this.options.onOutput(freshContent);
      }

      // Parsear comandos
      const commands = this.options.parser.parse(freshContent);
      for (const command of commands) {
        this.options.onCommand(command);
      }
    } catch (error) {
      this.options.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Hash simple para comparar outputs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }
    return hash.toString(16);
  }
}
