import type {
  ArchitecturalSmell,
  ArchitectureAnalysis,
  CodeHotspot,
  CodeQualityAnalysis,
  Suggestion,
} from "../types";
import { generateId, getFiles, readFile } from "../utils";

export class FeatureIdeaGenerator {
  async generateIdeas(
    projectPath: string,
    codeAnalysis: CodeQualityAnalysis,
    architectureAnalysis: ArchitectureAnalysis
  ): Promise<Suggestion[]> {
    const ideas: Suggestion[] = [];

    try {
      // 1. Generate feature ideas based on gaps
      const featureIdeas = await this.generateFeatureIdeas(
        projectPath,
        codeAnalysis,
        architectureAnalysis
      );
      ideas.push(...featureIdeas);

      // 2. Generate improvement ideas
      const improvementIdeas = await this.generateImprovementIdeas(
        codeAnalysis,
        architectureAnalysis
      );
      ideas.push(...improvementIdeas);

      // 3. Generate refactoring ideas
      const refactoringIdeas = await this.generateRefactoringIdeas(
        codeAnalysis,
        architectureAnalysis
      );
      ideas.push(...refactoringIdeas);

      // 4. Generate optimization ideas
      const optimizationIdeas = await this.generateOptimizationIdeas(
        codeAnalysis,
        architectureAnalysis
      );
      ideas.push(...optimizationIdeas);

      // 5. Prioritize ideas
      const prioritizedIdeas = await this.prioritizeIdeas(ideas);

      return prioritizedIdeas;
    } catch (error) {
      console.error("Error generating ideas:", error);
      return ideas;
    }
  }

