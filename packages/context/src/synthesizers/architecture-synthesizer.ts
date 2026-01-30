import type { AnalysisResult } from "@openfarm/analysis";
import type {
  PrimingOptions,
  RawRepositoryData,
  RepoContext,
  SynthesizedData,
} from "../types/index.js";

export interface Synthesizer {
  synthesize(
    analysisResult: AnalysisResult,
    rawData: RawRepositoryData,
    options: PrimingOptions | undefined,
    result: SynthesizedData
  ): Promise<void>;
}

export class ArchitectureSynthesizer implements Synthesizer {
  async synthesize(
    analysisResult: AnalysisResult,
    rawData: RawRepositoryData,
    _options: PrimingOptions | undefined,
    result: SynthesizedData
  ): Promise<void> {
    const { details, summary: _summary } = analysisResult;
    const { fileStructure, packageJson } = rawData;

    const packages = this.detectPackages(fileStructure, packageJson);
    const pattern = this.detectArchitecturePattern(packages, fileStructure);
    const layering = this.detectLayering(details.architecture, packages);
    const keyPatterns = this.extractKeyPatterns(details.architecture);

    result.context = {
      ...result.context,
      projectName: packageJson?.name || analysisResult.projectId,
      description: this.generateDescription(analysisResult),
      language: "TypeScript",
      framework: this.detectFramework(details.architecture),
      packageManager:
        (packageJson?.packageManager as "bun" | "npm" | "yarn" | "pnpm") ||
        "bun",
      structure: {
        packages,
        rootDirectories: fileStructure?.directories || [],
        entryPoints: this.detectEntryPoints(packages, fileStructure),
        testDirectories: fileStructure?.testFiles || [],
      },
      architecture: {
        pattern,
        layering,
        keyPatterns,
        couplingLevel: this.calculateCouplingLevel(details.architecture),
      },
    };
  }

  private detectPackages(
    fileStructure: RawRepositoryData["fileStructure"],
    packageJson: RawRepositoryData["packageJson"]
  ): RepoContext["structure"]["packages"] {
    const packages: RepoContext["structure"]["packages"] = [];

    if (fileStructure?.configFiles) {
      const packageCount = fileStructure.configFiles.filter(
        (f) => f.includes("package.json") && f !== "package.json"
      ).length;

      packages.push({
        name: packageJson?.name || "root",
        path: ".",
        type: packageCount > 0 ? "monorepo" : "application",
        dependencies: Object.keys(packageJson?.dependencies || {}).length,
        exportsCount: 0,
      });
    }

    return packages;
  }

  private detectArchitecturePattern(
    packages: RepoContext["structure"]["packages"],
    fileStructure: RawRepositoryData["fileStructure"]
  ): "monorepo" | "polyrepo" | "single-package" {
    if (packages.length > 1) {
      return "monorepo";
    }
    if (
      (fileStructure?.directories || []).some((d) => d.startsWith("packages/"))
    ) {
      return "monorepo";
    }
    return "single-package";
  }

  private detectLayering(
    architecture: AnalysisResult["details"]["architecture"],
    packages: RepoContext["structure"]["packages"]
  ): string[] {
    const layers: string[] = [];

    if (architecture.patterns.includes("layer")) {
      layers.push("presentation", "domain", "infrastructure");
    }

    if (packages.length > 0) {
      layers.push("packages");
    }

    if (architecture.patterns.includes("hexagonal")) {
      layers.push("core", "adapters", "application");
    }

    return layers;
  }

  private extractKeyPatterns(
    architecture: AnalysisResult["details"]["architecture"]
  ): string[] {
    const patterns: string[] = [];

    if (architecture.patterns.includes("clean")) {
      patterns.push("Clean Architecture");
    }
    if (architecture.patterns.includes("hexagonal")) {
      patterns.push("Hexagonal/Ports & Adapters");
    }
    if (architecture.patterns.includes("ddd")) {
      patterns.push("Domain-Driven Design");
    }
    if (architecture.patterns.includes("monolith")) {
      patterns.push("Monolith");
    }
    if (architecture.patterns.includes("microservice")) {
      patterns.push("Microservices");
    }

    return patterns;
  }

  private detectFramework(
    architecture: AnalysisResult["details"]["architecture"]
  ): string | undefined {
    if (architecture.patterns.includes("react")) {
      return "React";
    }
    if (architecture.patterns.includes("next")) {
      return "Next.js";
    }
    if (architecture.patterns.includes("express")) {
      return "Express";
    }
    if (architecture.patterns.includes("fastify")) {
      return "Fastify";
    }

    return undefined;
  }

  private detectEntryPoints(
    packages: RepoContext["structure"]["packages"],
    fileStructure: RawRepositoryData["fileStructure"]
  ): string[] {
    const entryPoints: string[] = [];

    if (fileStructure?.keyFiles?.includes("package.json")) {
      entryPoints.push("src/index.ts");
    }
    if (fileStructure?.keyFiles?.some((f) => f.includes("main.ts"))) {
      entryPoints.push("src/main.ts");
    }

    return entryPoints;
  }

  private calculateCouplingLevel(
    architecture: AnalysisResult["details"]["architecture"]
  ): "low" | "medium" | "high" {
    const cycleCount = architecture.cycles?.length || 0;

    if (cycleCount === 0 && architecture.coupling < 0.3) {
      return "low";
    }
    if (cycleCount < 5 && architecture.coupling < 0.6) {
      return "medium";
    }
    return "high";
  }

  private generateDescription(analysisResult: AnalysisResult): string {
    const { summary, details } = analysisResult;
    const patterns = details.architecture.patterns;

    let description = "A TypeScript project";

    if (patterns.includes("react") || patterns.includes("next")) {
      description += " with React/Next.js";
    } else if (patterns.includes("express") || patterns.includes("fastify")) {
      description += " with Express/Fastify";
    }

    if (patterns.includes("ddd")) {
      description += " following Domain-Driven Design principles";
    }

    description += `. Overall quality score: ${summary.overallScore}/100`;

    return description;
  }
}
