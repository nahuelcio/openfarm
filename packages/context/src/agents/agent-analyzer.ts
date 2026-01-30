import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildUserPrompt,
  EVALUATOR_SYSTEM_MESSAGE,
  PRIMER_SYSTEM_MESSAGE,
} from "../prompts/primer-prompts";
import type {
  AgentAnalysisOptions,
  ExplorationResult,
  GeneratedContext,
} from "../types/index";

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

export interface LLMExecutor {
  execute(options: {
    task: string;
    workspace: string;
    provider?: string;
    model?: string;
    temperature?: number;
  }): Promise<ExecutionResult>;
}

export class AgentAnalyzer {
  constructor(
    private readonly workspace: string,
    private readonly llmExecutor?: LLMExecutor
  ) {}

  async explore(): Promise<ExplorationResult> {
    const fileStructure = await this.getFileStructure();
    const packageJson = await this.getPackageJson();
    const existingInstructions = await this.findExistingInstructions();
    const techStack = this.detectTechStack(packageJson, fileStructure);

    return {
      fileStructure,
      packageJson,
      existingInstructions,
      techStack,
      architecture: this.detectArchitecture(fileStructure),
    };
  }

  async analyzeWithAgent(
    exploration: ExplorationResult,
    options: AgentAnalysisOptions = {}
  ): Promise<GeneratedContext> {
    if (!this.llmExecutor) {
      throw new Error("LLM executor not provided. Pass it in the constructor.");
    }

    const provider = options.provider || "direct-api";
    const userPrompt = buildUserPrompt(this.workspace);
    const fullTask = `${PRIMER_SYSTEM_MESSAGE}\n\n${userPrompt}`;

    const result = await this.llmExecutor.execute({
      task: fullTask,
      workspace: this.workspace,
      provider,
      model: options.model,
      temperature: options.temperature,
    });

    if (!(result.success && result.output)) {
      throw new Error(result.error || "Failed to generate context");
    }

    return {
      agentsMd: result.output,
      summary: this.extractSummary(result.output),
      techStack: exploration.techStack || [],
      conventions: this.extractConventions(result.output),
      metadata: {
        analyzedAt: new Date().toISOString(),
        provider,
        filesExplored: this.countFiles(exploration.fileStructure),
      },
    };
  }

  async synthesizeContext(
    provider = "direct-api",
    model?: string
  ): Promise<string> {
    if (!this.llmExecutor) {
      throw new Error("LLM executor not provided");
    }

    const exploration = await this.explore();
    const techStackStr = exploration.techStack?.join(", ") || "Unknown";
    const summary = `Repository at ${this.workspace} with tech stack: ${techStackStr}`;

    const prompt = `${PRIMER_SYSTEM_MESSAGE}\n\nSynthesize this repository info into a brief summary:\n${summary}`;

    const result = await this.llmExecutor.execute({
      task: prompt,
      workspace: this.workspace,
      provider,
      model,
    });

    return result.output || "";
  }

  async evaluateContext(
    context: string,
    provider = "direct-api"
  ): Promise<{ score: number; verdict: string; feedback: string }> {
    if (!this.llmExecutor) {
      throw new Error("LLM executor not provided");
    }

    const prompt = `${EVALUATOR_SYSTEM_MESSAGE}\n\nEvaluate this context:\n\n${context}`;

    const result = await this.llmExecutor.execute({
      task: prompt,
      workspace: this.workspace,
      provider,
    });

    try {
      const parsed = JSON.parse(result.output || "{}");
      return {
        score: parsed.score || 0,
        verdict: parsed.verdict || "unknown",
        feedback: parsed.feedback || "",
      };
    } catch {
      return {
        score: 50,
        verdict: "needs-improvement",
        feedback: "Could not parse evaluation response",
      };
    }
  }

  private async getFileStructure(): Promise<string> {
    const { glob } = await import("fast-glob");
    const patterns = [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "package.json",
      "tsconfig*.json",
      "**/package.json",
    ];

    const files = await glob(patterns, {
      cwd: this.workspace,
      ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
    });

    const rootDirs = new Set<string>();
    const keyFiles: string[] = [];

    for (const file of files) {
      const parts = file.split("/");
      if (parts.length === 1) {
        keyFiles.push(file);
      } else if (parts[0] && parts[0] !== "src") {
        rootDirs.add(parts[0]);
      }
    }

    const rootDirsStr = [...rootDirs].join(", ") || "src/";
    const keyFilesStr = keyFiles.join(", ");

    let output = `## File Structure\n\n**Root directories:** ${rootDirsStr}\n**Key files:** ${keyFilesStr}\n\n`;

    const mainDirs = await glob(["*/"], {
      cwd: this.workspace,
      onlyDirectories: true,
    });

    output += "**Main directories:**\n";
    for (const dir of mainDirs.slice(0, 10)) {
      output += `- ${dir}\n`;
    }

    return output;
  }

