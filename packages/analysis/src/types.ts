import { z } from "zod";

// ============================================================================
// Result Types
// ============================================================================

export interface AnalysisResult {
  id: string;
  projectId: string;
  repositoryUrl: string;
  branchName: string;
  commitSha: string;
  timestamp: string;
  summary: AnalysisSummary;
  details: AnalysisDetails;
  suggestions: Suggestion[];
  issues: Issue[];
  metrics: QualityMetrics;
}

export interface AnalysisSummary {
  overallScore: number;
  categoryScores: {
    codeQuality: number;
    security: number;
    performance: number;
    maintainability: number;
    testCoverage: number;
  };
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topIssues: string[];
  quickWins: string[];
}

export interface AnalysisDetails {
  codeQuality: CodeQualityAnalysis;
  security: SecurityAnalysis;
  performance: PerformanceAnalysis;
  architecture: ArchitectureAnalysis;
  dependencies: DependencyAnalysis;
  testing: TestingAnalysis;
  documentation: DocumentationAnalysis;
}

export interface Issue {
  id: string;
  type:
    | "code_smell"
    | "security"
    | "performance"
    | "bug_risk"
    | "technical_debt";
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  affectedFiles: FileLocation[];
  suggestedFix?: SuggestedFix;
  references: string[];
  estimatedEffort?: string;
  priority: number;
  createdAt: string;
}

export interface SuggestedFix {
  description: string;
  steps: string[];
  codeExample?: string;
  resources: string[];
}

export interface Suggestion {
  id: string;
  type: "improvement" | "feature_idea" | "refactoring" | "optimization";
  category: string;
  title: string;
  description: string;
  benefit: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  priority: number;
  examples?: string[];
  references?: string[];
  implementation?: ImplementationGuide;
  createdAt: string;
}

export interface ImplementationGuide {
  steps: string[];
  codeExample?: string;
  resources: string[];
}

export interface FileLocation {
  path: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
}

export interface QualityMetrics {
  cyclomaticComplexity: number;
  codeDuplication: number;
  codeSmells: number;
  maintainabilityIndex: number;
  testCoverage: number;
  testDuplication: number;
  flakyTests: number;
  untestedFiles: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  secretsDetected: number;
  securityHotspots: number;
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  outdatedDependencies: number;
  vulnerableDependencies: number;
  unusedDependencies: number;
  architecturalSmells: number;
  circularDependencies: number;
  layerViolations: number;
  coupling: number;
  cohesion: number;
}

// ============================================================================
// Code Quality Analysis Types
// ============================================================================

export interface CodeQualityAnalysis {
  overallScore: number;
  metrics: {
    cyclomaticComplexity: number;
    codeDuplication: number;
    maintainabilityIndex: number;
  };
  codeSmells: CodeSmell[];
  hotspots: CodeHotspot[];
  patterns: CodePattern[];
}

export interface CodeSmell {
  id: string;
  type:
    | "long_function"
    | "god_class"
    | "duplicate_code"
    | "dead_code"
    | "magic_numbers"
    | "large_file";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedFiles: FileLocation[];
  suggestedFix?: SuggestedFix;
  estimatedEffort?: string;
  priority: number;
}

export interface CodeHotspot {
  file: string;
  complexity: number;
  functions: FunctionComplexity[];
}

export interface FunctionComplexity {
  name: string;
  line: number;
  complexity: number;
}

export interface CodePattern {
  id: string;
  type: "design_pattern" | "anti_pattern" | "best_practice";
  name: string;
  description: string;
  confidence: number;
  location: FileLocation;
  severity?: string;
  suggestedRefactoring?: string;
}

// ============================================================================
// Security Analysis Types
// ============================================================================

export interface SecurityAnalysis {
  overallScore: number;
  vulnerabilities: Vulnerability[];
  secrets: Secret[];
  securityHotspots: SecurityHotspot[];
  dependencies: DependencyVulnerability[];
}

export interface Vulnerability {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  affectedFiles: FileLocation[];
  cweId?: string;
  references: string[];
  suggestedFix?: string;
}

export interface Secret {
  id: string;
  type: string;
  severity: "critical" | "high";
  title: string;
  description: string;
  affectedFiles: FileLocation[];
  secret: string;
  suggestedFix: string;
}

export interface SecurityHotspot {
  id: string;
  type:
    | "sql_injection"
    | "xss"
    | "path_traversal"
    | "unsafe_deserialization"
    | "hardcoded_credentials";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedFiles: FileLocation[];
  suggestedFix: string;
  codeExample?: string;
}

export interface DependencyVulnerability {
  id: string;
  packageName: string;
  installedVersion: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  cve?: string;
  patchedIn?: string;
  recommendedVersion?: string;
  references: string[];
  suggestedFix?: string;
}

