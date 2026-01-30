import { promises as fs } from "node:fs";
import { relative, resolve } from "node:path";
import { DEFAULT_FALLBACK_LLM_MODEL, SYSTEM_PROMPTS } from "@openfarm/config";
import { OpenCodeConfigService } from "@openfarm/core";
import { StepAction } from "@openfarm/core/constants/actions";
import { err, map, ok, type Result } from "@openfarm/result";
import { llmService } from "@openfarm/runner-utils/llm";
import { sanitizePath } from "@openfarm/runner-utils/utils/git-config";
import type { StepExecutionRequest } from "../types";
import { type ReviewCodeConfig, validateConfig } from "./validation";

interface ReviewContext {
  repoPath: string;
  podName?: string;
}

interface FileContent {
  path: string;
  content: string;
}

const DEFAULT_FILE_PATTERNS = "*.ts,*.tsx,*.js,*.jsx";
const DEFAULT_MODEL = DEFAULT_FALLBACK_LLM_MODEL;
const KUBECTL_TIMEOUT_MS = 30_000; // 30 seconds
const SYSTEM_PROMPT = SYSTEM_PROMPTS.codeReviewer;

/**
 * Executes review.code action using Copilot API directly.
 * Uses Railway oriented programming pattern with Result composition.
 */
export async function executeReviewCode(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger, flags } = request;

  if (step.action !== StepAction.REVIEW_CODE) {
    return err(new Error(`Unknown review action: ${step.action}`));
  }

  const validationResult = validateConfig<ReviewCodeConfig>(
    StepAction.REVIEW_CODE,
    step.config
  );

  if (!validationResult.ok) {
    return validationResult;
  }

  const configWithDefaults = applyDefaults(validationResult.value);
  if (!configWithDefaults.ok) {
    return configWithDefaults;
  }

  const previewCheck = await checkPreviewMode(
    configWithDefaults.value,
    flags.previewMode,
    logger
  );
  if (!previewCheck.ok) {
    return previewCheck;
  }

  const validatedPrompt = validatePrompt(previewCheck.value);
  if (!validatedPrompt.ok) {
    return validatedPrompt;
  }

  const config = validatedPrompt.value;

  const filesResult = await getFilesToReview(context, config, logger);
  if (!filesResult.ok) {
    return filesResult;
  }

  const checkedFiles = await checkFilesNotEmpty(
    filesResult.value,
    config,
    logger
  );
  if (!checkedFiles.ok) {
    return checkedFiles;
  }

  // If no files found and not in strict mode, return success with informative message
  if (checkedFiles.value.length === 0) {
    await logger(
      "No files to review matching the specified patterns. Skipping review (non-strict mode)."
    );
    return ok(
      "Review skipped: No files found matching the specified patterns."
    );
  }

  const contentsResult = await readFiles(context, checkedFiles.value, logger);
  if (!contentsResult.ok) {
    return contentsResult;
  }

  return performReview(config, contentsResult.value, logger);
}

/**
 * Routes review actions to the appropriate executor.
 */
export async function executeReviewAction(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step } = request;

  if (step.action === StepAction.REVIEW_CODE) {
    return executeReviewCode(request);
  }

  return err(new Error(`Unknown review action: ${step.action}`));
}

// Configuration & Validation

function applyDefaults(config: ReviewCodeConfig): Result<ReviewCodeConfig> {
  return ok({
    prompt: config.prompt,
    filePatterns: config.filePatterns || DEFAULT_FILE_PATTERNS,
    excludePatterns: config.excludePatterns,
    model: config.model || DEFAULT_MODEL,
    strictMode: config.strictMode !== false,
  });
}

async function checkPreviewMode(
  config: ReviewCodeConfig,
  previewMode: boolean,
  logger: (msg: string) => Promise<void>
): Promise<Result<ReviewCodeConfig>> {
  if (previewMode) {
    const dryRunReport = generateReviewDryRunReport(config);
    await logger("[Dry Run] Review step - preview generated");
    // Return error with detailed report to stop execution but provide useful info
    return err(
      new Error(`Preview mode: Code review skipped\n\n${dryRunReport}`)
    );
  }
  return ok(config);
}

