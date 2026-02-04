import { exec } from "node:child_process";
import { promisify } from "node:util";
import { CommandParser } from "@openfarm/output-parser";
import { BaseWrapper, type WrapperOptions } from "./base-wrapper";

const execAsync = promisify(exec);

/**
 * Wrapper que usa tmux para ejecutar y monitorear agentes CLI
 *
 * Este wrapper crea una sesión tmux, ejecuta el CLI dentro,
 * y monitorea el output capturando el pane periódicamente.
 */
export class TmuxWrapper extends BaseWrapper {
  private readonly sessionName: string;
  private readonly parser: CommandParser;
  private pollTimer?: ReturnType<typeof setInterval>;
  private lastOutput = "";
  private lastOutputHash = "";
  private idleTimer?: ReturnType<typeof setTimeout>;
  private isIdle = true;

  constructor(options: WrapperOptions) {
    super(options);
    this.sessionName = `openfarm-${options.agentName}`;
    this.parser = new CommandParser({
      relayCompatibility: true,
      ignoreCodeFences: true,
    });
  }

  /**
   * Verifica si tmux está instalado
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await execAsync("tmux -V");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crea una sesión tmux y ejecuta el agente CLI
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error(`Agent ${this.options.agentName} is already running`);
    }

    // Verificar que tmux esté disponible
    const available = await TmuxWrapper.isAvailable();
    if (!available) {
      throw new Error("tmux is not installed or not in PATH");
    }

    // Matar sesión existente si existe
    await this.killSessionIfExists();

    // Crear nueva sesión tmux
    await this.createSession();

    // Iniciar polling
    this.startPolling();

    this.running = true;
  }

  /**
   * Detiene el agente y la sesión tmux
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.stopPolling();
    await this.killSessionIfExists();
    this.running = false;
    this.notifyExit(0);
  }

  /**
   * Envía un mensaje al agente
   *
   * Espera a que el agente esté idle antes de enviar
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.running) {
      throw new Error("Agent is not running");
    }

    // Esperar a que esté idle
    const idle = await this.waitForIdle(this.options.idleTimeout);
    if (!idle) {
      throw new Error("Agent is busy, timeout waiting for idle");
    }

    // Formatear y enviar mensaje
    const formattedMessage = `OpenFarm: ${message}`;
    await this.sendKeys(formattedMessage);
    await this.sendKeys("Enter");
  }

  /**
   * Crea la sesión tmux
   */
  private async createSession(): Promise<void> {
    const { command, args = [], workingDirectory, env } = this.options;

    // Crear sesión detached
    const createCmd = `tmux new-session -d -s ${this.sessionName} -c "${workingDirectory}"`;
    await execAsync(createCmd, { env: { ...process.env, ...env } });

    // Construir comando completo
    const fullCommand = [command, ...args].join(" ");

    // Enviar comando a la sesión
    await this.sendKeys(fullCommand);
    await this.sendKeys("Enter");
  }

  /**
   * Mata la sesión tmux si existe
   */
  private async killSessionIfExists(): Promise<void> {
    try {
      await execAsync(`tmux kill-session -t ${this.sessionName} 2>/dev/null`);
    } catch {
      // Ignorar errores (sesión no existe)
    }
  }

  /**
   * Envía keystrokes a la sesión tmux
   */
  private async sendKeys(keys: string): Promise<void> {
    // Escapar caracteres especiales para tmux
    const escaped = keys.replace(/"/g, '\\"');
    await execAsync(`tmux send-keys -t ${this.sessionName} "${escaped}"`);
  }

  /**
   * Inicia el polling del output
   */
  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.pollOutput().catch((error) => {
        console.error("Error polling output:", error);
      });
    }, this.options.pollInterval);
  }

  /**
   * Detiene el polling
   */
  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  /**
   * Captura y parsea el output del pane
   */
  private async pollOutput(): Promise<void> {
    try {
      const { stdout } = await execAsync(
        `tmux capture-pane -p -J -S - -t ${this.sessionName} 2>/dev/null || echo ""`
      );

      // Verificar si cambió el output
      const outputHash = await this.hashString(stdout);
      if (outputHash === this.lastOutputHash) {
        // No hay cambios, marcar como idle
        this.markIdle();
        return;
      }

      // Hay nuevo output
      this.markActive();
      this.lastOutputHash = outputHash;

      // Calcular delta (solo el nuevo contenido)
      const newContent = stdout.slice(this.lastOutput.length);
      this.lastOutput = stdout;

      // Notificar output crudo
      if (newContent.trim()) {
        this.notifyOutput(newContent);
      }

      // Parsear comandos
      const commands = this.parser.parse(newContent);
      for (const command of commands) {
        await this.notifyCommand(command);
      }
    } catch (_error) {
      // Si la sesión no existe, el agente murió
      if (!(await this.sessionExists())) {
        this.running = false;
        this.stopPolling();
        this.notifyExit(1);
      }
    }
  }

  /**
   * Verifica si la sesión tmux existe
   */
  private async sessionExists(): Promise<boolean> {
    try {
      await execAsync(`tmux has-session -t ${this.sessionName}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Espera a que el agente esté idle
   */
  private async waitForIdle(timeout = 1500): Promise<boolean> {
    if (this.isIdle) {
      return true;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isIdle) {
          clearInterval(checkInterval);
          clearTimeout(timeoutTimer);
          resolve(true);
        }
      }, 100);

      const timeoutTimer = setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, timeout);
    });
  }

  /**
   * Marca el agente como activo (escribiendo)
   */
  private markActive(): void {
    this.isIdle = false;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // Después de un tiempo sin cambios, marcar como idle
    this.idleTimer = setTimeout(() => {
      this.isIdle = true;
    }, 500);
  }

  /**
   * Marca el agente como idle
   */
  private markIdle(): void {
    // El timeout en markActive se encarga de esto
  }

  /**
   * Genera un hash simple para un string
   */
  private async hashString(str: string): Promise<string> {
    // En Node.js, usamos un hash simple
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }
    return hash.toString(16);
  }
}
