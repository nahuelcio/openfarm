import type { Result } from "@openfarm/result";
import { ok } from "@openfarm/result";

/**
 * Validate instruction format and content
 * TODO: Implement full validation logic
 */
export function validateInstruction(instruction: string): Result<string> {
  if (!instruction || instruction.trim().length === 0) {
    return {
      ok: false,
      error: "Instruction cannot be empty",
    } as any;
  }
  return ok(instruction);
}
