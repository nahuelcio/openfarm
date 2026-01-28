// Vault Adapter Types
// Future: Part of @openfarm/vault-adapter

export interface VaultConfig {
  url: string;
  token: string;
  secretBasePath: string;
  healthCheckTimeout: number;
}

export interface TenantSecrets {
  ANTHROPIC_API_KEY: string;
  GITHUB_TOKEN?: string;
  OPENAI_API_KEY?: string;
  [key: string]: string | undefined;
}

export interface VaultResponse<T = any> {
  data: {
    data: T;
    metadata?: {
      created_time: string;
      deletion_time: string;
      destroyed: boolean;
      version: number;
    };
  };
}

export interface VaultHealthStatus {
  initialized: boolean;
  sealed: boolean;
  standby: boolean;
  performance_standby: boolean;
  replication_performance_mode: string;
  replication_dr_mode: string;
  server_time_utc: number;
  version: string;
  cluster_name: string;
  cluster_id: string;
}