// ============================================================================
// Performance Analysis Types
// ============================================================================

export interface PerformanceAnalysis {
  overallScore: number;
  metrics: {
    bundleSize: number;
    loadTime: number;
    renderTime: number;
    apiResponseTime: number;
  };
  issues: Issue[];
  suggestions: Suggestion[];
}

export interface BundleAnalysis {
  totalSize: number;
  chunks: BundleChunk[];
  issues: Issue[];
  suggestions: Suggestion[];
}

export interface BundleChunk {
  name: string;
  size: number;
  files: string[];
}

export interface RuntimePerformanceAnalysis {
  loadTime: number;
  renderTime: number;
  issues: Issue[];
}

// ============================================================================
// Architecture Analysis Types
// ============================================================================

export interface ArchitectureAnalysis {
  overallScore: number;
  patterns: Pattern[];
  smells: ArchitecturalSmell[];
  metrics: {
    dependencies?: DependencyGraph;
    layers?: LayerAnalysis;
    coupling?: CouplingAnalysis;
    cohesion?: CohesionAnalysis;
  };
  suggestions: Suggestion[];
}

export interface Pattern {
  id: string;
  name: string;
  type: string;
  description: string;
  confidence: number;
  location: FileLocation;
}

export interface ArchitecturalSmell {
  id: string;
  type:
    | "circular_dependency"
    | "layer_violation"
    | "unstable_dependency"
    | "god_module"
    | "shotgun_surgery";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedFiles: FileLocation[];
  suggestedFix?: SuggestedFix;
  priority: number;
  estimatedEffort?: string;
}

export interface DependencyGraph {
  graph: Map<string, Set<string>>;
  metrics: {
    totalDependencies: number;
    averageDependencies: number;
    maxDependencies: number;
    isolatedModules: number;
  };
}

export interface LayerAnalysis {
  violations: LayerViolation[];
  metrics: {
    totalViolations: number;
    layers: Record<string, { files: number; imports: number }>;
  };
}

export interface LayerViolation {
  sourceLayer: string;
  targetLayer: string;
  files: string[];
}

export interface CouplingAnalysis {
  afferentCoupling: Record<string, number>;
  efferentCoupling: Record<string, number>;
  instability: Record<string, number>;
}

export interface CohesionAnalysis {
  moduleCohesion: Record<string, number>;
  averageCohesion: number;
}

// ============================================================================
// Other Analysis Types
// ============================================================================

export interface DependencyAnalysis {
  outdatedDependencies: DependencyInfo[];
  vulnerableDependencies: DependencyVulnerability[];
  unusedDependencies: DependencyInfo[];
}

export interface DependencyInfo {
  packageName: string;
  installedVersion: string;
  latestVersion?: string;
  license?: string;
}

export interface TestingAnalysis {
  overallScore: number;
  coverage: number;
  untestedFiles: string[];
  flakyTests: string[];
  testDuplication: number;
}

export interface DocumentationAnalysis {
  coverage: number;
  documentedFiles: string[];
  undocumentedFiles: string[];
  missingDocumentation: string[];
}

// ============================================================================
// Analysis Options
// ============================================================================

export interface AnalysisOptions {
  projectPath: string;
  includeTests?: boolean;
  includeDependencies?: boolean;
  includeDocumentation?: boolean;
  customRules?: string[];
  excludePaths?: string[];
  thresholds?: {
    complexity?: number;
    duplication?: number;
    coverage?: number;
  };
}

export interface CodeBlock {
  file: string;
  line: number;
  code: string;
  hash: string;
}

export interface ComplexityAnalysis {
  average: number;
  hotspots: CodeHotspot[];
  allComplexities: Array<{ file: string; complexity: number }>;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const AnalysisResultSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string(),
  repositoryUrl: z.string().url(),
  branchName: z.string(),
  commitSha: z.string(),
  timestamp: z.string().datetime(),
  summary: z.any(),
  details: z.any(),
  suggestions: z.array(z.any()),
  issues: z.array(z.any()),
  metrics: z.any(),
});

export const IssueSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    "code_smell",
    "security",
    "performance",
    "bug_risk",
    "technical_debt",
  ]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  affectedFiles: z.array(
    z.object({
      path: z.string(),
      line: z.number().optional(),
      column: z.number().optional(),
      codeSnippet: z.string().optional(),
    })
  ),
  suggestedFix: z.any().optional(),
  references: z.array(z.string()),
  estimatedEffort: z.string().optional(),
  priority: z.number().min(1).max(10),
  createdAt: z.string().datetime(),
});

export const SuggestionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["improvement", "feature_idea", "refactoring", "optimization"]),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  benefit: z.string(),
  effort: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  priority: z.number().min(1).max(10),
  examples: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
  implementation: z.any().optional(),
  createdAt: z.string().datetime(),
});
