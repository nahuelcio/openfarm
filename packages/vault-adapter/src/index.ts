// Vault Adapter Package
// Future: @openfarm/vault-adapter (OSS)

export { VaultClient } from "./services/vault-client";
export { VaultManager } from "./services/vault-manager";

export type {
  TenantSecrets,
  VaultConfig,
  VaultHealthStatus,
  VaultResponse,
} from "./types";
