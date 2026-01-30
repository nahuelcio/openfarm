import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { glob } from "fast-glob";
import { OpenFarm } from "../../open-farm.js";

interface AgentsMdGeneratorOptions {
  workspace: string;
  provider: string;
  model?: string;
  onProgress?: (message: string) => void;
}

export async function generateAgentsMd(
  options: AgentsMdGeneratorOptions
): Promise<string> {
  const { workspace, provider, onProgress } = options;

  onProgress?.("Exploring repository structure...");
  const structure = await getProjectStructure(workspace);

  onProgress?.("Analyzing packages and workflows...");
  const packages = await analyzePackages(workspace);

  onProgress?.("Reading existing AGENTS.md if present...");
  const existingAgentsMd = await findFile(workspace, "AGENTS.md");

  onProgress?.("Generating AGENTS.md with OpenCode...");
  const agentsMd = await generateWithOpenCode(
    workspace,
    provider,
    structure,
    packages,
    existingAgentsMd
  );

  return agentsMd;
}

interface ProjectStructure {
  rootDirs: string[];
  keyFiles: string[];
  packages: string[];
  workflows: string[];
  packageJson: Record<string, unknown> | null;
}

async function getProjectStructure(workspace: string): Promise<string> {
  const patterns = [
    "**/*.ts",
    "**/*.tsx",
    "package.json",
    "tsconfig*.json",
    "AGENTS.md",
    "CONTRIBUTING.md",
    "README.md",
  ];

  const files = await glob(patterns, {
    cwd: workspace,
    ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
  });

  const rootDirs = new Set<string>();
  const keyFiles: string[] = [];

  for (const file of files) {
    const parts = file.split("/");
    if (parts.length === 1) {
      keyFiles.push(file);
    } else if (parts[0]) {
      rootDirs.add(parts[0]);
    }
  }

  return `
## Repository Structure

**Root directories:** ${[...rootDirs].join(", ")}

**Key files at root:** ${keyFiles.join(", ")}

**Packages found:** ${[...rootDirs].filter((d) => d.startsWith("packages/") || d.startsWith("@")).join(", ") || "None"}
`;
}

async function analyzePackages(workspace: string): Promise<string> {
  try {
    const pkgPath = join(workspace, "package.json");
    const content = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content);

    const deps = Object.keys(pkg.dependencies || {});
    const devDeps = Object.keys(pkg.devDependencies || {});
    const scripts = Object.keys(pkg.scripts || {});

    return `
## Root package.json

**Name:** ${pkg.name}
**Version:** ${pkg.version || "unknown"}
**Scripts:** ${scripts.join(", ")}
**Key dependencies:** ${deps.slice(0, 15).join(", ")}
**Dev dependencies:** ${devDeps.slice(0, 10).join(", ")}
`;
  } catch {
    return "";
  }
}

async function findFile(
  workspace: string,
  filename: string
): Promise<string | null> {
  try {
    const files = await glob(filename, { cwd: workspace });
    if (files.length > 0) {
      return await readFile(join(workspace, files[0]), "utf-8");
    }
  } catch {
    // Ignore
  }
  return null;
}

async function generateWithOpenCode(
  workspace: string,
  provider: string,
  structure: string,
  packages: string,
  existing: string | null
): Promise<string> {
  const client = new OpenFarm({ defaultProvider: provider });

  const systemPrompt = `You are an expert codebase analyst. Your task is to generate a comprehensive AGENTS.md file for this repository.

AGENTS.md is a configuration file that defines how AI coding agents should behave when working on this project. It includes:
- Core rules and guidelines
- Personality and tone
- Technical expertise
- Coding standards
- Architecture patterns
- Testing requirements
- Commit conventions

Output ONLY the markdown content for AGENTS.md. Do NOT include any explanations.`;

  const userPrompt = `Analyze this repository and generate a comprehensive AGENTS.md file.

${structure}

${packages}

${
  existing
    ? `
## Existing AGENTS.md Content (USE THIS AS REFERENCE):

${existing}
`
    : ""
}

## Instructions for AGENTS.md Generation:

Based on the repository structure above, generate an AGENTS.md file that includes:

1. **Core Rules**: Critical guidelines for working on this project (5-8 rules)
2. **Personality**: How the agent should communicate (tone, style)
3. **Language**: Any language-specific preferences
4. **Philosophy**: Core principles that guide development
5. **Expertise**: Technical areas the agent should know
6. **Behavior**: How the agent should interact with users and code
7. **Architecture Patterns**: How the project is structured (monorepo? packages?)
8. **Testing Standards**: Test requirements and coverage targets
9. **Code Style**: TypeScript conventions, import order, documentation
10. **Commit Standards**: Conventional commits format
11. **Decision Trees**: How to make common decisions (where to add code, when to create new packages, etc.)

For OpenFarm specifically, include:
- The "Sisyphus" orchestration agent concept
- Package architecture (packages/ directory with focused, single-purpose packages)
- Provider system (opencode, aider, claude, direct-api)
- Workflow system (YAML-based workflows in packages/core/workflows/)
- TUI using Ink + React 19
- Strict TypeScript with no 'any' type

Make it specific to THIS project, not generic. Use the actual package names, directories, and conventions found in the structure.

Output ONLY the AGENTS.md content in markdown format.`;

  const result = await client.execute({
    task: `${systemPrompt}\n\n${userPrompt}`,
    workspace,
    provider,
  });

  if (result.success && result.output) {
    return result.output;
  }

  return `# AGENTS.md

Failed to generate context: ${result.error || "Unknown error"}`;
}
