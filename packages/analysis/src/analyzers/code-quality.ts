import * as ts from "typescript";
import type {
  CodeHotspot,
  CodeQualityAnalysis,
  CodeSmell,
  ComplexityAnalysis,
} from "../types";
import { generateId, getCodeSnippet, getFiles, readFile } from "../utils";
import { CodeSmellDetector } from "./code-smells";

/**
 * Complexity thresholds
 */
const HIGH_COMPLEXITY_THRESHOLD = 10;
const MAX_HOTSPOTS_COUNT = 20;
const MIN_BLOCK_LENGTH = 50;

/**
 * Maintainability index constants
 */
const MI_CONSTANT_171 = 171;
const MI_VOLUME_FACTOR = 5.2;
const MI_VOLUME_LOG_FACTOR = 0.23;
const MI_COMMENT_FACTOR = 16.2;
const MI_MAX_SCORE = 100;

/**
 * Code quality scoring weights
 */
const COMPLEXITY_WEIGHT = 0.3;
const DUPLICATION_WEIGHT = 0.3;
const MAINTAINABILITY_WEIGHT = 0.4;
const COMPLEXITY_PENALTY = 2;
const DUPLICATION_PENALTY = 2;

export class CodeQualityAnalyzer {
  private readonly codeSmellDetector: CodeSmellDetector;

  constructor() {
    this.codeSmellDetector = new CodeSmellDetector();
  }

  async analyze(projectPath: string): Promise<CodeQualityAnalysis> {
    const results: CodeQualityAnalysis = {
      overallScore: 0,
      metrics: {
        cyclomaticComplexity: 0,
        codeDuplication: 0,
        maintainabilityIndex: 0,
      },
      codeSmells: [],
      hotspots: [],
      patterns: [],
    };

    try {
      // 1. Cyclomatic complexity analysis
      const complexityResults = await this.analyzeComplexity(projectPath);
      results.metrics.cyclomaticComplexity = complexityResults.average;
      results.hotspots.push(...complexityResults.hotspots);

      // 2. Code duplication detection
      const duplicationResults = await this.detectDuplication(projectPath);
      results.metrics.codeDuplication = duplicationResults.percentage;
      results.codeSmells.push(...duplicationResults.duplicates);

      // 3. Code smells detection
      const codeSmells =
        await this.codeSmellDetector.detectCodeSmells(projectPath);
      results.codeSmells.push(...codeSmells);

      // 4. Maintainability index
      results.metrics.maintainabilityIndex =
        await this.calculateMaintainabilityIndex(projectPath);

      // 5. Calculate overall score
      results.overallScore = this.calculateOverallScore(results.metrics);
    } catch (error) {
      console.error("Error in code quality analysis:", error);
      throw error;
    }

    return results;
  }

  private async analyzeComplexity(
    projectPath: string
  ): Promise<ComplexityAnalysis> {
    const files = await getFiles(projectPath, [".ts", ".tsx", ".js", ".jsx"]);
    const complexities: Array<{ file: string; complexity: number }> = [];

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        const complexity = this.calculateCyclomaticComplexity(ast);

        complexities.push({ file, complexity });
      } catch (error) {
        console.error(
          `[CodeQuality] Error calculating complexity for ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other files
      }
    }

    const average =
      complexities.length > 0
        ? complexities.reduce((sum, c) => sum + c.complexity, 0) /
          complexities.length
        : 0;

    // Build hotspots (code snippets will be added when converting to issues)
    const hotspots: CodeHotspot[] = complexities
      .filter((c) => c.complexity > HIGH_COMPLEXITY_THRESHOLD)
      .map((c) => ({
        file: c.file,
        complexity: c.complexity,
        functions: [], // TODO: Extract function-level complexity
      }))
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, MAX_HOTSPOTS_COUNT);

    hotspots.sort((a, b) => b.complexity - a.complexity);
    const topHotspots = hotspots.slice(0, MAX_HOTSPOTS_COUNT);

    return { average, hotspots: topHotspots, allComplexities: complexities };
  }

  private calculateCyclomaticComplexity(ast: ts.SourceFile): number {
    let complexity = 1; // Base complexity

    const visit = (node: ts.Node) => {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
        case ts.SyntaxKind.SwitchStatement: {
          const switchStmt = node as ts.SwitchStatement;
          if (switchStmt.caseBlock) {
            complexity += switchStmt.caseBlock.clauses.length;
          }
          break;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(ast);
    return complexity;
  }

  private async detectDuplication(projectPath: string): Promise<{
    percentage: number;
    duplicates: CodeSmell[];
  }> {
    const files = await getFiles(projectPath, [".ts", ".tsx"]);
    const codeBlocks: Array<{
      file: string;
      line: number;
      hash: string;
      length: number;
    }> = [];
    const duplicates: CodeSmell[] = [];

    // Extract code blocks and calculate simple hashes
    const fileContents = new Map<string, string>();
    for (const file of files) {
      try {
        const content = await readFile(file);
        fileContents.set(file, content);
        const lines = content.split("\n");

        // Analyze blocks of 5 consecutive lines
        for (let i = 0; i < lines.length - 5; i++) {
          const block = lines
            .slice(i, i + 5)
            .join("\n")
            .trim();
          if (block.length < MIN_BLOCK_LENGTH) {
            continue; // Skip very short blocks
          }

          const hash = this.simpleHash(block);
          codeBlocks.push({
            file,
            line: i + 1,
            hash,
            length: block.length,
          });
        }
      } catch (error) {
        console.error(
          `[CodeQuality] Error detecting long methods in ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other files
      }
    }

