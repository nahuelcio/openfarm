import { markTasksDone, parseTasks } from "../format/parsers";
import type { LoadedSpec } from "../types";
import type { SpecManager } from "./spec-manager";

export interface ImplementResult {
  totalTasks: number;
  completedTasks: number;
}

export class SpecImplementer {
  public constructor(private readonly manager: SpecManager) {}

  public async implement(spec: LoadedSpec): Promise<ImplementResult> {
    const artifacts = await this.manager.loadArtifacts(spec);
    const tasks = parseTasks(artifacts.tasks);
    const completedBefore = tasks.filter((task) => task.done).length;
    const totalTasks = tasks.length;

    await this.manager.updateStatus(spec, "implementing");
    const updatedTasks = markTasksDone(artifacts.tasks);
    await this.manager.writeArtifact(spec, "tasks", updatedTasks);
    await this.manager.updateStatus(spec, "done");

    return {
      totalTasks,
      completedTasks: totalTasks > 0 ? totalTasks : completedBefore,
    };
  }
}
