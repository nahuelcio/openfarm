import type { AnalysisResult } from "@openfarm/analysis";
import { z } from "zod";

export interface ConventionRule {
  rule: string;
  rationale: string;
  examples: string[];
  priority: "must" | "should" | "could";
}

export interface RepoPrimingInput {
  analysisResult: AnalysisResult;
  projectPath: string;
  options?: PrimingOptions;
}

export interface PrimingOptions {
  includeGitHistory?: boolean;
  includeFileTree?: boolean;
  targetAudience?: "agent" | "human" | "hybrid";
  customConventions?: ConventionRule[];
}

export interface RepoPrimingResult {
  context: RepoContext;
  guidelines: AgentGuidelines;
  conventions: ProjectConventions;
  output: string;
  metadata: PrimingMetadata;
}

export interface RepoContext {
  projectName: string;
  description: string;
  language: string;
  framework?: string;
  packageManager: "bun" | "npm" | "yarn" | "pnpm";
  structure: ProjectStructure;
  architecture: ArchitectureSummary;
}

export interface ProjectStructure {
  packages: PackageInfo[];
  rootDirectories: string[];
  entryPoints: string[];
  testDirectories: string[];
}

export interface PackageInfo {
  name: string;
  path: string;
  type: "library" | "application" | "tool";
  dependencies: number;
  exportsCount: number;
}

export interface ArchitectureSummary {
  pattern: "monorepo" | "polyrepo" | "single-package";
  layering?: string[];
  keyPatterns: string[];
  couplingLevel: "low" | "medium" | "high";
}

export interface AgentGuidelines {
  coreRules: string[];
  personality: PersonalityProfile;
  expertise: string[];
  principles: Principle[];
  decisionTree?: DecisionNode[];
  quickReference?: QuickRefEntry[];
}

export interface PersonalityProfile {
  tone: "professional" | "casual" | "authoritative";
  communicationStyle: string;
  values: string[];
}

export interface Principle {
  id: string;
  title: string;
  description: string;
  examples?: string[];
  priority: number;
}

export interface DecisionNode {
  condition: string;
  then: string;
  else?: string;
}

export interface QuickRefEntry {
  scenario: string;
  action: string;
  rationale: string;
}

export interface ProjectConventions {
  commitStandards: CommitConvention;
  codeStyle: CodeConvention;
  testingConventions: TestingConvention;
  namingConventions: NamingConvention[];
  architectureRules: ArchitectureRule[];
}

export interface CommitConvention {
  format: string;
  allowedTypes: string[];
  examples: string[];
}

export interface CodeConvention {
  formatting: string;
  linting: string;
  typescriptLevel: "strict" | "standard" | "loose";
  documentation: string;
}

export interface TestingConvention {
  framework: string;
  pattern: string;
  coverageTarget: number;
}

export interface NamingConvention {
  scope: "file" | "function" | "class" | "variable" | "constant";
  pattern: string;
  examples: readonly string[];
}

export interface ArchitectureRule {
  rule: string;
  rationale: string;
  examples: readonly string[];
  priority: "must" | "should" | "could";
}

export interface PrimingMetadata {
  generatedAt: string;
  analysisVersion: string;
  inputHash: string;
  sectionsGenerated: string[];
}

export interface GitHistory {
  recentCommits: GitCommit[];
  contributors: string[];
  branchCount: number;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface PackageJsonData {
  name: string;
  version: string;
  packageManager: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface FileStructureData {
  directories: string[];
  keyFiles: string[];
  testFiles: string[];
  configFiles: string[];
}

export interface RawRepositoryData {
  gitHistory?: GitHistory;
  packageJson?: PackageJsonData;
  fileStructure?: FileStructureData;
}

export interface SynthesizedData {
  context: RepoContext;
  guidelines: AgentGuidelines;
  conventions: ProjectConventions;
}

export interface ExplorationResult {
  fileStructure: string;
  packageJson?: string;
  existingInstructions?: string;
  techStack?: string[];
  architecture?: string;
}

export interface GeneratedContext {
  agentsMd: string;
  summary: string;
  techStack: string[];
  conventions: string[];
  metadata: {
    analyzedAt: string;
    provider: string;
    filesExplored: number;
  };
}

export interface AgentAnalysisOptions {
  provider?: string;
  model?: string;
  customSystemPrompt?: string;
  explorationDepth?: "quick" | "normal" | "thorough";
  includeGitHistory?: boolean;
  temperature?: number;
}

export const ConventionRuleSchema = z.object({
  rule: z.string(),
  rationale: z.string(),
  examples: z.array(z.string()),
  priority: z.enum(["must", "should", "could"]),
});

export const PackageInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(["library", "application", "tool"]),
  dependencies: z.number(),
  exportsCount: z.number(),
});

export const ProjectStructureSchema = z.object({
  packages: z.array(PackageInfoSchema),
  rootDirectories: z.array(z.string()),
  entryPoints: z.array(z.string()),
  testDirectories: z.array(z.string()),
});

export const RepoContextSchema = z.object({
  projectName: z.string(),
  description: z.string(),
  language: z.string(),
  framework: z.string().optional(),
  packageManager: z.enum(["bun", "npm", "yarn", "pnpm"]),
  structure: ProjectStructureSchema,
  architecture: z.object({
    pattern: z.enum(["monorepo", "polyrepo", "single-package"]),
    layering: z.array(z.string()).optional(),
    keyPatterns: z.array(z.string()),
    couplingLevel: z.enum(["low", "medium", "high"]),
  }),
});

export const AgentGuidelinesSchema = z.object({
  coreRules: z.array(z.string()),
  personality: z.object({
    tone: z.enum(["professional", "casual", "authoritative"]),
    communicationStyle: z.string(),
    values: z.array(z.string()),
  }),
  expertise: z.array(z.string()),
  principles: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      examples: z.array(z.string()).optional(),
      priority: z.number(),
    })
  ),
  quickReference: z
    .array(
      z.object({
        scenario: z.string(),
        action: z.string(),
        rationale: z.string(),
      })
    )
    .optional(),
});

export const ProjectConventionsSchema = z.object({
  commitStandards: z.object({
    format: z.string(),
    allowedTypes: z.array(z.string()),
    examples: z.array(z.string()),
  }),
  codeStyle: z.object({
    formatting: z.string(),
    linting: z.string(),
    typescriptLevel: z.enum(["strict", "standard", "loose"]),
    documentation: z.string(),
  }),
  testingConventions: z.object({
    framework: z.string(),
    pattern: z.string(),
    coverageTarget: z.number(),
  }),
  namingConventions: z.array(
    z.object({
      scope: z.enum(["file", "function", "class", "variable", "constant"]),
      pattern: z.string(),
      examples: z.array(z.string()),
    })
  ),
  architectureRules: z.array(ConventionRuleSchema),
});

export const RepoPrimingInputSchema = z.object({
  analysisResult: z.any(),
  projectPath: z.string(),
  options: z
    .object({
      includeGitHistory: z.boolean().default(false),
      includeFileTree: z.boolean().default(true),
      targetAudience: z.enum(["agent", "human", "hybrid"]).default("agent"),
      customConventions: z.array(ConventionRuleSchema).optional(),
    })
    .optional(),
});

export const RepoPrimingResultSchema = z.object({
  context: RepoContextSchema,
  guidelines: AgentGuidelinesSchema,
  conventions: ProjectConventionsSchema,
  output: z.string(),
  metadata: z.object({
    generatedAt: z.string(),
    analysisVersion: z.string(),
    inputHash: z.string(),
    sectionsGenerated: z.array(z.string()),
  }),
});