  private async generateFeatureIdeas(
    projectPath: string,
    _codeAnalysis: CodeQualityAnalysis,
    _architectureAnalysis: ArchitectureAnalysis
  ): Promise<Suggestion[]> {
    const ideas: Suggestion[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx", ".js", ".jsx"]);

    // 1. Look for missing features based on code patterns
    const missingTests = this.detectMissingTesting(files);
    if (missingTests.length > 0) {
      ideas.push({
        id: generateId(),
        type: "feature_idea",
        category: "testing",
        title: "Improve Test Coverage",
        description: `${missingTests.length} files have no tests. Adding tests will improve code reliability.`,
        benefit: "Better code quality, fewer bugs in production",
        effort: "high",
        impact: "high",
        priority: 8,
        examples: missingTests.slice(0, 3),
        implementation: {
          steps: [
            "Set up a testing framework (Jest, Vitest, etc.)",
            "Write unit tests for utility functions",
            "Write integration tests for API endpoints",
            "Write E2E tests for critical user flows",
            "Set up CI to run tests on every commit",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Look for missing documentation
    const missingDocs = await this.detectMissingDocumentation(files);
    if (missingDocs.length > 0) {
      ideas.push({
        id: generateId(),
        type: "feature_idea",
        category: "documentation",
        title: "Improve Code Documentation",
        description: `${missingDocs.length} files lack proper documentation. Adding comments and JSDoc will improve maintainability.`,
        benefit:
          "Easier onboarding for new developers, better code understanding",
        effort: "medium",
        impact: "medium",
        priority: 5,
        examples: missingDocs.slice(0, 3),
        implementation: {
          steps: [
            "Add JSDoc comments to public APIs",
            "Document complex algorithms",
            "Add README files for modules",
            "Consider using tools like TypeDoc to generate documentation",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Look for missing error handling
    const missingErrorHandling = await this.detectMissingErrorHandling(files);
    if (missingErrorHandling.length > 0) {
      ideas.push({
        id: generateId(),
        type: "feature_idea",
        category: "error_handling",
        title: "Improve Error Handling",
        description: `${missingErrorHandling.length} functions lack proper error handling. Adding error handling will improve stability.`,
        benefit: "Better user experience, easier debugging",
        effort: "medium",
        impact: "high",
        priority: 7,
        examples: missingErrorHandling.slice(0, 3),
        implementation: {
          steps: [
            "Add try-catch blocks around async operations",
            "Create custom error classes",
            "Implement global error handler",
            "Add error logging and monitoring",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Suggest logging improvements
    const hasLogging = await this.checkForLogging(files);
    if (!hasLogging) {
      ideas.push({
        id: generateId(),
        type: "feature_idea",
        category: "logging",
        title: "Add Application Logging",
        description:
          "No structured logging detected. Adding logging will help with debugging and monitoring.",
        benefit: "Better observability, easier troubleshooting",
        effort: "medium",
        impact: "high",
        priority: 7,
        implementation: {
          steps: [
            "Set up a logging library (winston, pino, etc.)",
            "Add logs for critical operations",
            "Implement structured logging with metadata",
            "Add log levels (error, warn, info, debug)",
            "Set up log aggregation (e.g., ELK stack)",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Suggest monitoring/metrics
    const hasMonitoring = await this.checkForMonitoring(files);
    if (!hasMonitoring) {
      ideas.push({
        id: generateId(),
        type: "feature_idea",
        category: "monitoring",
        title: "Add Application Monitoring",
        description:
          "No application monitoring detected. Adding monitoring will help track performance and issues.",
        benefit: "Proactive issue detection, performance insights",
        effort: "high",
        impact: "high",
        priority: 6,
        implementation: {
          steps: [
            "Set up APM (Application Performance Monitoring)",
            "Add custom metrics for key operations",
            "Set up alerts for critical issues",
            "Create dashboards for monitoring",
            "Implement health check endpoints",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    return ideas;
  }

  private async generateImprovementIdeas(
    codeAnalysis: CodeQualityAnalysis,
    architectureAnalysis: ArchitectureAnalysis
  ): Promise<Suggestion[]> {
    const ideas: Suggestion[] = [];

    // Based on code smells
    const codeSmellCount = codeAnalysis.codeSmells.length;
    if (codeSmellCount > 0) {
      ideas.push({
        id: generateId(),
        type: "improvement",
        category: "code_quality",
        title: `Fix ${codeSmellCount} Code Smells`,
        description: `Found ${codeSmellCount} code smells in the codebase. Addressing them will improve maintainability.`,
        benefit: "Cleaner, more maintainable code",
        effort: "high",
        impact: "medium",
        priority: 6,
        implementation: {
          steps: [
            "Review code smells by severity",
            "Fix critical and high-priority smells first",
            "Add automated checks to prevent future smells",
            "Schedule regular refactoring sessions",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // Based on architectural smells
    const archSmellCount = architectureAnalysis.smells.length;
    if (archSmellCount > 0) {
      ideas.push({
        id: generateId(),
        type: "improvement",
        category: "architecture",
        title: `Address ${archSmellCount} Architectural Issues`,
        description: `Found ${archSmellCount} architectural issues. Addressing them will improve system design.`,
        benefit: "Better architecture, easier to extend",
        effort: "high",
        impact: "high",
        priority: 7,
        implementation: {
          steps: [
            "Review architectural issues by impact",
            "Plan refactoring to address each issue",
            "Implement in phases to minimize risk",
            "Update documentation to reflect changes",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // Suggest TypeScript improvements
    ideas.push({
      id: generateId(),
      type: "improvement",
      category: "typescript",
      title: "Enhance TypeScript Configuration",
      description:
        "Review and enhance TypeScript strict mode and type checking.",
      benefit: "Better type safety, fewer runtime errors",
      effort: "medium",
      impact: "medium",
      priority: 5,
      implementation: {
        steps: [
          "Enable strict mode in tsconfig.json",
          "Enable noImplicitAny and strictNullChecks",
          "Add proper type annotations",
          "Remove any types and use proper alternatives",
        ],
        resources: [],
      },
      createdAt: new Date().toISOString(),
    });

    return ideas;
  }

  private async generateRefactoringIdeas(
    codeAnalysis: CodeQualityAnalysis,
    architectureAnalysis: ArchitectureAnalysis
  ): Promise<Suggestion[]> {
    const ideas: Suggestion[] = [];

    // Suggest extracting complex functions
    const complexFunctions = codeAnalysis.hotspots.filter(
      (h: CodeHotspot) => h.complexity > 10
    );
    if (complexFunctions.length > 0) {
      ideas.push({
        id: generateId(),
        type: "refactoring",
        category: "complexity",
        title: `Extract ${complexFunctions.length} Complex Functions`,
        description:
          "Several functions have high complexity. Extracting them will improve readability.",
        benefit: "More maintainable code, easier testing",
        effort: "medium",
        impact: "medium",
        priority: 6,
        implementation: {
          steps: [
            "Identify complex functions",
            "Break them down into smaller functions",
            "Give each function a single responsibility",
            "Add unit tests for extracted functions",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    // Suggest breaking circular dependencies
    const circularDeps = architectureAnalysis.smells.filter(
      (s: ArchitecturalSmell) => s.type === "circular_dependency"
    );
    if (circularDeps.length > 0) {
      ideas.push({
        id: generateId(),
        type: "refactoring",
        category: "architecture",
        title: "Resolve Circular Dependencies",
        description: `Found ${circularDeps.length} circular dependencies. These can cause issues with module loading.`,
        benefit: "Better module structure, predictable loading",
        effort: "high",
        impact: "high",
        priority: 9,
        implementation: {
          steps: [
            "Analyze each circular dependency",
            "Identify shared functionality",
            "Extract to a separate module",
            "Ensure one-directional dependencies",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    return ideas;
  }

  private async generateOptimizationIdeas(
    codeAnalysis: CodeQualityAnalysis,
    _architectureAnalysis: ArchitectureAnalysis
  ): Promise<Suggestion[]> {
    const ideas: Suggestion[] = [];

    // Suggest caching strategy
    ideas.push({
      id: generateId(),
      type: "optimization",
      category: "caching",
      title: "Implement Caching Strategy",
      description:
        "Consider implementing caching for frequently accessed data.",
      benefit: "Reduced database load, faster response times",
      effort: "medium",
      impact: "medium",
      priority: 5,
      implementation: {
        steps: [
          "Identify frequently accessed data",
          "Choose a caching solution (Redis, Memcached, etc.)",
          "Implement cache with TTL",
          "Add cache invalidation strategy",
          "Monitor cache hit rates",
        ],
        resources: [],
      },
      createdAt: new Date().toISOString(),
    });

    // Suggest code splitting if large project
    const hasLargeFiles = codeAnalysis.codeSmells.some(
      (s) => s.type === "large_file"
    );
    if (hasLargeFiles) {
      ideas.push({
        id: generateId(),
        type: "optimization",
        category: "bundle",
        title: "Implement Code Splitting",
        description:
          "Large files detected. Code splitting can reduce initial bundle size.",
        benefit: "Faster load times, better user experience",
        effort: "medium",
        impact: "high",
        priority: 7,
        implementation: {
          steps: [
            "Identify large modules",
            "Implement dynamic imports",
            "Split routes into separate bundles",
            "Lazy load non-critical components",
            "Analyze bundle size after changes",
          ],
          resources: [],
        },
        createdAt: new Date().toISOString(),
      });
    }

    return ideas;
  }

  private async prioritizeIdeas(ideas: Suggestion[]): Promise<Suggestion[]> {
    // Sort by priority (descending), then by effort (ascending), then by impact (descending)
    return ideas.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      if (this.effortToNumber(a.effort) !== this.effortToNumber(b.effort)) {
        return this.effortToNumber(a.effort) - this.effortToNumber(b.effort);
      }
      return this.impactToNumber(b.impact) - this.impactToNumber(a.impact);
    });
  }

  private detectMissingTesting(files: string[]): string[] {
    // Simple heuristic: check if there are test files for each source file
    const testFiles = new Set(
      files.filter((f) => f.includes(".test.") || f.includes(".spec."))
    );

    return files.filter((file) => {
      // Only check .ts and .tsx files
      if (!(file.endsWith(".ts") || file.endsWith(".tsx"))) {
        return false;
      }

      // Skip test files
      if (file.includes(".test.") || file.includes(".spec.")) {
        return false;
      }

      // Check if test file exists
      const baseName = file.replace(/\.(ts|tsx)$/, "");
      return !(
        testFiles.has(`${baseName}.test.ts`) ||
        testFiles.has(`${baseName}.test.tsx`) ||
        testFiles.has(`${baseName}.spec.ts`) ||
        testFiles.has(`${baseName}.spec.tsx`)
      );
    });
  }

  private async detectMissingDocumentation(files: string[]): Promise<string[]> {
    const missingDocs: string[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file);
        if (!content) {
          continue;
        }

        // Simple heuristic: check if file has JSDoc comments
        const hasJSDoc = content.includes("/**");
        if (!hasJSDoc) {
          missingDocs.push(file);
        }
      } catch (_error) {}
    }

    return missingDocs.slice(0, 10); // Limit to 10
  }

  private async detectMissingErrorHandling(files: string[]): Promise<string[]> {
    const missing: string[] = [];

    for (const file of files) {
      try {
        const content = await readFile(file);
        if (!content) {
          continue;
        }

        // Check if file has async functions but no try-catch
        const hasAsync = content.includes("async ");
        const hasTryCatch = content.includes("try {");

        if (hasAsync && !hasTryCatch) {
          missing.push(file);
        }
      } catch (_error) {}
    }

    return missing.slice(0, 10); // Limit to 10
  }

  private async checkForLogging(files: string[]): Promise<boolean> {
    for (const file of files) {
      try {
        const content = await readFile(file);
        if (
          content.includes("logger.") ||
          content.includes("console.log") ||
          content.includes("console.error") ||
          content.includes("winston") ||
          content.includes("pino")
        ) {
          return true;
        }
      } catch (_error) {}
    }
    return false;
  }

  private async checkForMonitoring(files: string[]): Promise<boolean> {
    for (const file of files) {
      try {
        const content = await readFile(file);
        if (
          content.includes("metrics") ||
          content.includes("prometheus") ||
          content.includes("datadog") ||
          content.includes("new relic") ||
          content.includes("sentry")
        ) {
          return true;
        }
      } catch (_error) {}
    }
    return false;
  }

  private effortToNumber(effort: string): number {
    const mapping = { low: 1, medium: 2, high: 3 };
    return mapping[effort as keyof typeof mapping] || 2;
  }

  private impactToNumber(impact: string): number {
    const mapping = { low: 1, medium: 2, high: 3 };
    return mapping[impact as keyof typeof mapping] || 2;
  }
}
