// ============================================================================
// System Prompts - Inspirado en Primer pero adaptado para OpenFarm
// ============================================================================

export const SYSTEM_PROMPTS = {
  /** Prompt principal para análisis de código y generación de contexto */
  CODEBASE_ANALYST: `You are an expert codebase analyst. Your task is to analyze the repository and generate comprehensive context documentation for AI assistants.

Use the available tools (glob, view, grep) to explore the codebase thoroughly. You should:

1. **Identify the tech stack**: Check package.json, tsconfig.json, pyproject.toml, Cargo.toml, requirements.txt, go.mod, etc.
2. **Understand the architecture**: Look at file structure, main entry points, and how components interact
3. **Find existing instructions**: glob for **/{.github/copilot-instructions.md,AGENTS.md,.cursorrules,CLAUDE.md,.claude.md}
4. **Detect conventions**: Look at code style, naming patterns, testing approaches

Generate a comprehensive document covering:
- Tech stack and frameworks
- Architecture and design patterns
- Build/test/lint commands
- Project-specific conventions and rules
- Key files and directories with their purposes
- Any gotchas or important notes for AI assistants

Output the content in markdown format, ready to be saved as AGENTS.md.`,

  /** Prompt para síntesis de contexto resumido */
  CONTEXT_SYNTHESIS: `You are analyzing a repository to create context for AI coding assistants.

Based on the exploration results, synthesize the information into a concise summary (5-10 lines) that captures:
- What the project does
- Main technologies used
- Critical conventions AI should follow

Return ONLY a JSON object with keys: summary, techStack (array), conventions (array).`,

  /** Prompt para evaluar calidad de contexto */
  CONTEXT_EVALUATOR: `You are a strict evaluator of AI context documentation. 

Given a repository context document, evaluate its quality:
- Does it cover the tech stack?
- Are conventions clearly stated?
- Is the information accurate?
- Is it actionable for an AI assistant?

Return JSON with keys: score (0-100), verdict (pass|fail|needs-improvement), feedback (string with suggestions).`,
} as const;

// ============================================================================
// Tool Definitions - Simulan las herramientas del Copilot SDK
// ============================================================================

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ToolDefinitions {
  glob: {
    name: "glob";
    description: "Find files matching a glob pattern";
    inputSchema: {
      type: "object";
      properties: { pattern: { type: "string" } };
    };
  };
  view: {
    name: "view";
    description: "Read the contents of a file";
    inputSchema: { type: "object"; properties: { path: { type: "string" } } };
  };
  grep: {
    name: "grep";
    description: "Search for text patterns in files";
    inputSchema: {
      type: "object";
      properties: { pattern: { type: "string" } };
    };
  };
  list_directory: {
    name: "list_directory";
    description: "List contents of a directory";
    inputSchema: { type: "object"; properties: { path: { type: "string" } } };
  };
}

// ============================================================================
// Configuración de Prompts por Provider
// ============================================================================

export interface AgentPromptConfig {
  systemMessage: string;
  userMessage: string;
  temperature: number;
  maxTokens: number;
}

export const AGENT_CONFIGS = {
  /** Configuración para Claude (Anthropic) */
  claude: {
    systemPrompt: SYSTEM_PROMPTS.CODEBASE_ANALYST,
    temperature: 0.3,
  },

  /** Configuración para OpenCode */
  opencode: {
    systemPrompt: SYSTEM_PROMPTS.CODEBASE_ANALYST,
    temperature: 0.3,
  },

  /** Configuración para Aider */
  aider: {
    systemPrompt: SYSTEM_PROMPTS.CODEBASE_ANALYST,
    temperature: 0.3,
  },
} as const;

// ============================================================================
// Prompt Templates
// ============================================================================

