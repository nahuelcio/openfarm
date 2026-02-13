export interface RateLimitResult {
  isRateLimit: boolean;
  message?: string;
  retryAfter?: number;
}

interface RateLimitPattern {
  pattern: RegExp;
  retryAfterPattern?: RegExp;
}

const COMMON_PATTERNS: RateLimitPattern[] = [
  {
    pattern:
      /(?:HTTP|status|error|code|response)[\s:]*429|429\s*(?:too many|rate limit|error)/i,
    retryAfterPattern: /retry[- ]?after[:\s]+(\d+)\s*s/i,
  },
  {
    pattern: /rate[- ]?limit/i,
    retryAfterPattern: /retry[- ]?after[:\s]+(\d+)\s*s/i,
  },
  { pattern: /too many requests/i, retryAfterPattern: /(\d+)\s*seconds?/i },
  { pattern: /quota[- ]?exceeded/i, retryAfterPattern: /(\d+)\s*seconds?/i },
  { pattern: /\boverloaded\b/i, retryAfterPattern: /(\d+)\s*seconds?/i },
];

const AGENT_PATTERNS: Record<string, RateLimitPattern[]> = {
  "claude-code": [
    { pattern: /anthropic.*rate[- ]?limit/i },
    { pattern: /claude.*is currently overloaded/i },
    { pattern: /api[- ]?error.*429/i },
  ],
  opencode: [
    { pattern: /openai.*rate[- ]?limit/i },
    { pattern: /tokens per minute/i },
    { pattern: /requests per minute/i },
    { pattern: /azure.*throttl/i },
  ],
};

export class RateLimitDetector {
  detect(input: {
    stderr: string;
    exitCode?: number;
    agentId?: string;
  }): RateLimitResult {
    const { stderr, exitCode, agentId } = input;

    if (!stderr.trim() && exitCode === 0) {
      return { isRateLimit: false };
    }

    const patterns = [
      ...COMMON_PATTERNS,
      ...((agentId && AGENT_PATTERNS[agentId]) || []),
    ];

    for (const { pattern, retryAfterPattern } of patterns) {
      if (pattern.test(stderr)) {
        const retryAfter = retryAfterPattern
          ? this.extractRetryAfter(stderr, retryAfterPattern)
          : undefined;
        return {
          isRateLimit: true,
          message: this.extractMessage(stderr, pattern),
          retryAfter,
        };
      }
    }

    return { isRateLimit: false };
  }

  private extractRetryAfter(
    output: string,
    pattern: RegExp
  ): number | undefined {
    const match = output.match(pattern);
    if (match?.[1]) {
      const seconds = Number.parseInt(match[1], 10);
      if (!Number.isNaN(seconds) && seconds > 0 && seconds < 3600) {
        return seconds;
      }
    }
    return undefined;
  }

  private extractMessage(output: string, pattern: RegExp): string {
    const match = output.match(pattern);
    if (!match) {
      return "Rate limit detected";
    }
    const idx = match.index ?? 0;
    return output
      .slice(
        Math.max(0, idx - 50),
        Math.min(output.length, idx + match[0].length + 100)
      )
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 200);
  }
}
