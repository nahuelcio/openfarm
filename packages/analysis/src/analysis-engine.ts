import { CodeQualityAnalyzer } from "./analyzers/code-quality";
import { ArchitectureAnalyzer } from "./architecture/analyzer";
import { FeatureIdeaGenerator } from "./ideation/generator";
import { PatternDetector } from "./patterns/detector";
import { PerformanceAnalyzer } from "./performance/analyzer";
import { SecurityAnalyzer } from "./security/vulnerability-scanner";
import type {
  AnalysisDetails,
  AnalysisOptions,
  AnalysisResult,
  QualityMetrics,
} from "./types";
import { generateId } from "./utils/id";

export class AnalysisEngine {
  private readonly codeQualityAnalyzer: CodeQualityAnalyzer;
  private readonly patternDetector: PatternDetector;
  private readonly securityAnalyzer: SecurityAnalyzer;
  private readonly performanceAnalyzer: PerformanceAnalyzer;
  private readonly architectureAnalyzer: ArchitectureAnalyzer;
  private readonly ideaGenerator: FeatureIdeaGenerator;

  constructor() {
    this.codeQualityAnalyzer = new CodeQualityAnalyzer();
    this.patternDetector = new PatternDetector();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.architectureAnalyzer = new ArchitectureAnalyzer();
    this.ideaGenerator = new FeatureIdeaGenerator();
  }

