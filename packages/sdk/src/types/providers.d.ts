// Type declarations for optional provider packages
// These may not be available during type-check but will be resolved at runtime

import type { Provider, ProviderMetadata } from "./provider-system";

declare module '@openfarm/provider-opencode' {
  export class OpenCodeProviderFactory {
    constructor();
    getMetadata(): ProviderMetadata;
    create(config?: unknown): Provider;
    canCreate(type: string): boolean;
  }
}

declare module '@openfarm/provider-aider' {
  export class AiderProviderFactory {
    constructor();
    getMetadata(): ProviderMetadata;
    create(config?: unknown): Provider;
    canCreate(type: string): boolean;
  }
}

declare module '@openfarm/provider-claude' {
  export class ClaudeProviderFactory {
    constructor();
    getMetadata(): ProviderMetadata;
    create(config?: unknown): Provider;
    canCreate(type: string): boolean;
  }
}