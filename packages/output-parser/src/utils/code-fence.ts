/**
 * Detecta si una posición en el texto está dentro de un code fence de markdown
 *
 * @param text - Texto completo
 * @param position - Posición a verificar
 * @returns true si está dentro de un code fence
 */
export function isInsideCodeFence(text: string, position: number): boolean {
  const fenceRegex = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: necesario para iterar regex global
  while ((match = fenceRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (position >= start && position < end) {
      return true;
    }
  }

  return false;
}

/**
 * Extrae el contenido fuera de code fences
 *
 * @param text - Texto con posibles code fences
 * @returns Texto fuera de code fences (con marcadores de posición)
 */
export function extractOutsideFences(text: string): string {
  let result = text;
  const fenceRegex = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;
  const fences: Array<{ start: number; end: number; content: string }> = [];

  // biome-ignore lint/suspicious/noAssignInExpressions: necesario para iterar regex global
  while ((match = fenceRegex.exec(text)) !== null) {
    fences.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  // Reemplazar fences con espacios para mantener posiciones
  for (let i = fences.length - 1; i >= 0; i--) {
    const fence = fences[i];
    const spaces = " ".repeat(fence.end - fence.start);
    result = result.slice(0, fence.start) + spaces + result.slice(fence.end);
  }

  return result;
}

/**
 * Opciones para procesar code fences
 */
export interface CodeFenceOptions {
  /** Mantener el contenido de los fences (default: false) */
  keepContent?: boolean;
  /** Reemplazar con placeholder (default: true) */
  usePlaceholder?: boolean;
  /** String placeholder */
  placeholder?: string;
}

/**
 * Procesa el texto manejando code fences
 *
 * @param text - Texto a procesar
 * @param options - Opciones de procesamiento
 * @returns Texto procesado
 */
export function processCodeFences(
  text: string,
  options: CodeFenceOptions = {}
): string {
  const {
    keepContent = false,
    usePlaceholder = true,
    placeholder = "[CODE]",
  } = options;

  if (keepContent) {
    return text;
  }

  if (usePlaceholder) {
    return text.replace(/```[\s\S]*?```/g, placeholder);
  }

  return text.replace(/```[\s\S]*?```/g, "");
}
