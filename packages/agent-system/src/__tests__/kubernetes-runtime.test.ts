import { describe, expect, it } from "vitest";
import { KubernetesRuntime } from "../runtime/kubernetes";

describe("KubernetesRuntime", () => {
	it("builds kubectl exec command", () => {
		const runtime = new KubernetesRuntime({
			type: "kubernetes",
			podName: "agent-pod",
			namespace: "default",
			container: "agent",
		});

		const built = runtime.buildCommand({
			command: "node",
			args: ["-e", "console.log('ok')"],
		});

		expect(built.command).toBe("kubectl");
		expect(built.args).toContain("exec");
		expect(built.args).toContain("agent-pod");
	});
});
