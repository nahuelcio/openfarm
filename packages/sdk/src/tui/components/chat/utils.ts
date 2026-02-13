/**
 * Chat Utilities
 *
 * Helper functions for chat components.
 */

/**
 * Format a timestamp to a relative time string (e.g., "2m ago")
 */
export function formatDistanceToNow(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) {
    return "just now";
  }
  if (diffSecs < 60) {
    return `${diffSecs}s ago`;
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Fall back to date string
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Parse mentions from message content (@filepath)
 */
export function parseMentions(content: string): string[] {
  const mentionRegex = /@([^\s]+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null = mentionRegex.exec(content);

  while (match !== null) {
    mentions.push(match[1]);
    match = mentionRegex.exec(content);
  }

  return mentions;
}

/**
 * Parse slash commands from message content (/command)
 */
export function parseSlashCommand(content: string): {
  command: string | null;
  args: string;
} {
  const trimmed = content.trim();

  if (!trimmed.startsWith("/")) {
    return { command: null, args: trimmed };
  }

  const parts = trimmed.slice(1).split(/\s+/, 1);
  const command = parts[0] || null;
  const args = parts[0] ? trimmed.slice(parts[0].length + 2) : "";

  return { command, args };
}

/**
 * Available slash commands
 */
export const SLASH_COMMANDS = [
  {
    command: "/plan",
    description: "Create a plan for the task",
    usage: "/plan <description>",
  },
  {
    command: "/fix",
    description: "Fix the last error or issue",
    usage: "/fix [description]",
  },
  {
    command: "/explain",
    description: "Explain code or concept",
    usage: "/explain <topic>",
  },
  {
    command: "/refactor",
    description: "Refactor selected code",
    usage: "/refactor <instructions>",
  },
  {
    command: "/test",
    description: "Generate tests",
    usage: "/test [file or function]",
  },
  {
    command: "/doc",
    description: "Generate documentation",
    usage: "/doc [file or function]",
  },
  {
    command: "/clear",
    description: "Clear the conversation",
    usage: "/clear",
  },
  {
    command: "/help",
    description: "Show available commands",
    usage: "/help",
  },
] as const;

export type SlashCommand = (typeof SLASH_COMMANDS)[number]["command"];
