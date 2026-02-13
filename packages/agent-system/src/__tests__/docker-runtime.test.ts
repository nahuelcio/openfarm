import { describe, expect, it } from "vitest";
import { DockerRuntime } from "../runtime/docker";

describe("DockerRuntime", () => {
  it("builds docker run command for ephemeral containers", () => {
    const runtime = new DockerRuntime({
      type: "docker",
      ephemeral: true,
      imageName: "agent-image:latest",
      volumes: ["/host:/container"],
      network: "bridge",
    });

    const built = runtime.buildCommand({
      command: "node",
      args: ["-e", "console.log('ok')"],
      cwd: "/workspace/repo",
      env: { TEST: "1" },
    });

    expect(built.command).toBe("docker");
    expect(built.args).toContain("run");
    expect(built.args).toContain("agent-image:latest");
    expect(built.args).toContain("--network");
    expect(built.args).toContain("bridge");
  });
});
