import * as ts from "typescript";
import type { CodePattern } from "../types";
import { generateId, getFiles, readFile } from "../utils";

export class DesignPatternsDetector {
  async detectDesignPatterns(projectPath: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
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

        // Singleton pattern
        const singletons = this.detectSingletonPattern(ast, file);
        patterns.push(...singletons);

        // Factory pattern
        const factories = this.detectFactoryPattern(ast, file);
        patterns.push(...factories);

        // Observer pattern
        const observers = this.detectObserverPattern(ast, file);
        patterns.push(...observers);

        // Strategy pattern
        const strategies = this.detectStrategyPattern(ast, file);
        patterns.push(...strategies);

        // Repository pattern
        const repositories = this.detectRepositoryPattern(ast, file);
        patterns.push(...repositories);
      } catch (_error) {}
    }

    return patterns;
  }

  private detectSingletonPattern(
    ast: ts.SourceFile,
    file: string
  ): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Look for classes with:
    // - private static instance
    // - private constructor
    // - public static getInstance()

    const classes = this.getClasses(ast);

    for (const cls of classes) {
      const hasPrivateConstructor = cls.members.some(
        (m) => ts.isConstructorDeclaration(m) && this.hasPrivateModifier(m)
      );
      const hasStaticInstance = cls.members.some(
        (m) =>
          ts.isPropertyDeclaration(m) &&
          this.hasStaticModifier(m) &&
          this.getName(m) === "instance"
      );
      const hasGetInstance = cls.members.some(
        (m) =>
          ts.isMethodDeclaration(m) &&
          this.hasStaticModifier(m) &&
          this.getName(m) === "getInstance"
      );

      if (hasPrivateConstructor && (hasStaticInstance || hasGetInstance)) {
        patterns.push({
          id: generateId(),
          type: "design_pattern",
          name: "Singleton",
          description: `Class ${this.getClassName(cls)} implements the Singleton pattern`,
          confidence: 0.9,
          location: {
            path: file,
            line:
              ts.getLineAndCharacterOfPosition(ast, cls.getStart()).line + 1,
          },
        });
      }
    }

    return patterns;
  }

  private detectFactoryPattern(
    ast: ts.SourceFile,
    file: string
  ): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Look for classes/functions with "create" or "factory" in the name
    const functions = this.getFunctions(ast);

    for (const fn of functions) {
      const name = this.getFunctionName(fn);
      if (
        name &&
        (name.toLowerCase().includes("create") ||
          name.toLowerCase().includes("factory"))
      ) {
        // Check if it returns an object and has conditional logic
        const hasReturn = this.hasConditionalReturn(fn);
        if (hasReturn) {
          patterns.push({
            id: generateId(),
            type: "design_pattern",
            name: "Factory Method",
            description: `Function ${name} implements the Factory pattern`,
            confidence: 0.7,
            location: {
              path: file,
              line:
                ts.getLineAndCharacterOfPosition(ast, fn.getStart()).line + 1,
            },
          });
        }
      }
    }

    return patterns;
  }

  private detectObserverPattern(
    ast: ts.SourceFile,
    file: string
  ): CodePattern[] {
    const patterns: CodePattern[] = [];

    const classes = this.getClasses(ast);

    for (const cls of classes) {
      const className = this.getClassName(cls);

      // Check for Observer (subscribe/unsubscribe methods)
      const hasSubscribe = cls.members.some((m) => {
        if (ts.isMethodDeclaration(m)) {
          const name = this.getName(m);
          return (
            name === "subscribe" || name === "unsubscribe" || name === "on"
          );
        }
        return false;
      });

      // Check for Subject (notify/emit methods)
      const hasNotify = cls.members.some((m) => {
        if (ts.isMethodDeclaration(m)) {
          const name = this.getName(m);
          return name === "notify" || name === "emit" || name === "publish";
        }
        return false;
      });

      if (hasSubscribe || hasNotify) {
        const patternName = hasSubscribe ? "Observer" : "Subject";
        patterns.push({
          id: generateId(),
          type: "design_pattern",
          name: patternName,
          description: `Class ${className} implements the Observer pattern`,
          confidence: 0.75,
          location: {
            path: file,
            line:
              ts.getLineAndCharacterOfPosition(ast, cls.getStart()).line + 1,
          },
        });
      }
    }

    return patterns;
  }

  private detectStrategyPattern(
    ast: ts.SourceFile,
    file: string
  ): CodePattern[] {
    const patterns: CodePattern[] = [];

    const classes = this.getClasses(ast);

    // Look for classes with "Strategy" in the name or methods with "execute"/"apply"
    for (const cls of classes) {
      const className = this.getClassName(cls);

      if (className.toLowerCase().includes("strategy")) {
        patterns.push({
          id: generateId(),
          type: "design_pattern",
          name: "Strategy",
          description: `Class ${className} implements the Strategy pattern`,
          confidence: 0.85,
          location: {
            path: file,
            line:
              ts.getLineAndCharacterOfPosition(ast, cls.getStart()).line + 1,
          },
        });
      }

      // Check for execute/apply method
      const hasExecuteMethod = cls.members.some((m) => {
        if (ts.isMethodDeclaration(m)) {
          const name = this.getName(m);
          return name === "execute" || name === "apply" || name === "process";
        }
        return false;
      });

      if (hasExecuteMethod && cls.heritageClauses) {
        // Check if it implements an interface
        patterns.push({
          id: generateId(),
          type: "design_pattern",
          name: "Strategy",
          description: `Class ${className} likely implements the Strategy pattern`,
          confidence: 0.65,
          location: {
            path: file,
            line:
              ts.getLineAndCharacterOfPosition(ast, cls.getStart()).line + 1,
          },
        });
      }
    }

    return patterns;
  }

  private detectRepositoryPattern(
    ast: ts.SourceFile,
    file: string
  ): CodePattern[] {
    const patterns: CodePattern[] = [];

    const classes = this.getClasses(ast);

    for (const cls of classes) {
      const className = this.getClassName(cls);

      if (className.toLowerCase().includes("repository")) {
        patterns.push({
          id: generateId(),
          type: "design_pattern",
          name: "Repository",
          description: `Class ${className} implements the Repository pattern`,
          confidence: 0.9,
          location: {
            path: file,
            line:
              ts.getLineAndCharacterOfPosition(ast, cls.getStart()).line + 1,
          },
        });
      }

      // Check for common repository methods
      const repoMethods = [
        "find",
        "findOne",
        "save",
        "delete",
        "update",
        "create",
      ];
      const hasRepoMethods = cls.members.filter((m) => {
        if (ts.isMethodDeclaration(m)) {
          const name = this.getName(m);
          return repoMethods.includes(name);
        }
        return false;
      });

      if (hasRepoMethods.length >= 3) {
        patterns.push({
          id: generateId(),
          type: "design_pattern",
          name: "Repository",
          description: `Class ${className} implements the Repository pattern (${hasRepoMethods.length} repository methods)`,
          confidence: 0.7,
          location: {
            path: file,
            line:
              ts.getLineAndCharacterOfPosition(ast, cls.getStart()).line + 1,
          },
        });
      }
    }

    return patterns;
  }

  // Helper methods
  private getClasses(ast: ts.SourceFile): ts.ClassDeclaration[] {
    const classes: ts.ClassDeclaration[] = [];

    ast.forEachChild((node) => {
      if (ts.isClassDeclaration(node)) {
        classes.push(node);
      }
    });

    return classes;
  }

  private getFunctions(ast: ts.SourceFile): ts.FunctionLikeDeclaration[] {
    const functions: ts.FunctionLikeDeclaration[] = [];

    ast.forEachChild((node) => {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isFunctionExpression(node)
      ) {
        functions.push(node);
      }
    });

    return functions;
  }

  private getClassName(cls: ts.ClassDeclaration): string {
    return cls.name ? cls.name.text : "AnonymousClass";
  }

  private getFunctionName(fn: ts.FunctionLikeDeclaration): string | null {
    if (ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) {
      return fn.name && ts.isIdentifier(fn.name) ? fn.name.text : null;
    }
    return null;
  }

  private getName(node: ts.Node): string {
    if (ts.isIdentifier(node)) {
      return node.text;
    }
    if (ts.isPrivateIdentifier(node)) {
      return node.text;
    }
    return "";
  }

  private hasPrivateModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined;
    return modifiers
      ? modifiers.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword)
      : false;
  }

  private hasStaticModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined;
    return modifiers
      ? modifiers.some((m) => m.kind === ts.SyntaxKind.StaticKeyword)
      : false;
  }

  private hasConditionalReturn(fn: ts.FunctionLikeDeclaration): boolean {
    let hasCondition = false;
    let hasReturn = false;

    const visit = (node: ts.Node) => {
      if (ts.isIfStatement(node) || ts.isSwitchStatement(node)) {
        hasCondition = true;
      }
      if (ts.isReturnStatement(node)) {
        hasReturn = true;
      }
      ts.forEachChild(node, visit);
    };

    visit(fn);
    return hasCondition && hasReturn;
  }
}
