import { err, ok, type Result } from "../src/result";
import type {
  ChangesSummary,
  CodingEngine,
  CreatePRParams,
  PlatformAdapter,
  WorkItem,
} from "../src/types";

/**
 * Mock PlatformAdapter for testing purposes
 */
export class MockPlatformAdapter implements PlatformAdapter {
  private readonly mockWorkItems: Map<string, WorkItem> = new Map();
  private readonly mockPRs: Map<string, string> = new Map();

  constructor(mockData?: {
    workItems?: WorkItem[];
    prUrls?: Record<string, string>;
  }) {
    if (mockData?.workItems) {
      for (const item of mockData.workItems) {
        this.mockWorkItems.set(item.id, item);
      }
    }
    if (mockData?.prUrls) {
      for (const [key, url] of Object.entries(mockData.prUrls)) {
        this.mockPRs.set(key, url);
      }
    }
  }

  getName(): string {
    return "Mock Platform Adapter";
  }

  getWorkItem(id: string): Promise<Result<WorkItem>> {
    const workItem = this.mockWorkItems.get(id);
    if (workItem) {
      return Promise.resolve(ok(workItem));
    }
    return Promise.resolve(err(new Error(`Work item ${id} not found`)));
  }

  createPullRequest(params: CreatePRParams): Promise<Result<string>> {
    const prKey = `${params.source}-${params.target}`;
    const prUrl =
      this.mockPRs.get(prKey) || `https://mock-platform.com/pr/${Date.now()}`;
    return Promise.resolve(ok(prUrl));
  }

  postComment(_id: string, _text: string): Promise<Result<void>> {
    // Mock implementation - always succeeds
    return Promise.resolve(ok(undefined));
  }

  testConnection(): Promise<Result<boolean>> {
    return Promise.resolve(ok(true));
  }
}

/**
 * Mock CodingEngine for testing purposes
 */
export class MockCodingEngine implements CodingEngine {
  private readonly mockChanges: ChangesSummary = {
    filesModified: ["test.ts"],
    filesCreated: [],
    filesDeleted: [],
    diff: "mock diff",
    summary: "Mock changes applied",
  };

  constructor(
    private readonly mockData?: {
      changes?: ChangesSummary;
      shouldFail?: boolean;
      failMessage?: string;
    }
  ) {
    if (mockData?.changes) {
      this.mockChanges = mockData.changes;
    }
  }

  getName(): string {
    return "Mock Coding Engine";
  }

  async getSupportedModels(): Promise<string[]> {
    return ["mock-model-1", "mock-model-2"];
  }

  applyChanges(
    _instruction: string,
    _repoPath: string,
    _contextFiles?: string[]
  ): Promise<Result<ChangesSummary>> {
    if (this.mockData?.shouldFail) {
      return Promise.resolve(
        err(new Error(this.mockData.failMessage || "Mock engine failure"))
      );
    }
    return Promise.resolve(ok(this.mockChanges));
  }
}
