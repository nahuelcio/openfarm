import type { ChangesSummary } from "@openfarm/core/types/adapters";
import type { ChatMessage } from "@openfarm/core/types/chat";
import type { AgentConfigurationRules } from "@openfarm/core/types/domain";

export interface CancellationToken {
  isCancelled: boolean;
  cancel: () => void;
  onCancelled: (callback: () => void) => void;
}

export interface OpencodeOptions {
  model?: string;
  previewMode?: boolean;
  chatOnly?: boolean;
  timeoutMs?: number;
  rules?: AgentConfigurationRules;
  onLog?: (message: string) => void | Promise<void>;
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
  onChatMessage?: (message: ChatMessage) => void | Promise<void>;
}

export interface OpencodeProcessConfig extends OpencodeOptions {
  model: string;
  previewMode: boolean;
}
