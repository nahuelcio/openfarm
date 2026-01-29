import { OpenFarm } from "./open-farm";
import type { OpenFarmConfig } from "./types";

export async function runCLI(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  const client = new OpenFarm(config);

  if (args.length === 0) {
    console.log("Minions Farm SDK - CLI");
    console.log(
      "Usage: minion <task> [--provider <provider>] [--model <model>]"
    );
    return;
  }

  const task = args[0];
  if (!task) {
    console.error("Task is required");
    process.exit(1);
  }

  const result = await client.execute({ task });

  if (result.success && result.output) {
    console.log(result.output);
  } else if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
}
