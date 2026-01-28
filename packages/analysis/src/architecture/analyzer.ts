import * as ts from "typescript";
import type {
  ArchitecturalSmell,
  ArchitectureAnalysis,
  DependencyGraph,
} from "../types";
import { generateId, getFiles, readFile } from "../utils";

export class ArchitectureAnalyzer {
  async analyze(projectPath: string): Promise<ArchitectureAnalysis> {
    const results: ArchitectureAnalysis = {
      overallScore: 0,
      patterns: [],
      smells: [],
      metrics: {},
      suggestions: [],
    };

    try {
      // 1. Dependency graph
      const dependencyGraph = await this.buildDependencyGraph(projectPath);
      results.metrics.dependencies = dependencyGraph;

      // 2. Coupling analysis
      const coupling = await this.analyzeCoupling(projectPath);
      results.metrics.coupling = coupling;

      // 3. Architectural smells
      const smells = await this.detectArchitecturalSmells(
        projectPath,
        dependencyGraph
      );
      results.smells.push(...smells);

      // 4. Calculate overall score
      results.overallScore = this.calculateArchitectureScore(results);
    } catch (error) {
      console.error("Error in architecture analysis:", error);
      throw error;
    }

    return results;
  }

  private async buildDependencyGraph(
    projectPath: string
  ): Promise<DependencyGraph> {
    const files = await getFiles(projectPath, [".ts", ".tsx"]);
    const graph = new Map<string, Set<string>>();

    // Initialize graph
    for (const file of files) {
      graph.set(file, new Set());
    }

    // Build dependencies
    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        const imports = this.getImports(ast);

        for (const imp of imports) {
          // Resolve import to file path
          const resolvedPath = await this.resolveImportPath(
            file,
            imp,
            projectPath
          );
          if (resolvedPath && graph.has(resolvedPath)) {
            graph.get(file)?.add(resolvedPath);
          }
        }
      } catch (_error) {}
    }

    // Calculate metrics
    const totalDependencies = Array.from(graph.values()).reduce(
      (sum, deps) => sum + deps.size,
      0
    );
    const averageDependencies =
      graph.size > 0 ? totalDependencies / graph.size : 0;
    const maxDependencies = Math.max(
      ...Array.from(graph.values()).map((deps) => deps.size)
    );
    const isolatedModules = Array.from(graph.entries()).filter(
      ([_, deps]) => deps.size === 0
    ).length;

    return {
      graph,
      metrics: {
        totalDependencies,
        averageDependencies,
        maxDependencies,
        isolatedModules,
      },
    };
  }

  private async analyzeCoupling(projectPath: string): Promise<{
    afferentCoupling: Record<string, number>;
    efferentCoupling: Record<string, number>;
    instability: Record<string, number>;
  }> {
    const files = await getFiles(projectPath, [".ts", ".tsx"]);
    const graph = new Map<string, Set<string>>();

    // Build dependency graph
    for (const file of files) {
      graph.set(file, new Set());
    }

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        const imports = this.getImports(ast);

        for (const imp of imports) {
          const resolvedPath = await this.resolveImportPath(
            file,
            imp,
            projectPath
          );
          if (resolvedPath && graph.has(resolvedPath)) {
            graph.get(file)?.add(resolvedPath);
          }
        }
      } catch (_error) {}
    }

    // Calculate coupling
    const afferentCoupling: Record<string, number> = {};
    const efferentCoupling: Record<string, number> = {};
    const instability: Record<string, number> = {};

    // Initialize
    for (const file of files) {
      afferentCoupling[file] = 0;
      efferentCoupling[file] = 0;
    }

    // Count efferent coupling (outgoing dependencies)
    for (const [file, dependencies] of graph.entries()) {
      efferentCoupling[file] = dependencies.size;
    }

    // Count afferent coupling (incoming dependencies)
    for (const [_file, dependencies] of graph.entries()) {
      for (const dep of dependencies) {
        afferentCoupling[dep] = (afferentCoupling[dep] || 0) + 1;
      }
    }

    // Calculate instability: I = Ce / (Ca + Ce)
    for (const file of files) {
      const Ce = efferentCoupling[file] || 0;
      const Ca = afferentCoupling[file] || 0;
      instability[file] = Ca + Ce > 0 ? Ce / (Ca + Ce) : 0;
    }

    return { afferentCoupling, efferentCoupling, instability };
  }

  private async detectArchitecturalSmells(
    projectPath: string,
    dependencyGraph: DependencyGraph
  ): Promise<ArchitecturalSmell[]> {
    const smells: ArchitecturalSmell[] = [];

    // 1. Circular dependencies
    const circularDeps = this.detectCircularDependencies(dependencyGraph.graph);
    smells.push(...circularDeps);

    // 2. Shotgun surgery
    const shotgunSurgery = await this.detectShotgunSurgery(
      projectPath,
      dependencyGraph
    );
    smells.push(...shotgunSurgery);

    // 3. Unstable dependencies
    const unstableDeps = await this.detectUnstableDependencies(projectPath);
    smells.push(...unstableDeps);

    return smells;
  }

  private detectCircularDependencies(
    graph: Map<string, Set<string>>
  ): ArchitecturalSmell[] {
    const smells: ArchitecturalSmell[] = [];

    // Find cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const findCycles = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          findCycles(neighbor, [...path, neighbor]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }

      recursionStack.delete(node);
    };

    for (const [file] of graph.entries()) {
      if (!visited.has(file)) {
        findCycles(file, [file]);
      }
    }

    // Create smell for each cycle
    for (const cycle of cycles) {
      smells.push({
        id: generateId(),
        type: "circular_dependency",
        severity: "high",
        title: "Circular dependency detected",
        description: `Circular dependency: ${cycle.join(" → ")}. This can cause issues with module loading and maintainability.`,
        affectedFiles: cycle.map((f) => ({ path: f })),
        suggestedFix: {
          description: "Break the circular dependency by refactoring",
          steps: [
            "Identify the common functionality",
            "Extract it into a separate module",
            "Make both modules depend on the new module",
            "Ensure the dependency is one-directional",
          ],
          resources: [],
        },
        priority: 9,
        estimatedEffort: "1-2 days",
      });
    }

    return smells;
  }

  private async detectShotgunSurgery(
    _projectPath: string,
    dependencyGraph: DependencyGraph
  ): Promise<ArchitecturalSmell[]> {
    const smells: ArchitecturalSmell[] = [];

    // Build reverse dependency map (who imports this file?)
    const reverseDependencies = new Map<string, Set<string>>();
    for (const [file, dependencies] of dependencyGraph.graph.entries()) {
      for (const dep of dependencies) {
        if (!reverseDependencies.has(dep)) {
          reverseDependencies.set(dep, new Set());
        }
        reverseDependencies.get(dep)?.add(file);
      }
    }

    // Find files with many dependents (high afferent coupling)
    const highCouplingFiles = Array.from(reverseDependencies.entries())
      .filter(([_, dependents]) => dependents.size > 10)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10); // Limit to top 10

    for (const [file, dependents] of highCouplingFiles) {
      smells.push({
        id: generateId(),
        type: "shotgun_surgery",
        severity: "medium",
        title: "High coupling detected",
        description: `File ${file} is imported by ${dependents.size} other files. Changes will require modifications in many places.`,
        affectedFiles: Array.from(dependents).map((f) => ({ path: f })),
        suggestedFix: {
          description: "Reduce coupling by introducing abstraction layers",
          steps: [
            "Identify why so many files depend on this one",
            "Consider introducing interfaces or abstractions",
            "Apply Dependency Inversion Principle",
            "Break down into smaller, more focused modules",
          ],
          resources: [],
        },
        priority: 6,
        estimatedEffort: "2-3 days",
      });
    }

    return smells;
  }

  private async detectUnstableDependencies(
    projectPath: string
  ): Promise<ArchitecturalSmell[]> {
    const smells: ArchitecturalSmell[] = [];
    const files = await getFiles(projectPath, [".ts", ".tsx"]);

    // Simplified check: if a utility/core file depends on application-specific files
    const coreDirs = ["lib", "utils", "core", "common", "shared"];
    const appDirs = ["app", "pages", "components", "features"];

    for (const file of files) {
      try {
        const content = await readFile(file);
        const ast = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        const imports = this.getImports(ast);

        // Check if this is a core/util file
        const isCoreFile = coreDirs.some(
          (dir) => file.includes(`/${dir}/`) || file.includes(`\\${dir}\\`)
        );
        if (!isCoreFile) {
          continue;
        }

        // Check if it imports from app-specific directories
        for (const imp of imports) {
          const isAppImport = appDirs.some((dir) => imp.includes(dir));
          if (isAppImport) {
            smells.push({
              id: generateId(),
              type: "unstable_dependency",
              severity: "medium",
              title: "Unstable dependency detected",
              description: `Core file ${file} imports from application-specific code (${imp}). This violates dependency rules.`,
              affectedFiles: [{ path: file }],
              suggestedFix: {
                description:
                  "Move shared logic to core utilities and make core dependencies stable",
                steps: [
                  "Identify the functionality being imported",
                  "Extract it to a core utility module",
                  "Make the core file independent of application code",
                ],
                resources: [],
              },
              priority: 5,
              estimatedEffort: "1-2 hours",
            });
          }
        }
      } catch (_error) {}
    }

    return smells;
  }

  private calculateArchitectureScore(analysis: ArchitectureAnalysis): number {
    let score = 100;

    // Deduct for smells
    const criticalSmells = analysis.smells.filter(
      (s) => s.severity === "critical"
    ).length;
    const highSmells = analysis.smells.filter(
      (s) => s.severity === "high"
    ).length;
    const mediumSmells = analysis.smells.filter(
      (s) => s.severity === "medium"
    ).length;
    const lowSmells = analysis.smells.filter(
      (s) => s.severity === "low"
    ).length;

    score -= criticalSmells * 25;
    score -= highSmells * 15;
    score -= mediumSmells * 8;
    score -= lowSmells * 3;

    // Check dependency metrics
    if (analysis.metrics.dependencies) {
      const maxDeps = analysis.metrics.dependencies.metrics.maxDependencies;
      if (maxDeps > 20) {
        score -= 10;
      } else if (maxDeps > 15) {
        score -= 5;
      }
    }

    return Math.max(0, score);
  }

  private getImports(ast: ts.SourceFile): string[] {
    const imports: string[] = [];

    ast.forEachChild((node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          imports.push(moduleSpecifier.text);
        }
      }
    });

    return imports;
  }

  private async resolveImportPath(
    fromFile: string,
    importPath: string,
    _projectPath: string
  ): Promise<string | null> {
    // Simple implementation - in production, use proper path resolution
    if (importPath.startsWith(".")) {
      // Relative import
      const path = require("node:path");
      const resolved = path.resolve(path.dirname(fromFile), importPath);

      // Try common extensions
      const extensions = [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        "/index.ts",
        "/index.js",
      ];
      for (const ext of extensions) {
        const fullPath = resolved + ext;
        const fs = require("node:fs");
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }

      return null;
    }

    // Absolute imports would need proper package resolution
    // For now, return null for non-relative imports
    return null;
  }
}
