import { describe, expect, it } from "vitest";
import type { Execution, Job, Mission, Step, Workflow, WorkItem } from "../src";

describe("Types", () => {
  describe("WorkItem", () => {
    it("should have required properties", () => {
      const workItem: WorkItem = {
        id: "1",
        title: "Test",
        description: "Description",
        status: "pending",
        type: "task",
        priority: "medium",
        labels: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(workItem.id).toBe("1");
      expect(workItem.status).toBe("pending");
    });
  });

  describe("Job", () => {
    it("should have required properties", () => {
      const job: Job = {
        id: "1",
        workItemId: "wi-1",
        status: "pending",
        priority: 1,
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(job.id).toBe("1");
      expect(job.status).toBe("pending");
    });
  });

  describe("Execution", () => {
    it("should have required properties", () => {
      const execution: Execution = {
        id: "1",
        jobId: "job-1",
        workflowId: "wf-1",
        stepId: "step-1",
        status: "pending",
        logs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(execution.id).toBe("1");
      expect(execution.status).toBe("pending");
    });
  });

  describe("Mission", () => {
    it("should have required properties", () => {
      const mission: Mission = {
        id: "1",
        task: "Do something",
        context: "Context",
        status: "pending",
        workItemIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(mission.id).toBe("1");
      expect(mission.task).toBe("Do something");
    });
  });

  describe("Workflow", () => {
    it("should have required properties", () => {
      const step: Step = {
        id: "step-1",
        name: "Test Step",
        type: "agent",
        config: {},
      };

      const workflow: Workflow = {
        id: "1",
        name: "Test Workflow",
        description: "Description",
        version: "1.0.0",
        steps: [step],
        enabled: true,
        triggers: [{ type: "manual" }],
      };

      expect(workflow.id).toBe("1");
      expect(workflow.steps).toHaveLength(1);
    });
  });
});
