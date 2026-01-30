import { execSync } from 'node:child_process';

export { ClaudeProvider } from './claude-provider';
export { ClaudeProviderFactory } from './claude-factory';
export type { ClaudeConfig } from './types';

/**
 * Get list of available models for Claude Code provider.
 * Fetches from models.dev API to get latest Anthropic models.
 */
export function getAvailableModels(): string[] {
  try {
    // Fetch models from models.dev API
    const output = execSync(
      'curl -s https://models.dev/api.json',
      {
        encoding: 'utf8',
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    );

    const data = JSON.parse(output);

    // Extract Anthropic models
    if (data.anthropic && data.anthropic.models) {
      const models = Object.keys(data.anthropic.models)
        .sort((a, b) => {
          // Sort by name, put latest versions first
          if (a.includes('latest')) return -1;
          if (b.includes('latest')) return 1;
          return b.localeCompare(a);
        });

      if (models.length > 0) {
        return models;
      }
    }

    // Fallback to known Claude models
    return [
      'claude-4-5-sonnet',
      'claude-4-5-haiku',
      'claude-opus-4-5',
    ];
  } catch (error) {
    // Fallback to known models
    return [
      'claude-4-5-sonnet',
      'claude-4-5-haiku',
      'claude-opus-4-5',
    ];
  }
}