  private async getPackageJson(): Promise<string | undefined> {
    try {
      const pkgPath = join(this.workspace, "package.json");
      const content = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(content);

      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      const depsStr = deps.slice(0, 10).join(", ");
      const devDepsStr = devDeps.slice(0, 5).join(", ");
      const scriptsStr = Object.keys(pkg.scripts || {}).join(", ");
      const ellipsis = deps.length > 10 ? "..." : "";
      const devEllipsis = devDeps.length > 5 ? "..." : "";
      const version = pkg.version || "unknown";

      return `package.json:\n- name: ${pkg.name}\n- version: ${version}\n- scripts: ${scriptsStr}\n- dependencies: ${depsStr}${ellipsis}\n- devDependencies: ${devDepsStr}${devEllipsis}`;
    } catch {
      return undefined;
    }
  }

  private async findExistingInstructions(): Promise<string | undefined> {
    const { glob } = await import("fast-glob");
    const patterns = [
      ".github/copilot-instructions.md",
      "AGENTS.md",
      ".cursorrules",
      "CLAUDE.md",
      ".claude.md",
      "README.md",
    ];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, { cwd: this.workspace });
        if (files.length > 0) {
          const content = await readFile(
            join(this.workspace, files[0]),
            "utf-8"
          );
          return `Found ${files[0]}:\n\n${content.slice(0, 500)}`;
        }
      } catch {
        // Continue searching
      }
    }

    return undefined;
  }

  private detectTechStack(
    packageJson: string | undefined,
    fileStructure: string
  ): string[] {
    const stack: string[] = [];

    if (packageJson) {
      if (packageJson.includes("react")) {
        stack.push("React");
      }
      if (packageJson.includes("next")) {
        stack.push("Next.js");
      }
      if (packageJson.includes("vue")) {
        stack.push("Vue");
      }
      if (packageJson.includes("express")) {
        stack.push("Express");
      }
      if (packageJson.includes("fastify")) {
        stack.push("Fastify");
      }
      if (packageJson.includes("bun")) {
        stack.push("Bun");
      }
      if (packageJson.includes("pnpm")) {
        stack.push("pnpm");
      }
      if (packageJson.includes("turbo")) {
        stack.push("Turborepo");
      }
    }

    if (fileStructure.includes("src/app")) {
      stack.push("Next.js App Router");
    }
    if (fileStructure.includes("src/components")) {
      stack.push("React Components");
    }
    if (fileStructure.includes("packages/")) {
      stack.push("Monorepo");
    }

    return stack.length > 0 ? stack : ["TypeScript"];
  }

  private detectArchitecture(fileStructure: string): string {
    if (fileStructure.includes("packages/")) {
      return "Monorepo";
    }
    if (
      fileStructure.includes("src/app") &&
      fileStructure.includes("src/components")
    ) {
      return "Next.js with Components Pattern";
    }
    if (
      fileStructure.includes("src/controllers") ||
      fileStructure.includes("src/routes")
    ) {
      return "MVC/Express Pattern";
    }
    return "Standard TypeScript Project";
  }

  private extractSummary(content: string): string {
    const match = content.match(
      /#+\s*Project\s*Overview\s*\n([\s\S]*?)(\n#|$)/i
    );
    if (match) {
      return match[1].trim().slice(0, 200);
    }
    return "";
  }

  private extractConventions(content: string): string[] {
    const conventions: string[] = [];
    const patterns = [
      /conventions?:\s*([\s\S]*?)(?:\n#|$)/i,
      /coding\s*standards?:\s*([\s\S]*?)(?:\n#|$)/i,
      /style:\s*([\s\S]*?)(?:\n#|$)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const lines = match[1]
          .split("\n")
          .filter((l) => l.trim().startsWith("-"));
        conventions.push(...lines.slice(0, 3).map((l) => l.trim().slice(1)));
      }
    }

    return conventions.slice(0, 5);
  }

  private countFiles(structure: string): number {
    const matches = structure.match(/[-*]\s*\S+/g);
    return matches ? matches.length : 0;
  }
}
