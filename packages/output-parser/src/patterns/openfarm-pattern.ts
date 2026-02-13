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
 * Pattern inline: ->openfarm:destino mensaje
 *
 * Soporta prefijos comunes de prompts:
 * >, $, %, #, →, ➜, bullets, etc.
 */
export const OPENFARM_INLINE_PATTERN =
  /^(?:\s*(?:[>$%#→➜›»●•◦‣⁃\-*⏺◆◇○□■]\s*)*)?->openfarm:(\S+)\s+(.+)$/im;

/**
 * Pattern fenced multi-línea:
 * ->openfarm:destino <<<
 * contenido multi-línea
 * >>>
 */
export const OPENFARM_FENCED_PATTERN =
  /->openfarm:(\S+)\s*<<<\n([\s\S]*?)\n>>>/gim;

/**
 * Pattern para parsear inline
 */
export const openfarmInlinePattern: Pattern = {
  name: "openfarm-inline",
  regex: OPENFARM_INLINE_PATTERN,
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

/**
 * Pattern para parsear fenced (multi-línea)
 */
export const openfarmFencedPattern: Pattern = {
  name: "openfarm-fenced",
  regex: OPENFARM_FENCED_PATTERN,
  parse(match: RegExpMatchArray): ParsedCommand {
    const to = match[1];
    const body = match[2].trim();
    const timestamp = Date.now();

    return {
      type: "MESSAGE",
      to,
      body,
      format: "fenced",
      timestamp,
      hash: generateHash(to, body, timestamp),
    };
  },
};