export const PROMPT_TEMPLATES = {
  /** Template para análisis inicial del repo */
  ANALYSIS_TEMPLATE: (
    repoPath: string,
    exploreResults: ExplorationResult
  ): string => `
Analyze this repository at \`${repoPath}\` and generate a comprehensive AGENTS.md file.

## Exploration Results:
${exploreResults.fileStructure}
${exploreResults.packageJson ? `\n### package.json:\n${exploreResults.packageJson}` : ""}
${exploreResults.existingInstructions ? `\n### Existing Instructions Found:\n${exploreResults.existingInstructions}` : ""}

## Instructions:
Use the tools to explore further if needed, then generate the AGENTS.md content.

## Output Format:
Generate a complete AGENTS.md file with these sections:
1. **Project Overview** - What this project does
2. **Tech Stack** - Languages, frameworks, tools
3. **Architecture** - Design patterns, structure, key components
4. **Conventions** - Code style, naming, testing approach
5. **Commands** - Build, test, lint, dev commands
6. **Key Files** - Important files and their purposes
7. **Notes** - Any gotchas or important considerations

Output ONLY the markdown content, no explanations or markdown code blocks.`,

  /** Template para síntesis rápida */
  SYNTHESIS_TEMPLATE: (techStack: string[], summary: string): string => `
Based on this repository:
- Summary: ${summary}
- Tech Stack: ${techStack.join(", ")}

Generate a concise context summary (5-10 lines) for an AI coding assistant. Focus on what the AI needs to know to be effective in this codebase.

Respond with JSON only:
\`\`\`json
{
  "summary": "...",
  "techStack": [...],
  "keyConventions": [...],
  "criticalNotes": [...]
}
\`\`\``,

  /** Template para extensión de contexto existente */
  EXTEND_TEMPLATE: (existingContent: string, newInfo: string): string => `
The repository already has some context documentation:
\`\`\`
${existingContent}
\`\`\`

New information discovered:
\`\`\`
${newInfo}
\`\`\`

Update and extend the documentation to incorporate the new information while keeping it concise and actionable. Maintain the same format and style.

Output ONLY the updated markdown content.`,
};

// ============================================================================
// Types de Resultado
// ============================================================================

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
  provider?: keyof typeof AGENT_CONFIGS;
  model?: string;
  customSystemPrompt?: string;
  explorationDepth?: "quick" | "normal" | "thorough";
  includeGitHistory?: boolean;
}

// ============================================================================
// Utils para formateo
// ============================================================================

export function buildAnalysisSystemMessage(customPrompt?: string): string {
  return customPrompt || SYSTEM_PROMPTS.CODEBASE_ANALYST;
}

export function buildAnalysisUserMessage(
  repoPath: string,
  exploration: ExplorationResult,
  customInstructions?: string
): string {
  const baseTemplate = PROMPT_TEMPLATES.ANALYSIS_TEMPLATE(
    repoPath,
    exploration
  );

  if (customInstructions) {
    return `${baseTemplate}\n\n## Additional Instructions:\n${customInstructions}`;
  }

  return baseTemplate;
}

export function parseAgentResponse(content: string): GeneratedContext {
  // Extraer el markdown de AGENTS.md
  const mdMatch = content.match(/```markdown\n([\s\S]*?)\n```/);
  const agentsMd = mdMatch ? mdMatch[1] : content;

  return {
    agentsMd,
    summary: extractSummary(agentsMd),
    techStack: extractTechStack(agentsMd),
    conventions: extractConventions(agentsMd),
    metadata: {
      analyzedAt: new Date().toISOString(),
      provider: "unknown",
      filesExplored: 0,
    },
  };
}

function extractSummary(md: string): string {
  const match = md.match(/## Project Overview\s*\n([\s\S]*?)(\n## |$)/);
  return match ? match[1].trim() : "";
}

function extractTechStack(md: string): string[] {
  const match = md.match(/## Tech Stack\s*\n([\s\S]*?)(\n## |$)/);
  if (!match) {
    return [];
  }

  return match[1]
    .split("\n")
    .filter((line) => line.match(/^-/))
    .map((line) => line.replace(/^-\s*/, "").trim());
}

function extractConventions(md: string): string[] {
  const match = md.match(/## Conventions\s*\n([\s\S]*?)(\n## |$)/);
  if (!match) {
    return [];
  }

  return match[1]
    .split("\n")
    .filter((line) => line.match(/^-/))
    .map((line) => line.replace(/^-\s*/, "").trim())
    .slice(0, 5);
}