    // Find duplicate blocks
    const hashGroups = new Map<string, (typeof codeBlocks)[0][]>();
    for (const block of codeBlocks) {
      if (!hashGroups.has(block.hash)) {
        hashGroups.set(block.hash, []);
      }
      hashGroups.get(block.hash)?.push(block);
    }

    // Report duplicates
    for (const [_hash, blocks] of hashGroups.entries()) {
      if (blocks.length > 1) {
        // Add code snippets for each duplicate block
        const affectedFiles = blocks.map((b) => {
          const content = fileContents.get(b.file);
          const codeSnippet = content
            ? getCodeSnippet(content, b.line, 5)
            : undefined;
          return {
            path: b.file,
            line: b.line,
            codeSnippet: codeSnippet || undefined,
          };
        });

        duplicates.push({
          id: generateId(),
          type: "duplicate_code",
          severity: blocks.length > 3 ? "high" : "medium",
          title: `Duplicate code detected (${blocks.length} occurrences)`,
          description: `Found duplicate code block in ${blocks.length} locations.`,
          affectedFiles,
          suggestedFix: {
            description:
              "Extract duplicate code into a shared function or component",
            steps: [
              "Identify the common logic",
              "Create a reusable function or component",
              "Replace duplicate occurrences with the shared function",
              "Add proper TypeScript types",
            ],
            resources: [],
          },
          estimatedEffort: "1-2 hours",
          priority: blocks.length > 3 ? 7 : 4,
        });
      }
    }

    const totalBlocks = codeBlocks.length;
    const duplicateBlocks = duplicates.length;
    const percentage =
      totalBlocks > 0 ? (duplicateBlocks / totalBlocks) * 100 : 0;

    return { percentage, duplicates };
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private async calculateMaintainabilityIndex(
    projectPath: string
  ): Promise<number> {
    // MI = MAX(0, (171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(L)) * 100 / 171)
    // Using named constants for clarity
    // V = cyclomatic complexity
    // G = volume (lines of code)
    // L = comment ratio

    const files = await getFiles(projectPath, [".ts", ".tsx", ".js", ".jsx"]);
    let totalComplexity = 0;
    let totalLines = 0;
    let totalComments = 0;

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        const complexity = this.calculateCyclomaticComplexity(ast);
        totalComplexity += complexity;
        totalLines += content.split("\n").length;
        totalComments += this.countComments(ast);
      } catch (error) {
        console.error(
          `[CodeQuality] Error analyzing file ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other files
      }
    }

    if (totalLines === 0) {
      return 0;
    }

    const avgComplexity = totalComplexity / files.length;
    const avgVolume = totalLines / files.length;
    const commentRatio = totalLines > 0 ? totalComments / totalLines : 0;

    const mi = Math.max(
      0,
      ((MI_CONSTANT_171 -
        MI_VOLUME_FACTOR * Math.log(Math.max(avgComplexity, 1)) -
        MI_VOLUME_LOG_FACTOR * avgVolume -
        MI_COMMENT_FACTOR * Math.log(Math.max(1 - commentRatio, 0.01))) *
        MI_MAX_SCORE) /
        MI_CONSTANT_171
    );

    return Math.min(MI_MAX_SCORE, mi);
  }

  private countComments(ast: ts.SourceFile): number {
    let count = 0;

    ast.forEachChild((node) => {
      // Count single-line comments (//)
      const leadingComments = ts.getLeadingCommentRanges(
        ast.text,
        node.getFullStart()
      );
      const trailingComments = ts.getTrailingCommentRanges(
        ast.text,
        node.getEnd()
      );

      if (leadingComments) {
        count += leadingComments.length;
      }
      if (trailingComments) {
        count += trailingComments.length;
      }
    });

    return count;
  }

  private calculateOverallScore(metrics: {
    cyclomaticComplexity: number;
    codeDuplication: number;
    maintainabilityIndex: number;
  }): number {
    let score = 0;

    // Complexity score (lower is better)
    const complexityScore = Math.max(
      0,
      MI_MAX_SCORE - metrics.cyclomaticComplexity * COMPLEXITY_PENALTY
    );
    score += complexityScore * COMPLEXITY_WEIGHT;

    // Duplication score (lower is better)
    const duplicationScore = Math.max(
      0,
      MI_MAX_SCORE - metrics.codeDuplication * DUPLICATION_PENALTY
    );
    score += duplicationScore * DUPLICATION_WEIGHT;

    // Maintainability index (higher is better)
    const maintainabilityScore = metrics.maintainabilityIndex;
    score += maintainabilityScore * MAINTAINABILITY_WEIGHT;

    return Math.round(Math.min(MI_MAX_SCORE, score));
  }
}
