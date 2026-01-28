import * as ts from "typescript";
import type { CodeSmell } from "../types";
import {
  countLines,
  generateId,
  getCodeSnippet,
  getFiles,
  readFile,
} from "../utils";

export class CodeSmellDetector {
  async detectCodeSmells(projectPath: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];

    try {
      const longFunctions = await this.detectLongFunctions(projectPath);
      smells.push(...longFunctions);

      const godClasses = await this.detectGodClasses(projectPath);
      smells.push(...godClasses);

      const largeFiles = await this.detectLargeFiles(projectPath);
      smells.push(...largeFiles);

      const magicNumbers = await this.detectMagicNumbers(projectPath);
      smells.push(...magicNumbers);
    } catch (error) {
      console.error("Error detecting code smells:", error);
    }

    return smells;
  }

  private async detectLongFunctions(projectPath: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        ast.forEachChild((node) => {
          if (
            ts.isFunctionDeclaration(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isArrowFunction(node) ||
            ts.isFunctionExpression(node)
          ) {
            const name = this.getFunctionName(node);
            if (!name) {
              return;
            }

            const lines = this.countFunctionLines(node, content);
            if (lines > 50) {
              const lineNumber =
                ts.getLineAndCharacterOfPosition(ast, node.getStart()).line + 1;
              const codeSnippet = getCodeSnippet(content, lineNumber, 5);
              smells.push({
                id: generateId(),
                type: "long_function",
                severity: lines > 100 ? "high" : "medium",
                title: `Long function: ${name}`,
                description: `Function ${name} in ${file} is ${lines} lines long. Consider refactoring into smaller functions.`,
                affectedFiles: [
                  {
                    path: file,
                    line: lineNumber,
                    codeSnippet: codeSnippet || undefined,
                  },
                ],
                suggestedFix: {
                  description:
                    "Extract smaller functions with single responsibilities",
                  steps: [
                    "Identify logical blocks within the function",
                    "Extract each block into a separate function",
                    "Give functions descriptive names",
                    "Reduce parameters by using objects",
                  ],
                  resources: [],
                },
                priority: lines > 100 ? 8 : 5,
              });
            }
          }
        });
      } catch (error) {
        console.error(
          `[CodeSmells] Error detecting long parameter lists in ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other files
      }
    }

    return smells;
  }

  private async detectGodClasses(projectPath: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        ast.forEachChild((node) => {
          if (ts.isClassDeclaration(node) && node.name) {
            const metrics = this.getClassMetrics(node, content);

            // God class indicators
            if (
              metrics.methodCount > 20 ||
              metrics.propertyCount > 20 ||
              metrics.linesOfCode > 500 ||
              metrics.cyclomaticComplexity > 50
            ) {
              const lineNumber =
                ts.getLineAndCharacterOfPosition(ast, node.getStart()).line + 1;
              const codeSnippet = getCodeSnippet(content, lineNumber, 5);
              smells.push({
                id: generateId(),
                type: "god_class",
                severity: "high",
                title: `God class: ${node.name.text}`,
                description: `Class ${node.name.text} in ${file} has too many responsibilities (${metrics.methodCount} methods, ${metrics.linesOfCode} LOC).`,
                affectedFiles: [
                  {
                    path: file,
                    line: lineNumber,
                    codeSnippet: codeSnippet || undefined,
                  },
                ],
                suggestedFix: {
                  description: "Apply Single Responsibility Principle",
                  steps: [
                    "Identify distinct responsibilities",
                    "Extract each responsibility into a separate class",
                    "Use composition over inheritance",
                    "Consider design patterns (Strategy, Factory, etc.)",
                  ],
                  resources: [],
                },
                estimatedEffort: "2-4 days",
                priority: 9,
              });
            }
          }
        });
      } catch (error) {
        console.error(
          `[CodeSmells] Error detecting god classes in ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other files
      }
    }

    return smells;
  }

  private async detectLargeFiles(projectPath: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    for (const file of files) {
      try {
        const content = await readFile(file);
        const lines = countLines(content);

        if (lines > 500) {
          // For large files, show the first few lines
          const codeSnippet = getCodeSnippet(content, 1, 10);
          smells.push({
            id: generateId(),
            type: "large_file",
            severity: lines > 1000 ? "high" : "medium",
            title: `Large file: ${file}`,
            description: `File ${file} is ${lines} lines long. Large files are harder to maintain and understand.`,
            affectedFiles: [
              {
                path: file,
                line: 1,
                codeSnippet: codeSnippet || undefined,
              },
            ],
            suggestedFix: {
              description: "Split the file into smaller, focused modules",
              steps: [
                "Identify related functions/classes",
                "Group them into logical modules",
                "Create separate files for each module",
                "Update imports accordingly",
              ],
              resources: [],
            },
            estimatedEffort: lines > 1000 ? "4-8 hours" : "2-4 hours",
            priority: lines > 1000 ? 6 : 4,
          });
        }
      } catch (error) {
        console.error(
          `[CodeSmells] Error detecting large files in ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other files
      }
    }

    return smells;
  }

  private async detectMagicNumbers(projectPath: string): Promise<CodeSmell[]> {
    const smells: CodeSmell[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    // Common safe constants
    const safeConstants = new Set([0, 1, -1, 2, 10, 100, 1000]);

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        ast.forEachChild((node) => {
          if (ts.isNumericLiteral(node)) {
            const value = Number.parseFloat(node.text);

            // Skip safe constants
            if (safeConstants.has(value)) {
              return;
            }

            // Skip if in a type or interface
            const parent = node.parent;
            if (ts.isTypeNode(parent)) {
              return;
            }

            const lineNumber =
              ts.getLineAndCharacterOfPosition(ast, node.getStart()).line + 1;
            const codeSnippet = getCodeSnippet(content, lineNumber, 3);
            smells.push({
              id: generateId(),
              type: "magic_numbers",
              severity: "low",
              title: `Magic number: ${value}`,
              description: `Magic number ${value} found in ${file}. Consider using a named constant.`,
              affectedFiles: [
                {
                  path: file,
                  line: lineNumber,
                  codeSnippet: codeSnippet || undefined,
                },
              ],
              suggestedFix: {
                description: "Replace magic numbers with named constants",
                steps: [
                  "Create a constant with a descriptive name",
                  "Replace the magic number with the constant",
                  "Document the purpose of the constant",
                ],
                resources: [],
              },
              priority: 2,
            });
          }
        });
      } catch (error) {
        console.error(
          `[CodeSmells] Error detecting magic numbers in ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Continue processing other files
      }
    }

    // Deduplicate by line
    const uniqueSmells = new Map<string, CodeSmell>();
    for (const smell of smells) {
      if (smell.affectedFiles.length > 0) {
        const key = `${smell.affectedFiles[0]!.path}:${smell.affectedFiles[0]!.line || 0}`;
        uniqueSmells.set(key, smell);
      }
    }

    return Array.from(uniqueSmells.values()).slice(0, 50); // Limit to 50
  }

  private getFunctionName(node: ts.FunctionLike): string | null {
    if ("name" in node && node.name && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (
      ts.isPropertyDeclaration(node.parent) &&
      ts.isIdentifier(node.parent.name)
    ) {
      return node.parent.name.text;
    }
    return "anonymous";
  }

  private countFunctionLines(
    node: ts.FunctionLike,
    fileContent: string
  ): number {
    const startPos = node.getStart();
    const endPos = node.getEnd();

    const startLine = fileContent.substring(0, startPos).split("\n").length;
    const endLine = fileContent.substring(0, endPos).split("\n").length;

    return endLine - startLine + 1;
  }

  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const visit = (n: ts.Node) => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
        case ts.SyntaxKind.SwitchStatement: {
          const switchStmt = n as ts.SwitchStatement;
          if (switchStmt.caseBlock) {
            complexity += switchStmt.caseBlock.clauses.length;
          }
          break;
        }
      }

      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  private getClassMetrics(
    node: ts.ClassDeclaration,
    content: string
  ): {
    methodCount: number;
    propertyCount: number;
    linesOfCode: number;
    cyclomaticComplexity: number;
  } {
    let methodCount = 0;
    let propertyCount = 0;

    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member)) {
        methodCount++;
      } else if (ts.isPropertyDeclaration(member)) {
        propertyCount++;
      }
    });

    const startPos = node.getStart();
    const endPos = node.getEnd();
    const startLine = content.substring(0, startPos).split("\n").length;
    const endLine = content.substring(0, endPos).split("\n").length;
    const linesOfCode = endLine - startLine + 1;

    // Calculate cyclomatic complexity of the class by summing complexity of all methods
    let cyclomaticComplexity = 1; // Base complexity for the class
    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member)) {
        cyclomaticComplexity += this.calculateCyclomaticComplexity(member);
      }
    });

    return {
      methodCount,
      propertyCount,
      linesOfCode,
      cyclomaticComplexity,
    };
  }
}