/**
 * Generates a detailed dry run report for the code review step.
 */
function generateReviewDryRunReport(config: ReviewCodeConfig): string {
  const lines: string[] = [];

  lines.push("# Dry Run Report: Code Review Step");
  lines.push("");
  lines.push("## Overview");
  lines.push("- **Mode**: Preview (review not executed)");
  lines.push(`- **Model**: ${config.model || DEFAULT_MODEL}`);
  lines.push(
    `- **Strict Mode**: ${config.strictMode !== false ? "Yes" : "No"}`
  );
  lines.push("");

  lines.push("## File Patterns");
  lines.push(`- **Include**: ${config.filePatterns || DEFAULT_FILE_PATTERNS}`);
  lines.push(`- **Exclude**: ${config.excludePatterns || "(none)"}`);
  lines.push("");

  lines.push("## Review Rules Preview");
  lines.push("");
  if (config.prompt) {
    lines.push("The following rules would be applied:");
    lines.push("");
    lines.push("```");
    // Truncate if too long
    const maxLength = 1000;
    if (config.prompt.length > maxLength) {
      lines.push(config.prompt.substring(0, maxLength));
      lines.push(
        `\n... [truncated, ${config.prompt.length - maxLength} more characters]`
      );
    } else {
      lines.push(config.prompt);
    }
    lines.push("```");
  } else {
    lines.push("WARNING: No review rules specified (prompt field is empty)");
  }
  lines.push("");

  lines.push("## What Would Happen");
  lines.push("");
  lines.push("1. Files matching patterns would be collected");
  lines.push("2. File contents would be read");
  lines.push("3. Contents sent to AI for review against rules");
  lines.push("4. Review results would be returned (PASSED/FAILED)");
  lines.push("");

  lines.push("## Estimated Time");
  lines.push("- Review execution: 1-5 minutes (depends on file count)");
  lines.push("");

  lines.push("---");
  lines.push("*This is a dry run preview. No review was performed.*");

  return lines.join("\n");
}

function validatePrompt(config: ReviewCodeConfig): Result<ReviewCodeConfig> {
  if (!config.prompt) {
    return err(
      new Error(
        "Code review requires a 'prompt' field with the review rules/guidelines"
      )
    );
  }
  return ok(config);
}

// File Operations

async function getFilesToReview(
  context: ReviewContext,
  config: ReviewCodeConfig,
  logger: (msg: string) => Promise<void>
): Promise<Result<string[]>> {
  await logger("Finding files to review...");

  const stagedResult = await getStagedFiles(context, logger);
  if (!stagedResult.ok) {
    return stagedResult;
  }

  const filtered = filterFilesByPatterns(stagedResult.value, config);

  await logger(
    `Found ${filtered.length} file(s) matching patterns: ${config.filePatterns}`
  ).catch(() => {});

  return ok(filtered);
}

function filterFilesByPatterns(
  files: string[],
  config: ReviewCodeConfig
): string[] {
  const include = parsePatterns(config.filePatterns || DEFAULT_FILE_PATTERNS);
  const exclude = parsePatterns(config.excludePatterns || "");
  return files.filter(
    (f) => matchesPatterns(f, include) && !matchesPatterns(f, exclude)
  );
}

function parsePatterns(patterns: string): string[] {
  return patterns
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function matchesPatterns(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const escapedPattern = escapeRegexSpecialChars(pattern);
    const regexPattern = escapedPattern
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(file) || file.endsWith(pattern.replace("*", ""));
  });
}

