import { runArchiveCommand } from "./commands/archive";
import { runImplementCommand } from "./commands/implement";
import { runListCommand } from "./commands/list";
import { runPlanCommand } from "./commands/plan";
import { runRefineCommand } from "./commands/refine";
import { runShowCommand } from "./commands/show";
import { runStatusCommand } from "./commands/status";
import { SpecManager } from "./core/spec-manager";

function printHelp(): void {
  console.log(`OpenFarm Spec CLI

Usage:
  openfarm spec plan <name> <description>
  openfarm spec refine <slug> <feedback> [--focus <artifact>]
  openfarm spec implement <slug>
  openfarm spec archive <slug>
  openfarm spec list [--status <status>] [--all]
  openfarm spec show <slug> [--raw <artifact>]
  openfarm spec status <slug> <new-status>
`);
}

export async function runSpecCLI(args: string[]): Promise<void> {
  const manager = new SpecManager(process.cwd());
  await manager.init();

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "plan":
      await runPlanCommand(manager, rest);
      return;
    case "refine":
      await runRefineCommand(manager, rest);
      return;
    case "implement":
      await runImplementCommand(manager, rest);
      return;
    case "archive":
      await runArchiveCommand(manager, rest);
      return;
    case "list":
      await runListCommand(manager, rest);
      return;
    case "show":
      await runShowCommand(manager, rest);
      return;
    case "status":
      await runStatusCommand(manager, rest);
      return;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printHelp();
      return;
    default:
      throw new Error(`Unknown spec command: ${command}`);
  }
}
