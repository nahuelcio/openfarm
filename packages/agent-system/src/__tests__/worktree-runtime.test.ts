import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WorktreeRuntime } from "../runtime/worktree";

describe("WorktreeRuntime", () => {
	it("returns configured worktree path when it exists", () => {
		const dir = mkdtempSync(join(tmpdir(), "openfarm-worktree-"));
		const runtime = new WorktreeRuntime({
			type: "worktree",
			worktreePath: dir,
		});

		expect(runtime.resolveWorkDir("/tmp/repo")).toBe(dir);
	});

	it("throws when worktreePath is missing", () => {
		const runtime = new WorktreeRuntime({ type: "worktree" });
		expect(() => runtime.resolveWorkDir("/tmp/repo")).toThrow(
			"WorktreeRuntime requires worktreePath",
		);
	});
});