function escapeRegexSpecialChars(pattern: string): string {
  return pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

async function getStagedFiles(
  context: ReviewContext,
  logger: (msg: string) => Promise<void>
): Promise<Result<string[]>> {
  const command = "git diff --cached --name-only --diff-filter=ACMR";

  if (context.podName) {
    const result = await runInPod(
      context.podName,
      context.repoPath,
      command,
      logger,
      KUBECTL_TIMEOUT_MS
    );
    if (!result.ok) {
      return result;
    }
    return ok(parseFileList(result.value));
  }

  return executeLocally(context.repoPath, command, logger);
}

async function runInPod(
  podName: string,
  repoPath: string,
  command: string,
  _logger: (msg: string) => Promise<void>,
  timeoutMs: number
): Promise<Result<string>> {
  try {
    const sanitizedRepoPath = sanitizePath(repoPath);
    const sanitizedCommand = sanitizeShellCommand(command);
    const shellCommand = `cd "${sanitizedRepoPath}" && ${sanitizedCommand}`;

    return executeKubectlCommand(
      podName,
      shellCommand,
      timeoutMs,
      `Command: ${command}`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to sanitize path: ${errorMsg}`));
  }
}

async function executeKubectlCommand(
  podName: string,
  shellCommand: string,
  timeoutMs: number,
  errorContext: string
): Promise<Result<string>> {
  const { spawn } = await import("node:child_process");

  return new Promise((resolve) => {
    const kubectlArgs = [
      "exec",
      podName,
      "-n",
      "minions-farm",
      "-c",
      "claude-code",
      "--",
      "sh",
      "-c",
      shellCommand,
    ];

    const process = spawn("kubectl", kubectlArgs);
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      process.kill();
      resolve(err(new Error(`${errorContext} timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(ok(stdout));
      } else {
        resolve(
          err(new Error(`${errorContext}: ${stderr || "Unknown error"}`))
        );
      }
    });

    process.on("error", (error) => {
      clearTimeout(timeout);
      resolve(err(new Error(`${errorContext}: ${error.message}`)));
    });
  });
}

function sanitizeShellCommand(command: string): string {
  // Remove dangerous shell metacharacters
  // Only allow alphanumeric, spaces, and safe characters: -_./=
  const dangerousChars = /[;&|`$(){}[\]<>'"\\]/g;
  if (dangerousChars.test(command)) {
    throw new Error(`Invalid characters in command: ${command}`);
  }
  return command;
}

async function executeLocally(
  repoPath: string,
  command: string,
  _logger: (msg: string) => Promise<void>
): Promise<Result<string[]>> {
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(command, { cwd: repoPath });
    return ok(parseFileList(stdout));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to execute command: ${errorMsg}`));
  }
}

function parseFileList(output: string): string[] {
  return output
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
}

async function readFiles(
  context: ReviewContext,
  files: string[],
  logger: (msg: string) => Promise<void>
): Promise<Result<FileContent[]>> {
  await logger(`Reading ${files.length} file(s)...`);

  const results = await Promise.all(
    files.map((file) => readSingleFile(context, file, logger))
  );

  const errors = results.filter((r) => !r.ok);
  if (errors.length > 0) {
    return errors[0] as Result<FileContent[]>;
  }

  const contents = results
    .filter((r): r is { ok: true; value: FileContent } => r.ok)
    .map((r) => r.value);
  return ok(contents);
}

async function readSingleFile(
  context: ReviewContext,
  file: string,
  logger: (msg: string) => Promise<void>
): Promise<Result<FileContent>> {
  const filePathResult = validateFilePath(context.repoPath, file);
  if (!filePathResult.ok) {
    return filePathResult;
  }

  const filePath = filePathResult.value;

  if (context.podName) {
    const contentResult = await readFromPod(context.podName, filePath, logger);
    return map(contentResult, (c) => ({ path: file, content: c }));
  }

  const contentResult = await readFromLocal(filePath, logger);
  return map(contentResult, (c) => ({ path: file, content: c }));
}

function validateFilePath(repoPath: string, file: string): Result<string> {
  try {
    if (file.includes("..") || file.startsWith("/")) {
      return err(new Error(`Invalid file path: ${file}`));
    }
    const resolvedPath = resolve(repoPath, file);
    const resolvedRepo = resolve(repoPath);
    const relativePath = relative(resolvedRepo, resolvedPath);
    if (relativePath.startsWith("..") || relativePath === "..") {
      return err(new Error(`Path traversal detected: ${file}`));
    }
    return ok(sanitizePath(resolvedPath, resolvedRepo));
  } catch (error) {
    return err(
      new Error(
        `Failed to validate file path: ${error instanceof Error ? error.message : String(error)}`
      )
    );
  }
}

