import { describe, expect, it } from "vitest";
import { markTasksDone, parseTasks } from "../src/format/parsers";

describe("task parsers", () => {
  it("parses checkboxes with status", () => {
    const markdown = `# Tasks

- [ ] 1.1 First
- [x] 1.2 Second
`;
    const tasks = parseTasks(markdown);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.done).toBe(false);
    expect(tasks[1]?.done).toBe(true);
  });

  it("marks pending tasks as done", () => {
    const markdown = "- [ ] A\n- [x] B\n";
    const next = markTasksDone(markdown);
    expect(next).toContain("- [x] A");
    expect(next).toContain("- [x] B");
  });
});
