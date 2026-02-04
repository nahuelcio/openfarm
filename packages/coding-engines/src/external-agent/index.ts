import { TmuxWrapper } from "@openfarm/agent-wrapper";
import type {
  ChangesSummary,
  CodingEngine,
} from "@openfarm/core/types/adapters";
import type { ParsedCommand } from "@openfarm/output-parser";
import { CommandParser } from "@openfarm/output-parser";
import type { Result } from "@openfarm/result";

export interface ExternalAgentCodingEngineOptions {
  /** CLI command to execute (claude, opencode, aider, etc.) */
  cli: string;
  /** Model to use (e.g., "gpt-4", "claude-3-opus") */
  model?: string;
  /** Additional arguments */
  args?: string[];
  /** Agent name for identification */
  agentName?: string;
  /** Preview mode (read-only) */
  previewMode?: boolean;
  /** Chat only mode (no file modifications) */
  chatOnly?: boolean;
  /** Callback for log messages */
  onLog?: (message: string) => void | Promise<void>;
  /** Callback for changes */
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
}

/**
 * ExternalAgentCodingEngine wraps any CLI agent with output parsing.
 * This enables inter-agent communication via the OpenFarm protocol.
 */
export class ExternalAgentCodingEngine implements CodingEngine {
  private wrapper?: TmuxWrapper;
  private readonly parser: CommandParser;
  private collectedOutput = "";
  private readonly detectedCommands: ParsedCommand[] = [];

  constructor(private readonly options: ExternalAgentCodingEngineOptions) {
    this.parser = new CommandParser();
  }

  getName(): string {
    return `ExternalAgent (${this.options.cli})`;
  }

  async getSupportedModels(): Promise<string[]> {
    // External agents don't have a model list
    return ["default"];
  }

  async applyChanges(
    instruction: string,
    repoPath: string,
    _contextFiles: string[] = []
  ): Promise<Result<ChangesSummary>> {
    const { ok, err } = await import("@openfarm/result");

    try {
      await this.log(`Starting ${this.options.cli} with output parsing...`);

      // Build args: modelo primero (si existe), luego args del usuario
      const args: string[] = [];
      if (this.options.model) {
        args.push("--model", this.options.model);
      }
      if (this.options.args) {
        args.push(...this.options.args);
      }

      // Create the wrapper
      this.wrapper = new TmuxWrapper({
        command: this.options.cli,
        args,
        agentName: this.options.agentName || this.options.cli,
        workingDirectory: repoPath,
      });

      // Setup output monitoring
      this.wrapper.onOutput((output: string) => {
        this.collectedOutput += output;

        // Parse for commands
        const commands = this.parser.parse(output);
        if (commands.length > 0) {
          this.detectedCommands.push(...commands);
          for (const cmd of commands) {
            this.log(`[OpenFarm Command] ${cmd.to} ← ${cmd.body}`).catch(
              () => {}
            );
          }
        }
      });

      // Start the wrapper
      await this.wrapper.start();
      await this.log("Wrapper started, executing instruction...");

      // Send the instruction as input
      await this.wrapper.sendMessage(instruction);
      await this.log("Instruction sent, waiting for completion...");

      // Wait for the agent to finish (in a real implementation, we'd detect completion)
      // For now, we wait a reasonable amount of time
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Use collected output from the callback
      const finalOutput = this.collectedOutput;

      // Build result
      const result: ChangesSummary = {
        summary: this.buildSummary(finalOutput),
        filesModified: [], // Would be populated from git status
        diff: this.options.chatOnly ? undefined : finalOutput.slice(-5000),
      };

      await this.log(
        `Execution complete. Detected ${this.detectedCommands.length} OpenFarm commands.`
      );

      // Stop the wrapper
      await this.wrapper.stop();

      if (this.options.onChanges) {
        await this.options.onChanges(result);
      }

      return ok(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.log(`Error: ${errorMessage}`);

      // Try to stop wrapper on error
      if (this.wrapper) {
        try {
          await this.wrapper.stop();
        } catch {
          // Ignore stop errors
        }
      }

      return err(new Error(`External agent execution failed: ${errorMessage}`));
    }
  }

  private async log(message: string): Promise<void> {
    if (this.options.onLog) {
      await this.options.onLog(`[ExternalAgent] ${message}`);
    }
  }

  private buildSummary(output: string): string {
    const lines = [
      `Executed ${this.options.cli} with output parsing.`,
      "",
      `Detected ${this.detectedCommands.length} inter-agent messages.`,
      "",
      "=== Final Output Preview ===",
      output.slice(-2000),
    ];

    return lines.join("\n");
  }
}
