import { DEFAULT_FALLBACK_LLM_MODEL, SYSTEM_PROMPTS } from "@openfarm/config";
import { OpenCodeConfigService } from "@openfarm/core";
import { StepAction } from "@openfarm/core/constants/actions";
import { ok, type Result } from "@openfarm/result";
import { llmService } from "../../../llm";
import type { StepExecutionRequest } from "../types";
import { type AgentRouterConfig, validateConfig } from "./validation";

/**
 * Router decision result structure
 */
export interface RouterDecision {
  requiresCodeAnalysis: boolean;
  strategy: "opencode" | "direct-llm" | "cache" | "documentation";
  reasoning: string;
  codeScope?: "full" | "summary" | "targeted";
  targetFiles?: string[];
}

/**
 * Executes agent.router action.
 * Analyzes the user's question to determine if code analysis is needed.
 *
 * @param request - Step execution request
 * @returns Result with router decision as JSON string
 */
export async function executeAgentRouter(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger } = request;
  const { config } = step;

  const validation = validateConfig<AgentRouterConfig>(
    StepAction.AGENT_ROUTER,
    config
  );
  if (!validation.ok) {
    return validation;
  }
  const validatedConfig = validation.value;

  const { workItem } = context;

  await logger("[Agent Router] Analyzing question to determine strategy...");

  // Build the analysis prompt
  const question = workItem.title || "";
  const _contextText = workItem.preInstructions || "No previous context.";
  const chatHistory = workItem.chatMessages
    ? JSON.parse(workItem.chatMessages || "[]")
    : [];

  // Extract recent conversation context (last 3 messages)
  const _recentContext = chatHistory
    .slice(-3)
    .map((msg: { role?: string; content?: string }) => {
      const role = msg.role || "user";
      const content = msg.content || "";
      return `${role}: ${content}`;
    })
    .join("\n");

  // Check custom rules first (if configured)
  if (validatedConfig.rules && validatedConfig.rules.length > 0) {
    await logger(
      `[Agent Router] Checking ${validatedConfig.rules.length} custom routing rules...`
    );
    for (const rule of validatedConfig.rules) {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(question)) {
          await logger(
            `[Agent Router] Rule matched: pattern="${rule.pattern}", requiresCode=${rule.requiresCode}`
          );
          const decision: RouterDecision = {
            requiresCodeAnalysis: rule.requiresCode,
            strategy:
              rule.strategy ||
              (rule.requiresCode ? "opencode" : "direct-llm") ||
              validatedConfig.defaultStrategy ||
              "opencode",
            reasoning: `Matched custom rule: ${rule.pattern}`,
            codeScope:
              rule.codeScope || validatedConfig.defaultCodeScope || "summary",
          };
          return ok(JSON.stringify(decision));
        }
      } catch (regexError) {
        await logger(
          `[Agent Router] Invalid regex pattern in rule: ${rule.pattern} - ${regexError instanceof Error ? regexError.message : String(regexError)}`
        );
      }
    }
  }

  // Use custom prompt if provided, otherwise use default
  const analysisPrompt = validatedConfig.prompt;

  if (!analysisPrompt) {
    await logger(
      "[Agent Router] ERROR: No prompt configured. The workflow MUST provide a prompt in step.config.prompt"
    );
    return ok(
      JSON.stringify({
        requiresCodeAnalysis: validatedConfig.defaultRequiresCode ?? false,
        strategy: validatedConfig.defaultStrategy || "direct-llm",
        reasoning:
          "No routing prompt configured. Using defaults. Please add 'prompt' to agent.router config.",
        codeScope: validatedConfig.defaultCodeScope || "summary",
      })
    );
  }

  const systemPrompt = validatedConfig.systemPrompt || SYSTEM_PROMPTS.router;

  const model = validatedConfig.model || DEFAULT_FALLBACK_LLM_MODEL;
  const temperature = validatedConfig.temperature ?? 0.7;

  await logger(
    `[Agent Router] Calling LLM (${model}) for analysis with temperature ${temperature}...`
  );

  try {
    const openCodeConfigService = request.services.db
      ? new OpenCodeConfigService(request.services.db)
      : await OpenCodeConfigService.create();

    const resolved = await openCodeConfigService.resolveModel(
      "server",
      validatedConfig,
      context.agentConfiguration
    );

    const apiKey = await openCodeConfigService.getProviderApiKey(
      resolved.provider,
      "server"
    );

    const result = await llmService.complete({
      prompt: analysisPrompt,
      systemPrompt,
      provider: {
        provider: resolved.provider,
        model: resolved.model,
        apiKey: apiKey || undefined,
      },
      temperature,
    });

    // Try to extract JSON from the response
    let decisionJson: string = result.text.trim();

    // Remove markdown code blocks if present
    if (decisionJson.startsWith("```")) {
      const lines = decisionJson.split("\n");
      // Remove first line (```json or ```)
      lines.shift();
      const lastLine = lines.at(-1);
      if (lastLine && lastLine.trim() === "```") {
        lines.pop();
      }
      decisionJson = lines.join("\n");
    }

    // Parse and validate the decision
    let decision: RouterDecision;
    try {
      decision = JSON.parse(decisionJson) as RouterDecision;
    } catch (parseError) {
      await logger(
        `[Agent Router] Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
      await logger(
        `[Agent Router] Raw response: ${result.text.substring(0, 500)}`
      );

      // Fallback: try to extract JSON object from text
      const jsonMatch = decisionJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0]) as RouterDecision;
      } else {
        // Ultimate fallback: default to requiring code analysis
        decision = {
          requiresCodeAnalysis: true,
          strategy: "opencode",
          reasoning:
            "Failed to parse router decision, defaulting to code analysis",
          codeScope: "summary",
        };
      }
    }

    // Validate decision structure
    if (typeof decision.requiresCodeAnalysis !== "boolean") {
      decision.requiresCodeAnalysis =
        validatedConfig.defaultRequiresCode ?? true; // Use config default or true
    }

    // Validate strategy against allowed strategies
    const allowedStrategies = validatedConfig.strategies || [
      "opencode",
      "direct-llm",
      "cache",
      "documentation",
    ];
    if (!(decision.strategy && allowedStrategies.includes(decision.strategy))) {
      decision.strategy =
        validatedConfig.defaultStrategy ||
        (decision.requiresCodeAnalysis ? "opencode" : "direct-llm");
      await logger(
        `[Agent Router] Invalid strategy, using default: ${decision.strategy}`
      );
    }

    if (!decision.reasoning) {
      decision.reasoning = `Determined strategy: ${decision.strategy}`;
    }
    if (decision.requiresCodeAnalysis && !decision.codeScope) {
      decision.codeScope = validatedConfig.defaultCodeScope || "summary"; // Use config default or "summary"
    }

    await logger(
      `[Agent Router] Decision: requiresCodeAnalysis=${decision.requiresCodeAnalysis}, strategy=${decision.strategy}, codeScope=${decision.codeScope || "N/A"}`
    );
    await logger(`[Agent Router] Reasoning: ${decision.reasoning}`);

    // Return as JSON string
    return ok(JSON.stringify(decision));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger(`[Agent Router] Error: ${errorMessage}`);

    // Fallback decision: use configured defaults
    const fallbackDecision: RouterDecision = {
      requiresCodeAnalysis: validatedConfig.defaultRequiresCode ?? true,
      strategy:
        validatedConfig.defaultStrategy ||
        ((validatedConfig.defaultRequiresCode ?? true)
          ? "opencode"
          : "direct-llm"),
      reasoning: `Error during routing analysis: ${errorMessage}. Using default configuration.`,
      codeScope: validatedConfig.defaultCodeScope || "summary",
    };

    return ok(JSON.stringify(fallbackDecision));
  }
}
