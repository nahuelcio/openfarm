// Type declarations for optional provider packages
// These may not be available during type-check but will be resolved at runtime

declare module '@openfarm/provider-opencode' {
  export class OpenCodeProviderFactory {
    constructor();
    getMetadata(): any;
    create(config?: any): any;
    canCreate(type: string): boolean;
  }
}

declare module '@openfarm/provider-aider' {
  export class AiderProviderFactory {
    constructor();
    getMetadata(): any;
    create(config?: any): any;
    canCreate(type: string): boolean;
  }
}

declare module '@openfarm/provider-claude' {
  export class ClaudeProviderFactory {
    constructor();
    getMetadata(): any;
    create(config?: any): any;
    canCreate(type: string): boolean;
  }
}