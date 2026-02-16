export type MemoryScope = "local" | "shared";

export interface MemoryObservation {
	kind: string;
	value: string;
	tags: string[];
}

export interface MemoryRelation {
	type: string;
	target: string;
}

export interface MemoryDocument {
	id: string;
	title: string;
	slug: string;
	bankId: string;
	scope: MemoryScope;
	path: string;
	content: string;
	tags: string[];
	observations: MemoryObservation[];
	relations: MemoryRelation[];
	createdAt: string;
	updatedAt: string;
}

export interface MemoryBankConfig {
	id: string;
	name: string;
	path: string;
	scope: MemoryScope;
	enabled: boolean;
}

export interface WorkspaceMemoryBinding {
	workspaceId: string;
	rootPath: string;
	sharedBankIds: string[];
}

export interface MemorySystemConfig {
	version: 1;
	localBankPath: string;
	globalBanksRoot: string;
	multiWorkspaceEnabled: boolean;
	banks: MemoryBankConfig[];
	workspaces: WorkspaceMemoryBinding[];
}

export interface CreateMemoryInput {
	title: string;
	content: string;
	tags?: string[];
	bankId?: string;
}

export interface SearchMemoryInput {
	query: string;
	bankIds?: string[];
	limit?: number;
}
