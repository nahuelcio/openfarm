import type { Provider, ProviderMetadata } from "@openfarm/sdk";

export class ClaudeProviderFactory {
  constructor();
  getMetadata(): ProviderMetadata;
  canCreate(type: string): boolean;
  create(config?: unknown): Provider;
}
