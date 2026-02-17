import type { CommandParserOptions, ParsedCommand } from "../types";
import { CommandParser } from "./command-parser";

/**
 * Callback para comandos detectados
 */
export type StreamCommandHandler = (command: ParsedCommand) => void;

/**
 * Opciones para el StreamParser
 */
export interface StreamParserOptions extends CommandParserOptions {
	/** Callback cuando se detecta un comando */
	onCommand?: StreamCommandHandler;
	/** Buffer máximo en caracteres */
	maxBufferSize?: number;
	/** Acumular líneas antes de parsear */
	lineBufferSize?: number;
}

/**
 * Parser para streams en vivo (streaming)
 *
 * Acumula chunks y los parsea línea por línea o por bloques
 */
export class StreamParser {
	private readonly parser: CommandParser;
	private buffer = "";
	private readonly options: Required<StreamParserOptions>;
	private readonly handlers: StreamCommandHandler[] = [];

	constructor(options: StreamParserOptions = {}) {
		this.options = {
			prefix: options.prefix ?? "openfarm",
			relayCompatibility: options.relayCompatibility ?? true,
			ignoreCodeFences: options.ignoreCodeFences ?? true,
			dedupWindow: options.dedupWindow ?? 5000,
			maxBufferSize: options.maxBufferSize ?? 10_000,
			lineBufferSize: options.lineBufferSize ?? 1,
			onCommand: options.onCommand ?? (() => {}),
		};

		this.parser = new CommandParser({
			prefix: this.options.prefix,
			relayCompatibility: this.options.relayCompatibility,
			ignoreCodeFences: this.options.ignoreCodeFences,
			dedupWindow: this.options.dedupWindow,
		});

		if (this.options.onCommand) {
			this.handlers.push(this.options.onCommand);
		}
	}

	/**
	 * Procesa un chunk del stream
	 *
	 * @param chunk - Texto recibido del stream
	 */
	write(chunk: string): void {
		this.buffer += chunk;

		// Limitar tamaño del buffer
		if (this.buffer.length > this.options.maxBufferSize) {
			this.buffer = this.buffer.slice(-this.options.maxBufferSize);
		}

		// Intentar parsear líneas completas
		this.processBuffer();
	}

	/**
	 * Finaliza el parsing y procesa el buffer restante
	 */
	end(): ParsedCommand[] {
		const commands = this.parser.parse(this.buffer);

		for (const command of commands) {
			this.notifyHandlers(command);
		}

		this.buffer = "";
		return commands;
	}

	/**
	 * Registra un handler para comandos detectados
	 *
	 * @param handler - Callback a ejecutar
	 */
	onCommand(handler: StreamCommandHandler): void {
		this.handlers.push(handler);
	}

	/**
	 * Remueve un handler
	 *
	 * @param handler - Callback a remover
	 */
	offCommand(handler: StreamCommandHandler): void {
		const index = this.handlers.indexOf(handler);
		if (index !== -1) {
			this.handlers.splice(index, 1);
		}
	}

	/**
	 * Limpia el buffer interno
	 */
	clear(): void {
		this.buffer = "";
		this.parser.clearCache();
	}

	/**
	 * Obtiene el estado actual del buffer
	 */
	getBuffer(): string {
		return this.buffer;
	}

	/**
	 * Procesa el buffer acumulado
	 */
	private processBuffer(): void {
		// Buscar líneas completas (terminadas en \n)
		const lines = this.buffer.split("\n");

		// La última línea puede estar incompleta
		this.buffer = lines.pop() ?? "";

		for (const line of lines) {
			const command = this.parser.parseLine(line);
			if (command) {
				this.notifyHandlers(command);
			}
		}
	}

	/**
	 * Notifica a todos los handlers registrados
	 */
	private notifyHandlers(command: ParsedCommand): void {
		for (const handler of this.handlers) {
			try {
				handler(command);
			} catch (error) {
				// Silenciar errores en handlers para no romper el stream
				console.error("Error in command handler:", error);
			}
		}
	}
}
