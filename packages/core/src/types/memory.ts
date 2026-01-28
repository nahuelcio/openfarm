export enum KnowledgeType {
  CODE_PATTERN = "code_pattern",
  ARCHITECTURAL_DECISION = "arch_decision",
  BUG_FIX_STRATEGY = "bug_fix_strategy",
  REFACTOR_APPROACH = "refactor_approach",
  OPTIMIZATION_TECHNIQUE = "optimization",
  SECURITY_BEST_PRACTICE = "security",
  TESTING_STRATEGY = "testing",
  API_DESIGN_PATTERN = "api_design",
  ERROR_HANDLING = "error_handling",
  PERFORMANCE_PATTERN = "performance",
}

export enum PatternType {
  ARCHITECTURAL = "architectural",
  DESIGN = "design",
  CODING = "coding",
  TESTING = "testing",
  DEPLOYMENT = "deployment",
  MONITORING = "monitoring",
}

export enum DecisionOutcome {
  SUCCESS = "success",
  FAILURE = "failure",
  PARTIAL = "partial",
}

export interface Knowledge {
  id: string;
  type: KnowledgeType;
  content: string;
  summary: string;
  embeddings?: number[];
  confidence: number;
  successRate?: number;
  frequency: number;
  projectId?: string;
  executionId?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeDTO {
  type: KnowledgeType;
  content: string;
  summary: string;
  projectId?: string;
  executionId?: string;
  metadata?: Record<string, unknown>;
}

export interface Pattern {
  id: string;
  name: string;
  type: PatternType;
  description: string;
  template?: string;
  successRate: number;
  confidence: number;
  frequency: number;
  projectContext?: string[];
  relatedPatterns?: string[];
  estimatedTimeSavings?: number;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatternDTO {
  name: string;
  type: PatternType;
  description: string;
  template?: string;
  projectContext?: string[];
  relatedPatterns?: string[];
  projectId?: string;
}

export interface PatternMetrics {
  successRate: number;
  confidence: number;
  frequency: number;
}

export interface Decision {
  id: string;
  context: string;
  decision: unknown;
  reasoning?: string;
  outcome?: DecisionOutcome;
  impact?: number;
  timestamp: string;
  executionId?: string;
  stepId?: string;
  agentId?: string;
}

export interface DecisionDTO {
  context: string;
  decision: unknown;
  reasoning?: string;
  executionId?: string;
  stepId?: string;
  agentId?: string;
}

export interface DecisionFilters {
  executionId?: string;
  stepId?: string;
  agentId?: string;
  outcome?: DecisionOutcome;
  minImpact?: number;
  startDate?: string;
  endDate?: string;
}

export interface MemoryQueryOptions {
  type?: KnowledgeType | PatternType | "all";
  limit?: number;
  filters?: Record<string, unknown>;
  sortBy?: "relevance" | "confidence" | "recency" | "frequency";
  threshold?: number;
  projectId?: string;
}

export interface SearchResult {
  item: Knowledge | Pattern | Decision;
  semanticScore: number;
  keywordScore: number;
  graphScore: number;
  totalScore: number;
}

export interface ExecutionContext {
  patterns: Pattern[];
  decisions: Decision[];
  knowledge: Knowledge[];
  totalTokens: number;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  stack?: string[];
  type?: string;
}

export interface SuccessMetrics {
  completed: boolean;
  duration: number;
  testsPassed: number;
  testsFailed: number;
  codeQualityScore: number;
}

export interface QualityScore {
  overall: number;
  breakdown: {
    relevance: number;
    accuracy: number;
    freshness: number;
    utility: number;
    consistency: number;
  };
  confidence: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

export interface TransferResult {
  transferred: number;
  rejected: number;
  skipped: number;
}

export interface TransferContext {
  targetStack?: string[];
  targetDomain?: string;
  maxItems?: number;
  minQuality?: number;
}

export interface MemoryMetrics {
  totalKnowledgeItems: number;
  knowledgeByType: Record<KnowledgeType, number>;
  averageConfidence: number;
  averageSuccessRate: number;
  totalPatterns: number;
  patternsByType: Record<PatternType, number>;
  topPatterns: Pattern[];
  totalDecisions: number;
  decisionSuccessRate: number;
  averageDecisionImpact: number;
  executionsLearned: number;
  patternsReinforced: number;
  knowledgeTransferred: number;
  avgRetrievalTime: number;
  avgContextBuildTime: number;
  cacheHitRate: number;
  knowledgeQualityScore: number;
  outdatedKnowledgeCount: number;
  lowConfidenceKnowledgeCount: number;
}
