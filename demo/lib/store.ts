export type AgentStatus = "running" | "idle" | "completed" | "error" | "reviewing"

export type AgentProvider = "claude-code" | "codex" | "opencode"

export interface Attachment {
  id: string
  name: string
  type: "image" | "code" | "document" | "other"
  size: string
}

export interface DiffHunk {
  oldStart: number
  newStart: number
  lines: {
    type: "add" | "remove" | "context"
    content: string
    oldLine?: number
    newLine?: number
  }[]
}

export interface FileDiff {
  filename: string
  path: string
  status: "added" | "modified" | "deleted"
  linesAdded: number
  linesRemoved: number
  hunks: DiffHunk[]
}

export interface AgentMessage {
  id: string
  role: "user" | "agent" | "system"
  content: string
  timestamp: string
  files?: string[]
  thinking?: boolean
  attachments?: Attachment[]
}

export interface Agent {
  id: string
  name: string
  repo: string
  branch: string
  status: AgentStatus
  provider: AgentProvider
  model?: string
  prompt: string
  filesChanged: number
  linesAdded: number
  linesRemoved: number
  startedAt: string
  messages: AgentMessage[]
  diffs: FileDiff[]
}

export interface Workspace {
  id: string
  name: string
  repo: string
  agents: Agent[]
}

// --- Provider & Model configuration ---

export interface ModelOption {
  id: string
  name: string
  description: string
}

export interface ProviderConfig {
  id: AgentProvider
  name: string
  description: string
  color: string
  connected: boolean
  apiKey: string
  models: ModelOption[]
  defaultModel: string
}

