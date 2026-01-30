import type { AnalysisResult } from "@openfarm/analysis";
import type {
  PrimingOptions,
  RawRepositoryData,
  SynthesizedData,
} from "../types/index.js";

export class ConventionsSynthesizer {
  async synthesize(
    analysisResult: AnalysisResult,
    rawData: RawRepositoryData,
    _options: PrimingOptions | undefined,
    result: SynthesizedData
  ): Promise<void> {
    const { summary, issues } = analysisResult;

    const criticalIssues = issues.filter((i) => i.severity === "critical");
    const hasSecurityIssues = issues.some((i) => i.type === "security");

    result.conventions = {
      commitStandards: {
        format: "type(scope): description",
        allowedTypes: ["feat", "fix", "docs", "refactor", "test", "chore"],
        examples: [
          "feat(auth): add JWT validation",
          "fix(api): resolve timeout issue",
          "chore: update dependencies",
        ],
      },
      codeStyle: {
        formatting: "Prettier with Biome config",
        linting: "Biome with strict mode",
        typescriptLevel: "strict",
        documentation: "JSDoc for public APIs, self-documenting code preferred",
      },
      testingConventions: {
        framework: "Vitest",
        pattern: "AAA (Arrange, Act, Assert)",
        coverageTarget: 80,
      },
      namingConventions: [
        {
          scope: "file",
          pattern: "kebab-case.ts",
          examples: ["user-auth.ts", "api-handler.ts"],
        },
        {
          scope: "class",
          pattern: "PascalCase",
          examples: ["UserAuth", "ApiHandler"],
        },
        {
          scope: "function",
          pattern: "camelCase",
          examples: ["getUserData", "validateInput"],
        },
        {
          scope: "constant",
          pattern: "UPPER_SNAKE_CASE",
          examples: ["MAX_RETRY_COUNT", "DEFAULT_TIMEOUT"],
        },
      ],
      architectureRules: [
        {
          rule: "Single Responsibility Principle",
          rationale: "Each component should have one clear purpose",
          examples: [
            "Separate business logic from UI",
            "Extract utilities to shared package",
          ],
          priority: "must",
        },
        {
          rule: "Dependency Injection",
          rationale: "Loose coupling enables testing and flexibility",
          examples: [
            "Inject repositories into use cases",
            "Use interfaces for abstractions",
          ],
          priority: "should",
        },
        {
          rule: "Error Handling",
          rationale: "Fail gracefully with meaningful errors",
          examples: ["Use Result pattern", "Avoid empty catch blocks"],
          priority: "must",
        },
        ...(criticalIssues.length > 0
          ? ([
              {
                rule: `Fix ${criticalIssues.length} critical issue(s) identified`,
                rationale:
                  "Critical issues indicate security or stability risks",
                examples: criticalIssues.map((i) => i.title),
                priority: "must" as const,
              },
            ] as const)
          : []),
        ...(hasSecurityIssues
          ? ([
              {
                rule: "Address security vulnerabilities",
                rationale: "Security issues can expose user data and systems",
                examples: [
                  "Use parameterized queries",
                  "Validate all inputs",
                  "Store secrets securely",
                ],
                priority: "must" as const,
              },
            ] as const)
          : []),
      ],
    };

    result.guidelines = {
      coreRules: [
        `Quality threshold: ${summary.overallScore}/100`,
        `Critical issues: ${summary.findingsCount.critical}`,
        `High priority issues: ${summary.findingsCount.high}`,
        ...(summary.findingsCount.critical > 0
          ? ["CRITICAL: Resolve critical issues before merging"]
          : []),
        "Write self-documenting code with minimal comments",
        "Follow existing patterns in the codebase",
        "Run linting before committing",
      ],
      personality: {
        tone: "professional",
        communicationStyle: "Direct and concise",
        values: [
          "Quality over quantity",
          "Clear intent over clever code",
          "Testing as safety net",
        ],
      },
      expertise: [
        "TypeScript strict mode",
        "React + Ink for CLI interfaces",
        "SQLite for local data",
        "Git-based workflows",
      ],
      principles: [
        {
          id: "concepts-over-code",
          title: "CONCEPTS > CODE",
          description: "Understand the problem before solving it",
          priority: 1,
        },
        {
          id: "ai-as-tool",
          title: "AI IS A TOOL",
          description: "You direct, AI executes. Verify all suggestions",
          priority: 2,
        },
        {
          id: "solid-foundations",
          title: "SOLID FOUNDATIONS",
          description: "Design patterns and architecture before frameworks",
          priority: 3,
        },
      ],
      quickReference: [
        {
          scenario: "Adding a new feature",
          action: "Create use case, add tests first, then implement",
          rationale: "TDD ensures correct behavior from the start",
        },
        {
          scenario: "Fixing a bug",
          action: "Write failing test, implement fix, verify test passes",
          rationale: "Test prevents regression and documents expected behavior",
        },
        {
          scenario: "Refactoring code",
          action: "Ensure tests exist, change incrementally, verify tests pass",
          rationale: "Tests are safety net for refactoring",
        },
      ],
    };
  }
}
