import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SpecManager, slugify } from "../src/core/spec-manager";

describe("spec manager", () => {
  it("slugifies consistently", () => {
    expect(slugify(" Spec System v1 ")).toBe("spec-system-v1");
  });

  it("create -> list -> status -> archive flow", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "openfarm-spec-test-"));
    const manager = new SpecManager(root);
    await manager.init();

    const created = await manager.create({
      name: "Spec System",
      description: "desc",
      artifacts: {
        proposal: "# Proposal",
        requirements: "# Requirements",
        design: "# Design",
        tasks: "- [ ] 1.1 Task",
      },
    });

    const listed = await manager.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.metadata.slug).toBe(created.metadata.slug);

    await manager.updateStatus(created, "ready");
    const loaded = await manager.load(created.metadata.slug);
    expect(loaded.metadata.status).toBe("ready");

    const archived = await manager.archive(loaded);
    expect(archived.metadata.status).toBe("archived");
    expect(archived.archived).toBe(true);

    const archivedMetaRaw = await readFile(
      path.join(archived.rootDir, "_meta.json"),
      "utf-8"
    );
    expect(archivedMetaRaw).toContain('"status": "archived"');
  });
});
