import type { Workflow } from "../src/types/workflow";
import { mergeWorkflows } from "../src/workflow-dsl/resolver/inheritance-merger";

const makeStep = (id: string, action: string) => ({
  id,
  type: "git",
  action,
  config: {},
});

describe("mergeWorkflows", () => {
  it("inserts new child steps according to child order (between parent steps)", () => {
    const parent = {
      id: "_base_code",
      name: "Base",
      steps: [
        makeStep("setup", "git.checkout"),
        makeStep("create-branch", "git.branch"),
        makeStep("commit", "git.commit"),
        makeStep("push", "git.push"),
        makeStep("finalize", "platform.create_pr"),
      ],
      createdAt: "now",
      updatedAt: "now",
    };

    const child = {
      id: "fix_bug_standard",
      name: "Child",
      extends: "_base_code",
      steps: [
        makeStep("setup", "git.checkout"),
        makeStep("create-branch", "git.branch"),
        { id: "apply-fix", type: "code", action: "agent.code", config: {} },
        makeStep("commit", "git.commit"),
        makeStep("push", "git.push"),
        makeStep("finalize", "platform.create_pr"),
      ],
      createdAt: "now",
      updatedAt: "now",
    };

    const merged = mergeWorkflows(parent as Workflow, child as Workflow);
    const mergedIds = merged.steps.map((s) => s.id);

    expect(mergedIds).toEqual([
      "setup",
      "create-branch",
      "apply-fix",
      "commit",
      "push",
      "finalize",
    ]);
  });
});