export interface AppSettings {
  providers: ProviderConfig[]
  defaultProvider: AgentProvider
  defaultModel: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  autoPR: boolean
  branchConvention: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  providers: [
    {
      id: "claude-code",
      name: "Claude Code",
      description: "Anthropic's agentic coding tool. Autonomous coding in sandboxed environments.",
      color: "#d97756",
      connected: true,
      apiKey: "sk-ant-***...***",
      models: [
        { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Fast, intelligent coding agent" },
        { id: "claude-opus-4-20250918", name: "Claude Opus 4", description: "Most capable, deep reasoning" },
      ],
      defaultModel: "claude-sonnet-4-20250514",
    },
    {
      id: "codex",
      name: "Codex",
      description: "OpenAI's cloud-based coding agent. Parallel task execution with Codex CLI.",
      color: "#10a37f",
      connected: true,
      apiKey: "sk-***...***",
      models: [
        { id: "codex-mini-latest", name: "Codex Mini", description: "Lightweight, fast coding tasks" },
        { id: "o3-mini", name: "o3-mini", description: "Advanced reasoning for complex code" },
        { id: "o4-mini", name: "o4-mini", description: "Latest reasoning model" },
      ],
      defaultModel: "o4-mini",
    },
    {
      id: "opencode",
      name: "OpenCode",
      description: "Open-source, model-agnostic terminal coding agent. Works with any LLM provider.",
      color: "#06b6d4",
      connected: false,
      apiKey: "",
      models: [
        { id: "gpt-4.1", name: "GPT-4.1", description: "OpenAI's latest model" },
        { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", description: "Anthropic via OpenCode" },
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Google's advanced model" },
        { id: "deepseek-v3", name: "DeepSeek V3", description: "Open-source reasoning model" },
      ],
      defaultModel: "gpt-4.1",
    },
  ],
  defaultProvider: "claude-code",
  defaultModel: "claude-sonnet-4-20250514",
  temperature: 0.2,
  maxTokens: 8192,
  systemPrompt: "",
  autoPR: false,
  branchConvention: "feat/<task-slug>",
}

// --- Sample diff data ---

const SAMPLE_DIFFS_AGENT1: FileDiff[] = [
  {
    filename: "theme.css",
    path: "src/styles/theme.css",
    status: "modified",
    linesAdded: 142,
    linesRemoved: 23,
    hunks: [
      {
        oldStart: 1,
        newStart: 1,
        lines: [
          { type: "context", content: ":root {", oldLine: 1, newLine: 1 },
          { type: "remove", content: "  --bg-primary: #ffffff;", oldLine: 2 },
          { type: "remove", content: "  --text-primary: #1a1a1a;", oldLine: 3 },
          { type: "remove", content: "  --border-color: #e5e5e5;", oldLine: 4 },
          { type: "add", content: "  --bg-primary: light-dark(#ffffff, #0a0a0f);", newLine: 2 },
          { type: "add", content: "  --text-primary: light-dark(#1a1a1a, #e5e5ec);", newLine: 3 },
          { type: "add", content: "  --border-color: light-dark(#e5e5e5, #2a2a35);", newLine: 4 },
          { type: "add", content: "  --bg-secondary: light-dark(#f5f5f5, #141420);", newLine: 5 },
          { type: "add", content: "  --bg-elevated: light-dark(#ffffff, #1e1e2e);", newLine: 6 },
          { type: "context", content: "}", oldLine: 5, newLine: 7 },
        ],
      },
      {
        oldStart: 12,
        newStart: 14,
        lines: [
          { type: "context", content: ".sidebar {", oldLine: 12, newLine: 14 },
          { type: "remove", content: "  background: #f8f8f8;", oldLine: 13 },
          { type: "add", content: "  background: var(--bg-secondary);", newLine: 15 },
          { type: "add", content: "  transition: background 0.2s ease;", newLine: 16 },
          { type: "context", content: "  border-right: 1px solid var(--border-color);", oldLine: 14, newLine: 17 },
          { type: "context", content: "}", oldLine: 15, newLine: 18 },
        ],
      },
    ],
  },
  {
    filename: "ThemeToggle.tsx",
    path: "src/components/ui/ThemeToggle.tsx",
    status: "added",
    linesAdded: 67,
    linesRemoved: 0,
    hunks: [
      {
        oldStart: 0,
        newStart: 1,
        lines: [
          { type: "add", content: "import { useState, useEffect } from 'react';", newLine: 1 },
          { type: "add", content: "import { Moon, Sun } from 'lucide-react';", newLine: 2 },
          { type: "add", content: "", newLine: 3 },
          { type: "add", content: "export function ThemeToggle() {", newLine: 4 },
          { type: "add", content: "  const [theme, setTheme] = useState<'light' | 'dark'>('light');", newLine: 5 },
          { type: "add", content: "", newLine: 6 },
          { type: "add", content: "  useEffect(() => {", newLine: 7 },
          { type: "add", content: "    document.documentElement.dataset.theme = theme;", newLine: 8 },
          { type: "add", content: "  }, [theme]);", newLine: 9 },
          { type: "add", content: "", newLine: 10 },
          { type: "add", content: "  return (", newLine: 11 },
          { type: "add", content: "    <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>", newLine: 12 },
          { type: "add", content: "      {theme === 'light' ? <Moon /> : <Sun />}", newLine: 13 },
          { type: "add", content: "    </button>", newLine: 14 },
          { type: "add", content: "  );", newLine: 15 },
          { type: "add", content: "}", newLine: 16 },
        ],
      },
    ],
  },
  {
    filename: "Sidebar.tsx",
    path: "src/components/layout/Sidebar.tsx",
    status: "modified",
    linesAdded: 12,
    linesRemoved: 8,
    hunks: [
      {
        oldStart: 4,
        newStart: 4,
        lines: [
          { type: "context", content: "import { NavLink } from './NavLink';", oldLine: 4, newLine: 4 },
          { type: "remove", content: "import { Logo } from './Logo';", oldLine: 5 },
          { type: "add", content: "import { Logo } from './Logo';", newLine: 5 },
          { type: "add", content: "import { ThemeToggle } from '../ui/ThemeToggle';", newLine: 6 },
          { type: "context", content: "", oldLine: 6, newLine: 7 },
        ],
      },
    ],
  },
]

const SAMPLE_DIFFS_AGENT4: FileDiff[] = [
  {
    filename: "rateLimit.ts",
    path: "src/middleware/rateLimit.ts",
    status: "added",
    linesAdded: 89,
    linesRemoved: 0,
    hunks: [
      {
        oldStart: 0,
        newStart: 1,
        lines: [
          { type: "add", content: "import { Redis } from 'ioredis';", newLine: 1 },
          { type: "add", content: "import { NextRequest, NextResponse } from 'next/server';", newLine: 2 },
          { type: "add", content: "", newLine: 3 },
          { type: "add", content: "interface RateLimitConfig {", newLine: 4 },
          { type: "add", content: "  windowMs: number;", newLine: 5 },
          { type: "add", content: "  maxRequests: number;", newLine: 6 },
          { type: "add", content: "}", newLine: 7 },
          { type: "add", content: "", newLine: 8 },
          { type: "add", content: "export class RateLimiter {", newLine: 9 },
          { type: "add", content: "  private redis: Redis;", newLine: 10 },
          { type: "add", content: "  private config: RateLimitConfig;", newLine: 11 },
          { type: "add", content: "", newLine: 12 },
          { type: "add", content: "  constructor(redis: Redis, config: RateLimitConfig) {", newLine: 13 },
          { type: "add", content: "    this.redis = redis;", newLine: 14 },
          { type: "add", content: "    this.config = config;", newLine: 15 },
          { type: "add", content: "  }", newLine: 16 },
          { type: "add", content: "", newLine: 17 },
          { type: "add", content: "  async check(identifier: string): Promise<boolean> {", newLine: 18 },
          { type: "add", content: "    const key = `rate:${identifier}`;", newLine: 19 },
          { type: "add", content: "    const now = Date.now();", newLine: 20 },
          { type: "add", content: "    const window = now - this.config.windowMs;", newLine: 21 },
          { type: "add", content: "    // Sliding window counter using sorted sets", newLine: 22 },
          { type: "add", content: "    await this.redis.zremrangebyscore(key, 0, window);", newLine: 23 },
          { type: "add", content: "    const count = await this.redis.zcard(key);", newLine: 24 },
          { type: "add", content: "    return count < this.config.maxRequests;", newLine: 25 },
          { type: "add", content: "  }", newLine: 26 },
          { type: "add", content: "}", newLine: 27 },
        ],
      },
    ],
  },
]

// --- Sample workspaces ---

export const SAMPLE_WORKSPACES: Workspace[] = [
  {
    id: "ws-1",
    name: "conductor-app",
    repo: "conductor-labs/conductor",
    agents: [
      {
        id: "agent-1",
        name: "Implement dark mode",
        repo: "conductor-labs/conductor",
        branch: "feat/dark-mode",
        status: "running",
        provider: "claude-code",
        model: "claude-sonnet-4-20250514",
        prompt: "Implement dark mode across the entire application. Use CSS custom properties for theming and add a toggle in the settings panel.",
        filesChanged: 12,
        linesAdded: 347,
        linesRemoved: 89,
        startedAt: "2 min ago",
        diffs: SAMPLE_DIFFS_AGENT1,
        messages: [
          {
            id: "m1",
            role: "user",
            content: "Implement dark mode across the entire application. Use CSS custom properties for theming and add a toggle in the settings panel.",
            timestamp: "2:34 PM",
          },
          {
            id: "m2",
            role: "agent",
            content: "I'll implement dark mode using CSS custom properties. Let me start by analyzing the current theme structure.",
            timestamp: "2:34 PM",
            thinking: true,
          },
          {
            id: "m3",
            role: "system",
            content: "Reading src/styles/globals.css, src/components/ThemeProvider.tsx, src/lib/theme.ts",
            timestamp: "2:34 PM",
            files: ["src/styles/globals.css", "src/components/ThemeProvider.tsx", "src/lib/theme.ts"],
          },
          {
            id: "m4",
            role: "agent",
            content: "I've analyzed the codebase and found the current theme system. I'll create a comprehensive dark mode implementation:\n\n1. Define CSS custom properties for both light and dark themes\n2. Create a ThemeProvider context\n3. Add a theme toggle component\n4. Update all components to use the new design tokens\n\nCurrently editing `src/styles/theme.css` with the new custom properties...",
            timestamp: "2:35 PM",
            files: ["src/styles/theme.css", "src/components/ui/ThemeToggle.tsx"],
          },
          {
            id: "m5",
            role: "system",
            content: "Edited src/styles/theme.css (+142, -23)\nEdited src/components/ui/ThemeToggle.tsx (+67, -0)\nEdited src/components/layout/Sidebar.tsx (+12, -8)",
            timestamp: "2:36 PM",
            files: ["src/styles/theme.css", "src/components/ui/ThemeToggle.tsx", "src/components/layout/Sidebar.tsx"],
          },
        ],
      },
      {
        id: "agent-2",
        name: "Fix auth redirect loop",
        repo: "conductor-labs/conductor",
        branch: "fix/auth-redirect",
        status: "completed",
        provider: "codex",
        model: "o4-mini",
        prompt: "Fix the authentication redirect loop that occurs when a user's session expires while they're on a protected page.",
        filesChanged: 3,
        linesAdded: 45,
        linesRemoved: 12,
        startedAt: "15 min ago",
        diffs: [],
        messages: [
          {
            id: "m6",
            role: "user",
            content: "Fix the authentication redirect loop that occurs when a user's session expires while they're on a protected page.",
            timestamp: "2:19 PM",
          },
          {
            id: "m7",
            role: "agent",
            content: "I've identified the issue in the auth middleware. The redirect loop happens because the middleware doesn't exclude the login page from the auth check. I've fixed this by:\n\n1. Adding the login route to the excluded paths in middleware\n2. Adding a `returnTo` query parameter for post-login redirect\n3. Clearing stale session tokens before redirect\n\nAll changes have been applied and tested.",
            timestamp: "2:22 PM",
            files: ["src/middleware.ts", "src/lib/auth.ts", "src/app/login/page.tsx"],
          },
        ],
      },
      {
        id: "agent-6",
        name: "Refactor API layer",
        repo: "conductor-labs/conductor",
        branch: "feat/api-refactor",
        status: "running",
        provider: "opencode",
        model: "gemini-2.5-pro",
        prompt: "Refactor the entire API layer to use a consistent pattern with proper error handling and type safety.",
        filesChanged: 8,
        linesAdded: 276,
        linesRemoved: 134,
        startedAt: "3 min ago",
        diffs: [],
        messages: [
          {
            id: "m14",
            role: "user",
            content: "Refactor the entire API layer to use a consistent pattern with proper error handling and type safety.",
            timestamp: "2:31 PM",
          },
          {
            id: "m15",
            role: "agent",
            content: "Analyzing the current API patterns across the codebase. I'll restructure everything to use a unified request/response pattern with Zod validation and consistent error envelopes.",
            timestamp: "2:32 PM",
            thinking: true,
          },
        ],
      },
    ],
  },
  {
    id: "ws-2",
    name: "api-server",
    repo: "conductor-labs/api",
    agents: [
      {
        id: "agent-4",
        name: "Rate limiting middleware",
        repo: "conductor-labs/api",
        branch: "feat/rate-limit",
        status: "reviewing",
        provider: "codex",
        model: "o3-mini",
        prompt: "Implement rate limiting middleware using a sliding window algorithm with Redis.",
        filesChanged: 7,
        linesAdded: 234,
        linesRemoved: 0,
        startedAt: "8 min ago",
        diffs: SAMPLE_DIFFS_AGENT4,
        messages: [
          {
            id: "m10",
            role: "user",
            content: "Implement rate limiting middleware using a sliding window algorithm with Redis.",
            timestamp: "2:26 PM",
          },
          {
            id: "m11",
            role: "agent",
            content: "I've implemented the rate limiting middleware with a sliding window algorithm. Here's what I built:\n\n- `RateLimiter` class using Redis sorted sets\n- Configurable per-route limits\n- Proper HTTP 429 responses with Retry-After headers\n- Unit tests with mock Redis client\n\nReady for your review.",
            timestamp: "2:32 PM",
            files: [
              "src/middleware/rateLimit.ts",
              "src/lib/redis.ts",
              "src/config/rateLimits.ts",
              "tests/rateLimit.test.ts",
            ],
          },
        ],
      },
      {
        id: "agent-5",
        name: "Database migration v2",
        repo: "conductor-labs/api",
        branch: "feat/db-migration-v2",
        status: "error",
        provider: "claude-code",
        model: "claude-sonnet-4-20250514",
        prompt: "Create migration scripts to update the user table schema with new fields for team management.",
        filesChanged: 0,
        linesAdded: 0,
        linesRemoved: 0,
        startedAt: "12 min ago",
        diffs: [],
        messages: [
          {
            id: "m12",
            role: "user",
            content: "Create migration scripts to update the user table schema with new fields for team management.",
            timestamp: "2:22 PM",
          },
          {
            id: "m13",
            role: "agent",
            content: "Error: Unable to connect to the database. The DATABASE_URL environment variable is not set in this workspace. Please add it to the workspace configuration.",
            timestamp: "2:23 PM",
          },
        ],
      },
    ],
  },
]
