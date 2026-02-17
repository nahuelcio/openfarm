/**
 * Tipo de comando detectado en el output
 */
export type CommandType = "MESSAGE" | "SPAWN" | "RELEASE" | "STATUS" | "BRIDGE";

/**
 * Formato en que fue detectado el comando
 */
export type CommandFormat = "inline" | "block" | "fenced";

/**
 * Comando parseado del output de un agente
 */
export interface ParsedCommand {
	/** Tipo de comando detectado */
	type: CommandType;

	/** Destinatario: "sdk:Alice", "frontend:Bob", "*" */
	to: string;

	/** Remitente (extraído del contexto) */
	from?: string;

	/** Cuerpo del mensaje */
	body: string;

	/** Datos estructurados adicionales */
	data?: Record<string, unknown>;

	/** Formato original detectado */
	format: CommandFormat;

	/** Timestamp de detección */
	timestamp: number;

	/** Hash para deduplicación */
	hash: string;
}

/**
 * Resultado del parsing de output
 */
export interface ParseResult {
	/** Comandos detectados */
	commands: ParsedCommand[];

	/** Output limpio (sin los comandos detectados) */
	cleanOutput: string;

	/** Indica si se detectaron comandos */
	hasCommands: boolean;
}

/**
 * Opciones de configuración para el CommandParser
 */
export interface CommandParserOptions {
	/** Prefijo a detectar (default: 'openfarm') */
	prefix?: string;

	/** Incluir compatibilidad con relay */
	relayCompatibility?: boolean;

	/** Ignorar contenido dentro de code fences */
	ignoreCodeFences?: boolean;

	/** Ventana de deduplicación en ms */
	dedupWindow?: number;
}

/**
 * Interface para patterns de detección
 */
export interface Pattern {
	/** Nombre del pattern */
	name: string;

	/** Regex para detectar el comando */
	regex: RegExp;

	/** Parser específico para este pattern */
	parse(match: RegExpMatchArray, format: CommandFormat): ParsedCommand | null;
}
