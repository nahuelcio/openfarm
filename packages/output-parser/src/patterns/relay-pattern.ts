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
 * Compatibilidad con relay:
 * ->relay:destino mensaje
 *
 * Soporta los mismos prefijos que openfarm
 */
export const RELAY_COMPAT_PATTERN =
  /^(?:\s*(?:[>$%#→➜›»●•◦‣⁃\-*⏺◆◇○□■]\s*)*)?->relay:(\S+)\s+(.+)$/im;

/**
 * Pattern para compatibilidad con relay
 */
export const relayPattern: Pattern = {
  name: "relay-compat",
  regex: RELAY_COMPAT_PATTERN,
  parse(match: RegExpMatchArray): ParsedCommand {
    const to = match[1];
    const body = match[2].trim();
    const timestamp = Date.now();

    return {
      type: "MESSAGE",
      to,
      body,
      format: "inline",
      timestamp,
      hash: generateHash(to, body, timestamp),
    };
  },
};
