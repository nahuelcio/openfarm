import type { MemoryStore } from "../core/memory-store";
import type {
	CreateMemoryInput,
	MemoryDocument,
	SearchMemoryInput,
	WorkspaceMemoryBinding,
} from "../types";

export interface MemoryTools {
	createMemory(input: CreateMemoryInput): Promise<MemoryDocument>;
	readMemory(id: string): MemoryDocument | null;
	searchMemories(input: SearchMemoryInput): MemoryDocument[];
	listMemoryBanks(): ReturnType<MemoryStore["listBanks"]>;
	setMultiWorkspaceEnabled(enabled: boolean): Promise<void>;
	bindWorkspace(
		workspaceId: string,
		rootPath: string,
		sharedBankIds: string[],
	): Promise<void>;
	getWorkspaceBindings(): WorkspaceMemoryBinding[];
}

export function createMemoryTools(store: MemoryStore): MemoryTools {
	return {
		createMemory(input: CreateMemoryInput): Promise<MemoryDocument> {
			return store.createMemory(input);
		},
		readMemory(id: string): MemoryDocument | null {
			return store.readMemory(id);
		},
		searchMemories(input: SearchMemoryInput): MemoryDocument[] {
			return store.searchMemories(input);
		},
		listMemoryBanks() {
			return store.listBanks();
		},
		setMultiWorkspaceEnabled(enabled: boolean): Promise<void> {
			return store.setMultiWorkspaceEnabled(enabled);
		},
		bindWorkspace(
			workspaceId: string,
			rootPath: string,
			sharedBankIds: string[],
		): Promise<void> {
			return store.bindWorkspace(workspaceId, rootPath, sharedBankIds);
		},
		getWorkspaceBindings(): WorkspaceMemoryBinding[] {
			return store.getWorkspaceBindings();
		},
	};
}
