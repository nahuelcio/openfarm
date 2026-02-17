import type { ParsedCommand, Pattern } from "../types";

/**
 * Genera hash para deduplicación
 */
function generateHash(to: string, body: string, timestamp: number): string {
	const data = `${to}:${body}:${timestamp}`;
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		const char = data.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash;
	}
	return hash.toString(16);
}

/**
 * Pattern block estructurado:
 * [[OPENFARM]]{"to":"Alice","body":"..."}[[/OPENFARM]]
 */
export const OPENFARM_BLOCK_PATTERN =
	/\[\[OPENFARM\]\](.+?)\[\[\/OPENFARM\]\]/gis;

/**
 * Pattern para bloques JSON estructurados
 */
export const blockPattern: Pattern = {
	name: "openfarm-block",
	regex: OPENFARM_BLOCK_PATTERN,
	parse(match: RegExpMatchArray): ParsedCommand | null {
		try {
			const jsonStr = match[1].trim();
			const data = JSON.parse(jsonStr) as {
				to: string;
				body?: string;
				type?: string;
				from?: string;
				data?: Record<string, unknown>;
			};

			if (!data.to) {
				return null;
			}

			const timestamp = Date.now();
			const body = data.body ?? "";

			return {
				type: (data.type as ParsedCommand["type"]) ?? "MESSAGE",
				to: data.to,
				from: data.from,
				body,
				data: data.data,
				format: "block",
				timestamp,
				hash: generateHash(data.to, body, timestamp),
			};
		} catch {
			// JSON inválido, ignorar este match
			return null;
		}
	},
};
