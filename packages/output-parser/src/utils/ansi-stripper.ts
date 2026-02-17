/**
 * Regex para códigos ANSI
 * Basado en el patrón estándar de escape sequences
 */
const ANSI_ESCAPE_REGEX =
	// biome-ignore lint/suspicious/noControlCharactersInRegex: necesario para detectar códigos ANSI
	/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Elimina códigos ANSI del texto
 *
 * @param text - Texto que puede contener códigos ANSI
 * @returns Texto limpio sin códigos ANSI
 *
 * @example
 * ```ts
 * stripAnsi('\u001b[32mHello\u001b[0m'); // 'Hello'
 * ```
 */
export function stripAnsi(text: string): string {
	return text.replace(ANSI_ESCAPE_REGEX, "");
}

/**
 * Verifica si el texto contiene códigos ANSI
 *
 * @param text - Texto a verificar
 * @returns true si contiene códigos ANSI
 */
export function hasAnsi(text: string): boolean {
	return ANSI_ESCAPE_REGEX.test(text);
}
