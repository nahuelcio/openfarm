import type { Integration } from "@openfarm/core/types/adapters";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubPlatformAdapter } from "../src/index";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("GitHubPlatformAdapter", () => {
  const mockIntegration: Integration = {
    id: "test-id",
    name: "Test GitHub",
    type: "github",
    credentials: "test-token",
    organization: "test-org",
    createdAt: new Date().toISOString(),
  };

  const owner = "test-owner";
  const repo = "test-repo";
  let adapter: GitHubPlatformAdapter;

  beforeEach(() => {
    adapter = new GitHubPlatformAdapter(mockIntegration, owner, repo);
    vi.clearAllMocks();
  });

  it("should be correctly instantiated", () => {
    expect(adapter.getName()).toBe(`GitHub (${owner}/${repo})`);
  });

  describe("getWorkItem", () => {
    it("should fetch and transform GitHub issue to WorkItem", async () => {
      const mockIssue = {
        number: 123,
        title: "Test Issue",
        body: "Issue description",
        state: "open",
        labels: [{ name: "bug" }, { name: "urgent" }],
        assignee: { login: "test-user" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssue,
      });

      const result = await adapter.getWorkItem("123");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("123");
        expect(result.value.title).toBe("Test Issue");
        expect(result.value.description).toBe("Issue description");
        expect(result.value.status).toBe("new");
        expect(result.value.tags).toEqual(["bug", "urgent"]);
        expect(result.value.assignedTo).toBe("test-user");
      }

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.github.com/repos/${owner}/${repo}/issues/123`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `token ${mockIntegration.credentials}`,
          }),
        })
      );
    });

    it("should handle closed issues", async () => {
      const mockIssue = {
        number: 123,
        title: "Closed Issue",
        body: "Description",
        state: "closed",
        labels: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssue,
      });

      const result = await adapter.getWorkItem("123");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("completed");
      }
    });

    it("should return error when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
        json: async () => ({ message: "Not Found" }),
      });

      const result = await adapter.getWorkItem("123");

      expect(result.ok).toBe(false);
    });
  });

  describe("createPullRequest", () => {
    it("should return error when source and target are the same", async () => {
      const result = await adapter.createPullRequest({
        source: "main",
        target: "main",
        title: "Test PR",
        description: "Description",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect((result as any).error.message).toContain("are the same");
      }
    });

    it("should create PR successfully", async () => {
      // Mock branch check
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        }) // check branch exists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        }) // check existing PRs
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        }) // check source branch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: "ahead",
            ahead_by: 1,
            commits: [{}],
          }),
        }) // compare branches
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            html_url: "https://github.com/test-owner/test-repo/pull/1",
          }),
        }); // create PR

      const result = await adapter.createPullRequest({
        source: "feature-branch",
        target: "main",
        title: "Test PR",
        description: "Description",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain("github.com");
        expect(result.value).toContain("pull");
      }
    });

    it("should return existing PR if one already exists", async () => {
      const existingPR = {
        html_url: "https://github.com/test-owner/test-repo/pull/1",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        }) // check branch exists
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [existingPR],
        }); // check existing PRs

      const result = await adapter.createPullRequest({
        source: "feature-branch",
        target: "main",
        title: "Test PR",
        description: "Description",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(existingPR.html_url);
      }
    });
  });

  describe("postComment", () => {
    it("should post comment successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({}),
      });

      const result = await adapter.postComment("123", "Test comment");

      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.github.com/repos/${owner}/${repo}/issues/123/comments`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ body: "Test comment" }),
        })
      );
    });

    it("should return error when comment post fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Forbidden",
        json: async () => ({ message: "Forbidden" }),
      });

      const result = await adapter.postComment("123", "Test comment");

      expect(result.ok).toBe(false);
    });
  });

  describe("testConnection", () => {
    it("should return ok when connection succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: "test-user" }),
      });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(true);
      }
    });

    it("should return error when connection fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
        json: async () => ({ message: "Bad credentials" }),
      });

      const result = await adapter.testConnection();

      expect(result.ok).toBe(false);
    });
  });
});
