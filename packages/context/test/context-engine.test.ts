import type { AnalysisResult } from "@openfarm/analysis";
import { beforeEach, describe, expect, it } from "vitest";
import { ContextEngine } from "../src/context-engine.js";

describe("ContextEngine", () => {
  let engine: ContextEngine;

  beforeEach(() => {
    engine = new ContextEngine();
  });

  it("should be defined", () => {
    expect(engine).toBeDefined();
  });

  it("should generate context output with required structure", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result).toBeDefined();
    expect(result.output).toBeDefined();
    expect(typeof result.output).toBe("string");
    expect(result.output.length).toBeGreaterThan(0);
    expect(result.context).toBeDefined();
    expect(result.guidelines).toBeDefined();
    expect(result.conventions).toBeDefined();
  });

  it("should include project name in context", async () => {
    const mockAnalysisResult = createMockAnalysisResult({
      projectId: "my-awesome-project",
    });

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.context.projectName).toBe("my-awesome-project");
  });

  it("should include quality score in core rules", async () => {
    const mockAnalysisResult = createMockAnalysisResult({
      summary: {
        overallScore: 85,
        categoryScores: {
          codeQuality: 90,
          security: 80,
          performance: 85,
          maintainability: 80,
          testCoverage: 75,
        },
        findingsCount: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 10,
        },
        topIssues: [],
        quickWins: [],
      },
    });

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.output).toContain("85/100");
  });

  it("should include critical issues in rules", async () => {
    const mockAnalysisResult = createMockAnalysisResult({
      summary: {
        overallScore: 70,
        categoryScores: {
          codeQuality: 70,
          security: 60,
          performance: 75,
          maintainability: 65,
          testCoverage: 60,
        },
        findingsCount: {
          critical: 3,
          high: 5,
          medium: 10,
          low: 15,
        },
        topIssues: ["Critical bug"],
        quickWins: [],
      },
    });

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.output).toContain("Critical issues: 3");
  });

  it("should format output as markdown with headers", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.output).toContain("#");
    expect(result.output).toContain("##");
  });

  it("should include commit standards", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.conventions.commitStandards).toBeDefined();
    expect(result.conventions.commitStandards.format).toBeDefined();
    expect(result.conventions.commitStandards.allowedTypes).toContain("feat");
    expect(result.conventions.commitStandards.allowedTypes).toContain("fix");
  });

  it("should include code style conventions", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.conventions.codeStyle).toBeDefined();
    expect(result.conventions.codeStyle.typescriptLevel).toBe("strict");
  });

  it("should include testing conventions", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.conventions.testingConventions).toBeDefined();
    expect(result.conventions.testingConventions.framework).toBe("Vitest");
  });

  it("should include personality profile", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.guidelines.personality).toBeDefined();
    expect(result.guidelines.personality.tone).toBe("professional");
  });

  it("should include principles", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.guidelines.principles.length).toBeGreaterThan(0);
    expect(result.guidelines.principles[0].title).toBe("CONCEPTS > CODE");
  });

  it("should include quick reference table", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.guidelines.quickReference).toBeDefined();
    expect(result.guidelines.quickReference!.length).toBeGreaterThan(0);
  });

  it("should include architecture rules", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.conventions.architectureRules.length).toBeGreaterThan(0);
    expect(result.conventions.architectureRules[0].priority).toBe("must");
  });

  it("should include metadata", async () => {
    const mockAnalysisResult = createMockAnalysisResult();

    const result = await engine.generate({
      analysisResult: mockAnalysisResult,
      projectPath: "/test/path",
    });

    expect(result.metadata).toBeDefined();
    expect(result.metadata.generatedAt).toBeDefined();
    expect(result.metadata.analysisVersion).toBe("1.0.0");
    expect(result.metadata.sectionsGenerated.length).toBeGreaterThan(0);
  });
});

function createMockAnalysisResult(
  overrides: Partial<AnalysisResult> = {}
): AnalysisResult {
  return {
    id: "test-123",
    projectId: "test-project",
    repositoryUrl: "https://github.com/test/repo",
    branchName: "main",
    commitSha: "abc123",
    timestamp: new Date().toISOString(),
    summary: {
      overallScore: 85,
      categoryScores: {
        codeQuality: 90,
        security: 80,
        performance: 85,
        maintainability: 80,
        testCoverage: 75,
      },
      findingsCount: {
        critical: 0,
        high: 2,
        medium: 5,
        low: 10,
      },
      topIssues: [],
      quickWins: [],
    },
    details: {
      codeQuality: {
        files: [],
      },
      security: {
        vulnerabilities: [],
        secrets: [],
      },
      performance: {},
      architecture: {
        patterns: ["clean"],
        smells: [],
        cycles: [],
        coupling: 0.3,
      },
      dependencies: {
        outdated: [],
        vulnerable: [],
        unused: [],
      },
      testing: {
        coverage: 80,
      },
      documentation: {
        coverage: 70,
      },
    },
    suggestions: [],
    issues: [],
    metrics: {},
    ...overrides,
  } as AnalysisResult;
}
