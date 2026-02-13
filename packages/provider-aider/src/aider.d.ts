import type { Provider, ProviderMetadata } from "@openfarm/sdk";

export class AiderProviderFactory {
  constructor();
  getMetadata(): ProviderMetadata;
  canCreate(type: string): boolean;
  create(config?: unknown): Provider;
}
