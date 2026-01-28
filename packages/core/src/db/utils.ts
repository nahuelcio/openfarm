/**
 * Helper function to parse JSON fields from database.
 * Returns null if the string is null/undefined or if parsing fails.
 *
 * @param jsonStr - JSON string to parse
 * @returns Parsed object or null
 *
 * @example
 * ```typescript
 * const data = parseJson<{ name: string }>('{"name":"test"}');
 * // Returns: { name: "test" }
 *
 * const invalid = parseJson('invalid json');
 * // Returns: null
 * ```
 */
export function parseJson<T>(jsonStr: string | null): T | null {
  if (!jsonStr) {
    return null;
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Helper function to serialize values to JSON strings.
 * Returns null if the value is null or undefined.
 *
 * @param value - Value to serialize
 * @returns JSON string or null
 *
 * @example
 * ```typescript
 * const json = toJson({ name: "test" });
 * // Returns: '{"name":"test"}'
 *
 * const nullJson = toJson(null);
 * // Returns: null
 * ```
 */
export function toJson(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return JSON.stringify(value);
}
