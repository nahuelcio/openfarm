import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { describe, expect, it } from "vitest";
import { ClaudeCodeAgent } from "../agents/claude-code";
import { OpenCodeAgent } from "../agents/opencode";

describe("ClaudeCodeAgent", () => {
  it("parses jsonl output for changes", () => {
    const agent = new ClaudeCodeAgent();
    const output = [
      JSON.stringify({
        type: "tool_use",
        tool_name: "Write",
        tool_input: { file_path: "src/new.ts" },
      }),
      JSON.stringify({
        type: "result",
        message: "Done",
        cost_usd: 0.01,
      }),
    ].join("\n");

    const changes = (
      agent as unknown as {
        parseOutput: (input: string) => ChangesSummary | undefined;
      }
    ).parseOutput(output);
    expect(changes?.filesCreated).toContain("src/new.ts");
    expect(changes?.summary).toBe("Done");
  });
});

describe("OpenCodeAgent", () => {
  it("parses json output for modified files", () => {
    const agent = new OpenCodeAgent();
    const output = [
      JSON.stringify({
        type: "tool_use",
        part: {
          tool: "edit",
          state: {
            status: "completed",
            input: { filePath: "src/app.ts" },
            metadata: { diff: "+change" },
          },
        },
      }),
      JSON.stringify({
        type: "text",
        part: { text: "Finished" },
      }),
    ].join("\n");

    const changes = (
      agent as unknown as {
        parseOutput: (input: string) => ChangesSummary | undefined;
      }
    ).parseOutput(output);
    expect(changes?.filesModified).toContain("src/app.ts");
    expect(changes?.diff).toContain("+change");
    expect(changes?.summary).toContain("Finished");
  });
});
