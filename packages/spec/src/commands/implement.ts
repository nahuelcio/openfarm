import { SpecImplementer } from "../core/implementer";
import type { SpecManager } from "../core/spec-manager";

export async function runImplementCommand(
  manager: SpecManager,
  args: string[]
): Promise<void> {
  const slug = args[0];
  if (!slug) {
    throw new Error("Usage: openfarm spec implement <slug>");
  }

  const spec = await manager.load(slug);
  const implementer = new SpecImplementer(manager);
  const result = await implementer.implement(spec);
  console.log(
    `Implemented spec: ${slug} (${result.completedTasks}/${result.totalTasks} tasks completed)`
  );
}
