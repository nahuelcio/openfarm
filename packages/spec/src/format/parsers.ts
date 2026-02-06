export interface ParsedTask {
  text: string;
  done: boolean;
  lineIndex: number;
}

const TASK_LINE_REGEX = /^- \[( |x|X)\] (.+)$/;

export function parseTasks(markdown: string): ParsedTask[] {
  const lines = markdown.split("\n");
  const tasks: ParsedTask[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    const match = line.match(TASK_LINE_REGEX);
    if (!match) {
      continue;
    }

    tasks.push({
      done: match[1].toLowerCase() === "x",
      text: match[2],
      lineIndex,
    });
  }

  return tasks;
}

export function markTasksDone(markdown: string): string {
  return markdown.replace(/^- \[ \] /gm, "- [x] ");
}
