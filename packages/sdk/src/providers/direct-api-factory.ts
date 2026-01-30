import type { ProviderFactory, ProviderMetadata, Provider } from '../provider-system/types.js';
import { DirectApiProvider, type DirectApiConfig } from './direct-api-provider.js';

export class DirectApiProviderFactory implements ProviderFactory {
  getMetadata(): ProviderMetadata {
    return {
      type: 'direct-api',
      name: 'Direct API Provider',
      version: '1.0.0',
      description: 'Direct API provider for simple HTTP-based AI services',
      supportedFeatures: ['code-generation', 'text-generation', 'api-integration'],
      packageName: undefined, // Built-in provider
    };
  }

  canCreate(type: string): boolean {
    return type === 'direct-api';
  }

  create(config?: unknown): Provider {
    // Provide default configuration if none provided
    const defaultConfig: DirectApiConfig = {
      type: 'direct-api',
      apiUrl: 'https://api.openai.com',
      timeout: 30_000,
      retries: 3,
    };

    // Merge with provided config, ensuring type is always set
    const finalConfig: DirectApiConfig = config 
      ? { ...defaultConfig, ...config, type: 'direct-api' } 
      : defaultConfig;
    
    return new DirectApiProvider(finalConfig);
  }
}