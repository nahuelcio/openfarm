import type { SpecManager } from "../core/spec-manager";
import { parseStatus } from "./shared";

export async function runStatusCommand(
  manager: SpecManager,
  args: string[]
): Promise<void> {
  const slug = args[0];
  const nextStatusRaw = args[1];
  if (!(slug && nextStatusRaw)) {
    throw new Error("Usage: openfarm spec status <slug> <new-status>");
  }

  const spec = await manager.load(slug);
  const previous = spec.metadata.status;
  const nextStatus = parseStatus(nextStatusRaw);
  await manager.updateStatus(spec, nextStatus, true);

  console.log(`Updated status: ${slug} (${previous} -> ${nextStatus})`);
}
