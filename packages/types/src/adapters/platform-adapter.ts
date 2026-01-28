export type IntegrationType = "github" | "gitlab" | "bitbucket" | "azure";

export interface PlatformAdapter {
  type: IntegrationType;
  configure(config: Record<string, unknown>): void;
  testConnection(): Promise<boolean>;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
