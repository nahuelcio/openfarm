export const PRIMER_SYSTEM_MESSAGE =
  "You are an expert codebase analyst. Your task is to generate a concise AGENTS.md file. Use the available tools (glob, view, grep) to explore the codebase. Output ONLY the final markdown content, no explanations.";

export const PRIMER_USER_PROMPT =
  "Analyze this codebase at $repoPath and generate an AGENTS.md file.\n\nUse tools to explore:\n1. Check for existing instruction files: glob for **/{.github/copilot-instructions.md,AGENT.md,CLAUDE.md,.cursorrules,README.md}\n2. Identify the tech stack: look at package.json, tsconfig.json, pyproject.toml, Cargo.toml, etc.\n3. Understand the structure: list key directories\n\nGenerate concise instructions (~20-50 lines) covering:\n- Tech stack and architecture\n- Build/test commands\n- Project-specific conventions\n- Key files and directories\n\nOutput ONLY the markdown content for AGENTS.md.";

export const EVALUATOR_SYSTEM_MESSAGE =
  "You are a strict evaluator. Return JSON with keys: verdict (pass|fail|unknown), score (0-100), rationale. Do not include any other text.";

export const EVALUATOR_JUDGE_PROMPT =
  "Evaluate which response best matches the expectation.\n\nExpectation: $expectation\n\nResponse A (without custom instructions):\n$withoutInstructions\n\nResponse B (with custom instructions):\n$withInstructions\n\nReturn JSON only.";

export function buildUserPrompt(repoPath: string): string {
  return PRIMER_USER_PROMPT.replace("$repoPath", repoPath);
}

export function buildJudgePrompt(
  expectation: string,
  withoutInstructions: string,
  withInstructions: string
): string {
  return EVALUATOR_JUDGE_PROMPT.replace("$expectation", expectation)
    .replace("$withoutInstructions", withoutInstructions)
    .replace("$withInstructions", withInstructions);
}
