import type { SpecManager } from "../core/spec-manager";
import { parseArgs, parseStatus } from "./shared";

export async function runListCommand(
  manager: SpecManager,
  rawArgs: string[]
): Promise<void> {
  const parsed = parseArgs(rawArgs);
  const includeArchived = Boolean(parsed.flags.all);
  const statusFlag = parsed.flags.status;
  const status =
    typeof statusFlag === "string" ? parseStatus(statusFlag) : undefined;

  const specs = await manager.list({ includeArchived, status });
  if (specs.length === 0) {
    console.log("No specs found");
    return;
  }

  console.log("slug\tname\tstatus\tupdatedAt");
  for (const spec of specs) {
    console.log(
      `${spec.metadata.slug}\t${spec.metadata.name}\t${spec.metadata.status}\t${spec.metadata.updatedAt}`
    );
  }
}
