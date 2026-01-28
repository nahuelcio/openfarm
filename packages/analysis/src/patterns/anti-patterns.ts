import * as ts from "typescript";
import type { CodePattern } from "../types";
import { generateId, getFiles, readFile } from "../utils";

export class AntiPatternsDetector {
  async detectAntiPatterns(projectPath: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    try {
      // 1. Spaghetti code
      const spaghettiCode = await this.detectSpaghettiCode(projectPath);
      patterns.push(...spaghettiCode);

      // 2. Golden hammer
      const goldenHammer = await this.detectGoldenHammer(projectPath);
      patterns.push(...goldenHammer);

      // 3. Boat anchor
      const boatAnchor = await this.detectBoatAnchor(projectPath);
      patterns.push(...boatAnchor);
    } catch (error) {
      console.error("Error detecting anti-patterns:", error);
    }

    return patterns;
  }

  private async detectSpaghettiCode(
    projectPath: string
  ): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    // Spaghetti code indicators:
    // - Deeply nested control structures
    // - Goto-like jumping (in JS, using return/break/continue extensively)

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        // Check nesting depth
        const maxNestingDepth = this.calculateMaxNestingDepth(ast);
        if (maxNestingDepth > 5) {
          patterns.push({
            id: generateId(),
            type: "anti_pattern",
            name: "Spaghetti Code (Deep Nesting)",
            description: `File ${file} has deep nesting (max depth: ${maxNestingDepth}). Consider refactoring.`,
            severity: "medium",
            confidence: 0.7,
            location: { path: file },
            suggestedRefactoring:
              "Extract nested blocks into separate functions",
          });
        }

        // Check control flow complexity
        const controlFlowComplexity = this.calculateControlFlowComplexity(ast);
        if (controlFlowComplexity > 20) {
          patterns.push({
            id: generateId(),
            type: "anti_pattern",
            name: "Spaghetti Code (Complex Control Flow)",
            description: `File ${file} has complex control flow (${controlFlowComplexity} decision points).`,
            severity: "high",
            confidence: 0.8,
            location: { path: file },
            suggestedRefactoring: "Use guard clauses and early returns",
          });
        }
      } catch (_error) {}
    }

    return patterns;
  }

  private async detectGoldenHammer(
    projectPath: string
  ): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    // Golden hammer: using the same solution for every problem
    // Look for heavy overuse of specific patterns or libraries

    const importCounts = new Map<string, number>();

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        // Count imports
        ast.forEachChild((node) => {
          if (ts.isImportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier;
            if (ts.isStringLiteral(moduleSpecifier)) {
              const moduleName = moduleSpecifier.text;
              const count = importCounts.get(moduleName) || 0;
              importCounts.set(moduleName, count + 1);
            }
          }
        });
      } catch (_error) {}
    }

    // Find heavily used imports across many files
    for (const [moduleName, count] of importCounts.entries()) {
      const fileCount = count;
      const totalFiles = files.length;

      // If a module is used in more than 80% of files, it might be a golden hammer
      if (fileCount > totalFiles * 0.8 && fileCount > 10) {
        patterns.push({
          id: generateId(),
          type: "anti_pattern",
          name: "Golden Hammer",
          description: `Module '${moduleName}' is imported in ${fileCount} files (${((fileCount / totalFiles) * 100).toFixed(0)}%). Consider if there are better alternatives.`,
          severity: "low",
          confidence: 0.6,
          location: { path: `Multiple files (${fileCount})` },
          suggestedRefactoring:
            "Review if alternative solutions could be used for specific cases",
        });
      }
    }

    return patterns;
  }

  private async detectBoatAnchor(projectPath: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    // Boat anchor: code that is unused or provides little value
    // Look for functions/classes that are never called/instantiated

    const declaredItems = new Map<
      string,
      { name: string; file: string; line: number }
    >();
    const usedItems = new Set<string>();

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        // Track declarations
        ast.forEachChild((node) => {
          if (ts.isFunctionDeclaration(node) && node.name) {
            declaredItems.set(node.name.text, {
              name: node.name.text,
              file,
              line:
                ts.getLineAndCharacterOfPosition(ast, node.getStart()).line + 1,
            });
          } else if (ts.isClassDeclaration(node) && node.name) {
            declaredItems.set(node.name.text, {
              name: node.name.text,
              file,
              line:
                ts.getLineAndCharacterOfPosition(ast, node.getStart()).line + 1,
            });
          }
        });

        // Track usage (simple heuristic - identifier references)
        ast.forEachChild((node) => {
          if (ts.isIdentifier(node)) {
            usedItems.add(node.text);
          }
        });
      } catch (_error) {}
    }

    // Find unused items
    for (const [name, item] of declaredItems) {
      if (!usedItems.has(name)) {
        // Skip if it's an exported function/class (might be used in other files)
        // For now, we'll just report all unused items
        patterns.push({
          id: generateId(),
          type: "anti_pattern",
          name: "Boat Anchor",
          description: `Function/Class '${name}' in ${item.file}:${item.line} appears to be unused.`,
          severity: "low",
          confidence: 0.5,
          location: { path: item.file, line: item.line },
          suggestedRefactoring:
            "Remove the unused code or verify if it should be documented as part of a public API",
        });
      }
    }

    return patterns;
  }

  private calculateMaxNestingDepth(ast: ts.SourceFile): number {
    let maxDepth = 0;
    let currentDepth = 0;

    const visit = (node: ts.Node) => {
      if (
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isTryStatement(node) ||
        ts.isCatchClause(node)
      ) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
        ts.forEachChild(node, visit);
        currentDepth--;
      } else {
        ts.forEachChild(node, visit);
      }
    };

    visit(ast);
    return maxDepth;
  }

  private calculateControlFlowComplexity(ast: ts.SourceFile): number {
    let complexity = 0;

    const visit = (node: ts.Node) => {
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
      }
      ts.forEachChild(node, visit);
    };

    visit(ast);
    return complexity;
  }
}
