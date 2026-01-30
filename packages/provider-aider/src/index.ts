import { execSync } from 'node:child_process';

export { AiderProvider } from './aider-provider';
export { AiderProviderFactory } from './aider-factory';
export type { AiderConfig } from './types';

/**
 * Get list of available models for Aider provider.
 * Executes `aider --models` to get dynamic list.
 */
export function getAvailableModels(): string[] {
  try {
    // Execute aider --models command
    const output = execSync('aider --models', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    // Parse output - extract model names
    const models = output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('-'));

    return models;
  } catch (error) {
    // If command fails, return empty array
    console.error('Failed to load Aider models:', error);
    return [];
  }
}
