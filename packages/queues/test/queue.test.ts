import { beforeEach, describe, expect, it } from "vitest";
import { MemoryQueueAdapter } from "../src/adapters/memory";
import { Queue } from "../src/queue";

describe("Queue with MemoryAdapter", () => {
  let queue: Queue;
  let adapter: MemoryQueueAdapter;

  beforeEach(() => {
    adapter = new MemoryQueueAdapter();
    queue = new Queue({ adapter });
    adapter.clear();
  });

  describe("send", () => {
    it("should send a job to the queue", async () => {
      const result = await queue.send("test.job", { message: "Hello" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toMatch(/^job_\d+$/);
      }

      const jobs = adapter.getAllJobs();
      expect(jobs.length).toBe(1);
      expect(jobs[0].name).toBe("test.job");
      expect(jobs[0].data).toEqual({ message: "Hello" });
    });

    it("should send a job with options", async () => {
      const result = await queue.send(
        "test.job",
        { message: "Hello" },
        {
          priority: 10,
          tags: ["important", "urgent"],
          maxAttempts: 5,
        }
      );

      expect(result.ok).toBe(true);

      const jobs = adapter.getAllJobs();
      expect(jobs[0].metadata?.priority).toBe(10);
      expect(jobs[0].metadata?.tags).toEqual(["important", "urgent"]);
      expect(jobs[0].metadata?.maxAttempts).toBe(5);
    });

    it("should send a job with delay", async () => {
      const result = await queue.send(
        "test.job",
        { message: "Delayed" },
        { delay: 100 }
      );

      expect(result.ok).toBe(true);
    });
  });

  describe("sendBatch", () => {
    it("should send multiple jobs", async () => {
      const result = await queue.sendBatch([
        { name: "job1", data: { id: 1 } },
        { name: "job2", data: { id: 2 } },
        { name: "job3", data: { id: 3 } },
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);
      }

      const jobs = adapter.getAllJobs();
      expect(jobs.length).toBe(3);
    });

    it("should send batch with different options", async () => {
      const result = await queue.sendBatch([
        { name: "job1", data: { id: 1 }, options: { priority: 10 } },
        { name: "job2", data: { id: 2 }, options: { priority: 5 } },
      ]);

      expect(result.ok).toBe(true);

      const jobs = adapter.getAllJobs();
      expect(jobs[0].metadata?.priority).toBe(10);
      expect(jobs[1].metadata?.priority).toBe(5);
    });
  });

  describe("cancel", () => {
    it("should cancel a job", async () => {
      const sendResult = await queue.send("test.job", { message: "Cancel me" });
      expect(sendResult.ok).toBe(true);

      if (sendResult.ok) {
        const cancelResult = await queue.cancel(sendResult.value);
        expect(cancelResult.ok).toBe(true);

        const statusResult = await queue.getStatus(sendResult.value);
        expect(statusResult.ok).toBe(true);
        if (statusResult.ok) {
          expect(statusResult.value.status).toBe("cancelled");
        }
      }
    });

    it("should return error when cancelling non-existent job", async () => {
      const result = await queue.cancel("non-existent-job");
      expect(result.ok).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should get job status", async () => {
      const sendResult = await queue.send("test.job", { message: "Status" });
      expect(sendResult.ok).toBe(true);

      if (sendResult.ok) {
        const statusResult = await queue.getStatus(sendResult.value);
        expect(statusResult.ok).toBe(true);
        if (statusResult.ok) {
          expect(statusResult.value.jobId).toBe(sendResult.value);
        }
      }
    });

    it("should return error for non-existent job", async () => {
      const result = await queue.getStatus("non-existent");
      expect(result.ok).toBe(false);
    });
  });

  describe("adapter info", () => {
    it("should return adapter name", () => {
      expect(queue.getAdapterName()).toBe("memory");
    });

    it("should return adapter instance", () => {
      expect(queue.getAdapter()).toBe(adapter);
    });
  });

  describe("default options", () => {
    it("should apply default options to jobs", async () => {
      const queueWithDefaults = new Queue({
        adapter,
        defaultOptions: {
          priority: 5,
          tags: ["default"],
          maxAttempts: 10,
        },
      });

      await queueWithDefaults.send("test.job", { message: "With defaults" });

      const jobs = adapter.getAllJobs();
      expect(jobs[0].metadata?.priority).toBe(5);
      expect(jobs[0].metadata?.tags).toEqual(["default"]);
      expect(jobs[0].metadata?.maxAttempts).toBe(10);
    });

    it("should override default options", async () => {
      const queueWithDefaults = new Queue({
        adapter,
        defaultOptions: {
          priority: 5,
          tags: ["default"],
        },
      });

      await queueWithDefaults.send(
        "test.job",
        { message: "Override" },
        { priority: 20, tags: ["custom"] }
      );

      const jobs = adapter.getAllJobs();
      expect(jobs[0].metadata?.priority).toBe(20);
      expect(jobs[0].metadata?.tags).toEqual(["custom"]);
    });
  });
});