  async analyze(options: AnalysisOptions): Promise<AnalysisResult> {
    const { projectPath } = options;

    const result: AnalysisResult = {
      id: generateId(),
      projectId: this.extractProjectId(projectPath),
      repositoryUrl: "", // TODO: Extract from git
      branchName: "main", // TODO: Get from git
      commitSha: "", // TODO: Get from git
      timestamp: new Date().toISOString(),
      summary: {
        overallScore: 0,
        categoryScores: {
          codeQuality: 0,
          security: 0,
          performance: 0,
          maintainability: 0,
          testCoverage: 0,
        },
        findingsCount: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        topIssues: [],
        quickWins: [],
      },
      details: {} as AnalysisDetails,
      suggestions: [],
      issues: [],
      metrics: this.createDefaultMetrics(),
    };

    try {
      // 1. Code Quality Analysis
      const codeQualityResult =
        await this.codeQualityAnalyzer.analyze(projectPath);
      result.details.codeQuality = codeQualityResult;
      result.summary.categoryScores.codeQuality =
        codeQualityResult.overallScore;
      result.metrics.cyclomaticComplexity =
        codeQualityResult.metrics.cyclomaticComplexity;
      result.metrics.codeDuplication =
        codeQualityResult.metrics.codeDuplication;
      result.metrics.codeSmells = codeQualityResult.codeSmells.length;
      result.metrics.maintainabilityIndex =
        codeQualityResult.metrics.maintainabilityIndex;

      // Convert code smells to issues
      result.issues.push(
        ...codeQualityResult.codeSmells.map((smell) => ({
          id: smell.id,
          type: "code_smell" as const,
          severity: smell.severity,
          category: "code_quality",
          title: smell.title,
          description: smell.description,
          affectedFiles: smell.affectedFiles,
          suggestedFix: smell.suggestedFix,
          references: [],
          estimatedEffort: smell.estimatedEffort,
          priority: smell.priority,
          createdAt: new Date().toISOString(),
        }))
      );

      // 2. Pattern Detection
      const patterns = await this.patternDetector.detectPatterns(projectPath);
      result.details.codeQuality.patterns = patterns;

      // 3. Security Analysis
      const securityResult = await this.securityAnalyzer.analyze(projectPath);
      result.details.security = securityResult;
      result.summary.categoryScores.security = securityResult.overallScore;

      // Convert security findings to issues
      for (const secret of securityResult.secrets) {
        result.issues.push({
          id: secret.id,
          type: "security",
          severity: secret.severity,
          category: "security",
          title: secret.title,
          description: secret.description,
          affectedFiles: secret.affectedFiles,
          suggestedFix: {
            description: secret.suggestedFix,
            steps: [],
            resources: [],
          },
          references: [],
          priority:
            secret.severity === "critical"
              ? 10
              : secret.severity === "high"
                ? 8
                : 6,
          createdAt: new Date().toISOString(),
        });
      }

      for (const hotspot of securityResult.securityHotspots) {
        result.issues.push({
          id: hotspot.id,
          type: "security",
          severity: hotspot.severity,
          category: "security",
          title: hotspot.title,
          description: hotspot.description,
          affectedFiles: hotspot.affectedFiles,
          suggestedFix: {
            description: hotspot.suggestedFix,
            steps: [],
            resources: [],
          },
          references: [],
          priority:
            hotspot.severity === "critical"
              ? 10
              : hotspot.severity === "high"
                ? 8
                : 6,
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Performance Analysis
      const performanceResult =
        await this.performanceAnalyzer.analyze(projectPath);
      result.details.performance = performanceResult;
      result.summary.categoryScores.performance =
        performanceResult.overallScore;
      result.metrics.bundleSize = performanceResult.metrics.bundleSize;
      result.metrics.loadTime = performanceResult.metrics.loadTime;
      result.metrics.renderTime = performanceResult.metrics.renderTime;
      result.metrics.apiResponseTime =
        performanceResult.metrics.apiResponseTime;

      // Add performance issues and suggestions
      result.issues.push(...performanceResult.issues);
      result.suggestions.push(...performanceResult.suggestions);

      // 5. Architecture Analysis
      const architectureResult =
        await this.architectureAnalyzer.analyze(projectPath);
      result.details.architecture = architectureResult;
      result.summary.categoryScores.maintainability =
        architectureResult.overallScore;
      result.metrics.architecturalSmells = architectureResult.smells.length;
      result.metrics.circularDependencies = architectureResult.smells.filter(
        (s) => s.type === "circular_dependency"
      ).length;
      result.metrics.layerViolations = 0; // TODO: Calculate

      // Convert architectural smells to issues
      for (const smell of architectureResult.smells) {
        result.issues.push({
          id: smell.id,
          type: "technical_debt",
          severity: smell.severity,
          category: "architecture",
          title: smell.title,
          description: smell.description,
          affectedFiles: smell.affectedFiles,
          suggestedFix: smell.suggestedFix,
          references: [],
          estimatedEffort: smell.estimatedEffort,
          priority: smell.priority,
          createdAt: new Date().toISOString(),
        });
      }

      // 6. Generate Feature Ideas
      const ideas = await this.ideaGenerator.generateIdeas(
        projectPath,
        codeQualityResult,
        architectureResult
      );
      result.suggestions.push(...ideas);

      // 7. Calculate overall scores and summary
      this.calculateSummary(result);

      return result;
    } catch (error) {
      console.error("Error during analysis:", error);
      throw error;
    }
  }

  private calculateSummary(result: AnalysisResult): void {
    const { categoryScores } = result.summary;

    // Calculate overall score as weighted average
    result.summary.overallScore = Math.round(
      categoryScores.codeQuality * 0.3 +
        categoryScores.security * 0.25 +
        categoryScores.performance * 0.2 +
        categoryScores.maintainability * 0.25
    );

    // Count findings by severity
    result.summary.findingsCount.critical = result.issues.filter(
      (i) => i.severity === "critical"
    ).length;
    result.summary.findingsCount.high = result.issues.filter(
      (i) => i.severity === "high"
    ).length;
    result.summary.findingsCount.medium = result.issues.filter(
      (i) => i.severity === "medium"
    ).length;
    result.summary.findingsCount.low = result.issues.filter(
      (i) => i.severity === "low"
    ).length;

    // Top issues (top 5 by priority)
    result.summary.topIssues = result.issues
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map((i) => i.title);

    // Quick wins (high priority, low/medium effort)
    result.summary.quickWins = result.suggestions
      .filter((s) => s.priority >= 7 && s.effort !== "high")
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map((s) => s.title);
  }

  private extractProjectId(projectPath: string): string {
    // Extract the last directory name as project ID
    const parts = projectPath.split(/[/\\]/);
    return parts.at(-1) || "unknown";
  }

  private createDefaultMetrics(): QualityMetrics {
    return {
      cyclomaticComplexity: 0,
      codeDuplication: 0,
      codeSmells: 0,
      maintainabilityIndex: 0,
      testCoverage: 0,
      testDuplication: 0,
      flakyTests: 0,
      untestedFiles: 0,
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      secretsDetected: 0,
      securityHotspots: 0,
      bundleSize: 0,
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: 0,
      outdatedDependencies: 0,
      vulnerableDependencies: 0,
      unusedDependencies: 0,
      architecturalSmells: 0,
      circularDependencies: 0,
      layerViolations: 0,
      coupling: 0,
      cohesion: 0,
    };
  }
}