async function readFromPod(
  podName: string,
  filePath: string,
  _logger: (msg: string) => Promise<void>
): Promise<Result<string>> {
  try {
    const sanitizedPath = sanitizePath(filePath);
    return executeKubectlCommand(
      podName,
      `cat "${sanitizedPath}"`,
      KUBECTL_TIMEOUT_MS,
      `File read: ${filePath}`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to sanitize file path: ${errorMsg}`));
  }
}

async function readFromLocal(
  filePath: string,
  _logger: (msg: string) => Promise<void>
): Promise<Result<string>> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return ok(content);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to read file: ${errorMsg}`));
  }
}

// Review Operations

async function checkFilesNotEmpty(
  files: string[],
  config: ReviewCodeConfig,
  logger: (msg: string) => Promise<void>
): Promise<Result<string[]>> {
  if (files.length === 0) {
    await logger("No files to review matching the specified patterns");
    // If strictMode is false, allow empty files (will be handled by caller)
    if (!config.strictMode) {
      return ok([]);
    }
    return err(new Error("No files to review"));
  }
  return ok(files);
}

async function performReview(
  config: ReviewCodeConfig,
  fileContents: FileContent[],
  logger: (msg: string) => Promise<void>
): Promise<Result<string>> {
  await logger(`Reviewing ${fileContents.length} file(s)...`);

  const reviewPrompt = buildReviewPrompt(config.prompt!, fileContents);

  await logger(`Calling Copilot API (model: ${config.model})...`);

  try {
    const openCodeConfigService = await OpenCodeConfigService.create();
    const resolved = await openCodeConfigService.resolveModel("server", config);
    const apiKey = await openCodeConfigService.getProviderApiKey(
      resolved.provider,
      "server"
    );

    const result = await llmService.complete({
      prompt: reviewPrompt,
      systemPrompt: SYSTEM_PROMPT,
      provider: {
        provider: resolved.provider,
        model: resolved.model,
        apiKey: apiKey || undefined,
      },
    });

    return parseReviewResponse(result.text, config.strictMode ?? true, logger);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await logger(`Failed to call Copilot API: ${errorMsg}`);
    return err(new Error(`Code review failed: ${errorMsg}`));
  }
}

function buildReviewPrompt(rulesPrompt: string, files: FileContent[]): string {
  const filesSection = files
    .map((f) => `## File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");
  return `${rulesPrompt}\n\n---\n\nPlease review the following code files against the rules and guidelines above:\n\n${filesSection}\n\n---\n\nRespond with:\n- "STATUS: PASSED" if all code complies with the rules\n- "STATUS: FAILED" followed by a detailed list of violations if any issues are found\n\nFor each violation, specify:\n1. The file and line number\n2. The rule that was violated\n3. What needs to be fixed`;
}

function parseReviewResponse(
  response: string,
  strictMode: boolean,
  _logger: (msg: string) => Promise<void>
): Result<string> {
  const normalized = response.trim().toUpperCase();
  if (isPassed(normalized)) {
    return ok(response);
  }
  if (isFailed(normalized)) {
    return err(new Error(`Code review failed:\n${response}`));
  }
  if (strictMode) {
    return err(
      new Error(
        `Ambiguous review result (strict mode enabled). Response:\n${response}`
      )
    );
  }
  return ok(response);
}

function isPassed(response: string): boolean {
  return (
    response.includes("STATUS: PASSED") ||
    response.includes("CODE REVIEW PASSED") ||
    (response.startsWith("PASSED") && !response.includes("FAILED"))
  );
}

function isFailed(response: string): boolean {
  return (
    response.includes("STATUS: FAILED") ||
    response.includes("CODE REVIEW FAILED") ||
    response.includes("VIOLATIONS FOUND") ||
    response.startsWith("FAILED")
  );
}
