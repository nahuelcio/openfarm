import { describe, expect, it } from "vitest";
import { LocalRuntime } from "../runtime/local";

describe("LocalRuntime", () => {
  it("resolves workdir to repo path", () => {
    const runtime = new LocalRuntime();
    expect(runtime.resolveWorkDir("/tmp/repo")).toBe("/tmp/repo");
  });

  it("builds command without modification", () => {
    const runtime = new LocalRuntime();
    const command = runtime.buildCommand({
      command: "node",
      args: ["-e", "console.log('ok')"],
    });
    expect(command).toEqual({
      command: "node",
      args: ["-e", "console.log('ok')"],
    });
  });
});
