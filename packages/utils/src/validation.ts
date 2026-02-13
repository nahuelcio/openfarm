import { err, ok, type Result } from "@openfarm/result";

const dangerousPatterns = [
  {
    pattern: /rm\s+-rf\s+\/(?!tmp|var\/tmp|\.local\/Trash)/i,
    description: "rm -rf / (excepto /tmp)",
  },
  {
    pattern: />\s*\/dev\/sd/i,
    description: "escribir a discos directamente",
  },
  {
    pattern: /mkfs\.\w+/i,
    description: "formatear discos",
  },
  {
    pattern: /dd\s+if=/i,
    description: "operaciones peligrosas de disco",
  },
  {
    pattern: /:\(\)\{\s*:\s*\|\s*&\s*\}\s*;:/i,
    description: "fork bomb",
  },
  {
    pattern: /wget\s+.*\|\s*sh/i,
    description: "descarga y ejecución de script sin verificación",
  },
  {
    pattern: /curl\s+.*\|\s*sh/i,
    description: "descarga y ejecución de script sin verificación",
  },
];

export function validateInstruction(instruction: string): Result<void> {
  for (const { pattern, description } of dangerousPatterns) {
    if (pattern.test(instruction)) {
      return err(
        new Error(`Potentially dangerous instruction detected: ${description}`)
      );
    }
  }
  return ok(undefined);
}
