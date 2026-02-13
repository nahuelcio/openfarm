/**
 * Opciones para el MessageInjector
 */
export interface MessageInjectorOptions {
  /** Función para enviar keystrokes */
  sendKeysFn: (keys: string) => Promise<void>;
  /** Función para verificar si está idle */
  isIdleFn: () => boolean;
  /** Timeout de espera en ms */
  timeout?: number;
  /** Prefijo del mensaje */
  prefix?: string;
}

/**
 * Inyecta mensajes en una sesión de agente
 *
 * Se asegura de no interrumpir al agente mientras está escribiendo
 */
export class MessageInjector {
  private readonly options: Required<MessageInjectorOptions>;
  private queue: string[] = [];
  private processing = false;

  constructor(options: MessageInjectorOptions) {
    this.options = {
      timeout: 1500,
      prefix: "OpenFarm:",
      ...options,
    };
  }

  /**
   * Envía un mensaje al agente
   *
   * Espera a que esté idle y luego inyecta el mensaje
   */
  async send(message: string): Promise<void> {
    // Agregar a la cola
    this.queue.push(message);

    // Procesar la cola
    await this.processQueue();
  }

  /**
   * Envía múltiples mensajes
   */
  async sendBatch(messages: string[]): Promise<void> {
    for (const message of messages) {
      await this.send(message);
    }
  }

  /**
   * Limpia la cola de mensajes pendientes
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Obtiene el tamaño de la cola
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Verifica si está procesando
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Procesa la cola de mensajes
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift();
        if (!message) {
          continue;
        }

        // Esperar a que esté idle
        const idle = await this.waitForIdle();
        if (!idle) {
          // Timeout, reencolar y salir
          this.queue.unshift(message);
          break;
        }

        // Enviar mensaje formateado
        const formatted = `${this.options.prefix} ${message}`;
        await this.options.sendKeysFn(formatted);
        await this.options.sendKeysFn("Enter");
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Espera a que el agente esté idle
   */
  private async waitForIdle(): Promise<boolean> {
    if (this.options.isIdleFn()) {
      return true;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.options.isIdleFn()) {
          clearInterval(checkInterval);
          clearTimeout(timeoutTimer);
          resolve(true);
        }
      }, 100);

      const timeoutTimer = setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, this.options.timeout);
    });
  }
}
