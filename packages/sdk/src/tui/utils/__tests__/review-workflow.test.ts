import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAgentDiff,
  rejectAgent,
} from "../review-workflow";

const mockGetAgent = vi.fn();
const mockUpdateAgent = vi.fn();

vi.mock("../agent-pool", () => ({
  useAgentPoolStore: {
    getState: () => ({
      getAgent: mockGetAgent,
      updateAgent: mockUpdateAgent,
    }),
  },
}));

describe("review-workflow", () => {
  beforeEach(() => {
    mockGetAgent.mockReset();
    mockUpdateAgent.mockReset();
  });

  it("returns null diff when agent has no worktree", async () => {
    mockGetAgent.mockReturnValue({
      id: "agent-1",
      config: { task: "test", workspace: "/tmp", provider: "opencode" },
      branchName: "feature/test",
    });

    const result = await getAgentDiff("agent-1");
    expect(result).toBeNull();
  });

  it("marks agent as failed when rejected", async () => {
    mockGetAgent.mockReturnValue({
      id: "agent-1",
      config: { task: "test", workspace: "/tmp", provider: "opencode" },
    });

    const result = await rejectAgent("agent-1", "Needs changes");

    expect(result).toEqual({ success: true });
    expect(mockUpdateAgent).toHaveBeenCalledWith("agent-1", {
      status: "failed",
      error: "Rejected: Needs changes",
    });
  });
});
