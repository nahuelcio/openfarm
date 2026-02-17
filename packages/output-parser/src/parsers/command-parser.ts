import {
	blockPattern,
	openfarmFencedPattern,
	openfarmInlinePattern,
	relayPattern,
} from "../patterns";
import type {
	CommandParserOptions,
	ParsedCommand,
	ParseResult,
	Pattern,
} from "../types";
import { stripAnsi } from "../utils/ansi-stripper";
import { isInsideCodeFence } from "../utils/code-fence";
import { DeduplicationSet } from "../utils/dedup";

/**
 * Parser principal para comandos en output de agentes
 *
 * Detecta patrones como:
 * - ->openfarm:destino mensaje
 * - ->relay:destino mensaje
 * - [[OPENFARM]]{"to":"destino","body":"mensaje"}[[/OPENFARM]]
 * - ->openfarm:destino <<<
 *   contenido multi-línea
 *   >>>
 */
export class CommandParser {
	private readonly patterns: Pattern[];
	private readonly dedup: DeduplicationSet;
	private readonly options: Required<CommandParserOptions>;

	constructor(options: CommandParserOptions = {}) {
		this.options = {
			prefix: options.prefix ?? "openfarm",
			relayCompatibility: options.relayCompatibility ?? true,
			ignoreCodeFences: options.ignoreCodeFences ?? true,
			dedupWindow: options.dedupWindow ?? 5000,
		};

		this.dedup = new DeduplicationSet(this.options.dedupWindow);
		this.patterns = this.initializePatterns();
	}

	/**
	 * Inicializa los patterns según la configuración
	 */
	private initializePatterns(): Pattern[] {
		const patterns: Pattern[] = [
			openfarmInlinePattern,
			openfarmFencedPattern,
			blockPattern,
		];

		if (this.options.relayCompatibility) {
			patterns.push(relayPattern);
		}

		return patterns;
	}

	/**
	 * Parsea output completo y extrae comandos
	 *
	 * @param output - Texto del output del agente
	 * @returns Array de comandos parseados
	 */
	parse(output: string): ParsedCommand[] {
		const cleanOutput = this.preprocess(output);
		const commands: ParsedCommand[] = [];
		const seenRanges: Array<{ start: number; end: number }> = [];

		for (const pattern of this.patterns) {
			// Reset regex lastIndex para búsqueda global
			pattern.regex.lastIndex = 0;

			let match: RegExpExecArray | null;
			let iterations = 0;
			const maxIterations = 1000; // Safety limit

			while (
				// biome-ignore lint/suspicious/noAssignInExpressions: necesario para iterar regex global
				(match = pattern.regex.exec(cleanOutput)) !== null &&
				iterations < maxIterations
			) {
				iterations++;
				const start = match.index;
				const end = start + match[0].length;

				// Prevenir loop infinito en matches vacíos
				if (start === end) {
					pattern.regex.lastIndex++;
					continue;
				}

				// Verificar si este rango ya fue procesado por otro pattern
				if (this.isOverlapping(start, end, seenRanges)) {
					continue;
				}

				// Verificar si está dentro de un code fence (si está habilitado)
				if (
					this.options.ignoreCodeFences &&
					isInsideCodeFence(cleanOutput, start)
				) {
					continue;
				}

				const command = pattern.parse(match, this.inferFormat(pattern.name));

				if (command && !this.dedup.checkAndAdd(command.hash)) {
					commands.push(command);
					seenRanges.push({ start, end });
				}
			}
		}

		// Ordenar por posición en el texto
		return commands.sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Parsea una línea individual
	 *
	 * @param line - Línea de texto
	 * @returns Comando parseado o null
	 */
	parseLine(line: string): ParsedCommand | null {
		const commands = this.parse(line);
		return commands.length > 0 ? commands[0] : null;
	}

	/**
	 * Verifica si el output contiene algún comando
	 *
	 * @param output - Texto a verificar
	 * @returns true si contiene comandos
	 */
	hasCommands(output: string): boolean {
		return this.parse(output).length > 0;
	}

	/**
	 * Limpia el output removiendo comandos detectados
	 *
	 * @param output - Texto original
	 * @returns Texto limpio sin comandos
	 */
	cleanOutput(output: string): string {
		const result = this.parseFull(output);
		return result.cleanOutput;
	}

	/**
	 * Parsea y retorna resultado completo con output limpio
	 *
	 * @param output - Texto a parsear
	 * @returns ParseResult con comandos y output limpio
	 */
	parseFull(output: string): ParseResult {
		const cleanOutput = this.preprocess(output);
		const commands = this.parse(output);

		// Construir output limpio removiendo los comandos detectados
		let cleaned = cleanOutput;
		const ranges: Array<{ start: number; end: number }> = [];

		for (const pattern of this.patterns) {
			pattern.regex.lastIndex = 0;

			let match: RegExpExecArray | null;
			let iterations = 0;
			const maxIterations = 1000;

			while (
				// biome-ignore lint/suspicious/noAssignInExpressions: necesario para iterar regex global
				(match = pattern.regex.exec(cleanOutput)) !== null &&
				iterations < maxIterations
			) {
				iterations++;
				const start = match.index;
				const end = start + match[0].length;

				// Prevenir loop infinito
				if (start === end) {
					pattern.regex.lastIndex++;
					continue;
				}

				ranges.push({ start, end });
			}
		}

		// Ordenar de atrás para adelante para no afectar índices
		ranges.sort((a, b) => b.start - a.start);

		for (const range of ranges) {
			cleaned = cleaned.slice(0, range.start) + cleaned.slice(range.end);
		}

		// Limpiar líneas vacías extra
		cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

		return {
			commands,
			cleanOutput: cleaned,
			hasCommands: commands.length > 0,
		};
	}

	/**
	 * Preprocesa el output (strip ANSI, etc.)
	 */
	private preprocess(output: string): string {
		return stripAnsi(output);
	}

	/**
	 * Verifica si un rango se solapa con rangos existentes
	 */
	private isOverlapping(
		start: number,
		end: number,
		ranges: Array<{ start: number; end: number }>,
	): boolean {
		return ranges.some((r) => start < r.end && end > r.start);
	}

	/**
	 * Infiere el formato basado en el nombre del pattern
	 */
	private inferFormat(patternName: string): ParsedCommand["format"] {
		if (patternName.includes("fenced")) {
			return "fenced";
		}
		if (patternName.includes("block")) {
			return "block";
		}
		return "inline";
	}

	/**
	 * Limpia el cache de deduplicación
	 */
	clearCache(): void {
		this.dedup.clear();
	}
}
