import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	buildMemoryConfigPaths,
	type GlobalWorkspaceConfig,
	loadGlobalWorkspaceConfig,
	loadLocalConfig,
	saveGlobalWorkspaceConfig,
	saveLocalConfig,
} from "../config/memory-config";
import {
	parseInlineTags,
	parseObservations,
	parseRelations,
} from "../parsers/memory-parser";
import type {
	CreateMemoryInput,
	MemoryBankConfig,
	MemoryDocument,
	MemorySystemConfig,
	SearchMemoryInput,
	WorkspaceMemoryBinding,
} from "../types";
import { MemoryIndex } from "./memory-index";

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

function formatMemoryMarkdown(
	title: string,
	tags: string[],
	content: string,
): string {
	const frontmatter = [
		"---",
		`title: ${title}`,
		`tags: [${tags.join(", ")}]`,
		"---",
		"",
	].join("\n");
	return `${frontmatter}${content.trim()}\n`;
}

export class MemoryStore {
	private readonly workspaceRoot: string;
	private index: MemoryIndex | null = null;
	private config: MemorySystemConfig | null = null;
	private globalWorkspaceConfig: GlobalWorkspaceConfig | null = null;

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot;
	}

	async initialize(): Promise<void> {
		this.config = await loadLocalConfig(this.workspaceRoot);
		this.globalWorkspaceConfig = await loadGlobalWorkspaceConfig(
			this.workspaceRoot,
		);

		const paths = buildMemoryConfigPaths(this.workspaceRoot);
		await mkdir(paths.localBankPath, { recursive: true });
		await mkdir(paths.globalBanksRoot, { recursive: true });

		for (const bank of this.config.banks) {
			if (bank.enabled) {
				await mkdir(bank.path, { recursive: true });
			}
		}

		this.index = await MemoryIndex.create(paths.localDbPath);
		await this.reindexAll();
	}

	async createMemory(input: CreateMemoryInput): Promise<MemoryDocument> {
		this.ensureInitialized();

		const targetBank = this.resolveTargetBank(input.bankId);
		const now = new Date().toISOString();
		const id = randomUUID();
		const slug = slugify(input.title);
		const filePath = path.join(targetBank.path, `${slug}.md`);

		const mergedTags = new Set<string>([
			...(input.tags ?? []),
			...parseInlineTags(input.content),
		]);
		const tags = Array.from(mergedTags);
		const memoryMarkdown = formatMemoryMarkdown(
			input.title,
			tags,
			input.content,
		);

		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, memoryMarkdown, "utf-8");

		const memory: MemoryDocument = {
			id,
			title: input.title,
			slug,
			bankId: targetBank.id,
			scope: targetBank.scope,
			path: filePath,
			content: input.content,
			tags,
			observations: parseObservations(input.content),
			relations: parseRelations(input.content),
			createdAt: now,
			updatedAt: now,
		};

		this.index?.upsertMemory(memory);
		return memory;
	}

	readMemory(id: string): MemoryDocument | null {
		this.ensureInitialized();
		return this.index?.findById(id) ?? null;
	}

	searchMemories(input: SearchMemoryInput): MemoryDocument[] {
		this.ensureInitialized();
		const bankIds = input.bankIds ?? [];
		const limit = input.limit ?? 20;
		return this.index?.search(input.query, bankIds, limit) ?? [];
	}

	listBanks(): MemoryBankConfig[] {
		this.ensureInitialized();
		return [...(this.config?.banks ?? [])];
	}

	async setMultiWorkspaceEnabled(enabled: boolean): Promise<void> {
		this.ensureInitialized();
		if (!this.config) {
			return;
		}
		this.config.multiWorkspaceEnabled = enabled;
		await saveLocalConfig(this.workspaceRoot, this.config);
	}

	async attachSharedBank(
		bankId: string,
		name: string,
	): Promise<MemoryBankConfig> {
		this.ensureInitialized();
		if (!this.config) {
			throw new Error("Memory config not available");
		}

		const paths = buildMemoryConfigPaths(this.workspaceRoot);
		const bankPath = path.join(paths.globalBanksRoot, bankId);
		const existing = this.config.banks.find((bank) => bank.id === bankId);

		if (existing) {
			return existing;
		}

		const bank: MemoryBankConfig = {
			id: bankId,
			name,
			path: bankPath,
			scope: "shared",
			enabled: true,
		};

		this.config.banks.push(bank);
		await mkdir(bank.path, { recursive: true });
		await saveLocalConfig(this.workspaceRoot, this.config);
		return bank;
	}

	async bindWorkspace(
		workspaceId: string,
		rootPath: string,
		sharedBankIds: string[],
	): Promise<void> {
		this.ensureInitialized();
		if (!this.globalWorkspaceConfig) {
			throw new Error("Global workspace config not available");
		}

		const nextBinding: WorkspaceMemoryBinding = {
			workspaceId,
			rootPath,
			sharedBankIds,
		};

		const withoutCurrent = this.globalWorkspaceConfig.workspaces.filter(
			(binding) => binding.workspaceId !== workspaceId,
		);
		this.globalWorkspaceConfig.workspaces = [...withoutCurrent, nextBinding];
		await saveGlobalWorkspaceConfig(
			this.workspaceRoot,
			this.globalWorkspaceConfig,
		);
	}

	getWorkspaceBindings(): WorkspaceMemoryBinding[] {
		this.ensureInitialized();
		return [...(this.globalWorkspaceConfig?.workspaces ?? [])];
	}

	close(): void {
		this.index?.close();
		this.index = null;
	}

	private async reindexAll(): Promise<void> {
		this.ensureInitialized();
		for (const bank of this.config?.banks ?? []) {
			if (!bank.enabled) {
				continue;
			}
			const markdownFiles = await this.collectMarkdownFiles(bank.path);
			for (const filePath of markdownFiles) {
				const memory = await this.hydrateMemoryFromFile(filePath, bank);
				if (memory) {
					this.index?.upsertMemory(memory);
				}
			}
		}
	}

	private async collectMarkdownFiles(directoryPath: string): Promise<string[]> {
		const entries = await readdir(directoryPath, { withFileTypes: true });
		const filePaths: string[] = [];

		for (const entry of entries) {
			const entryPath = path.join(directoryPath, entry.name);
			if (entry.isDirectory()) {
				const nested = await this.collectMarkdownFiles(entryPath);
				filePaths.push(...nested);
				continue;
			}
			if (entry.isFile() && entry.name.endsWith(".md")) {
				filePaths.push(entryPath);
			}
		}

		return filePaths;
	}

	private async hydrateMemoryFromFile(
		filePath: string,
		bank: MemoryBankConfig,
	): Promise<MemoryDocument | null> {
		const info = await stat(filePath);
		if (!info.isFile()) {
			return null;
		}

		const raw = await readFile(filePath, "utf-8");
		const title = path.basename(filePath, ".md").replace(/-/g, " ");
		const slug = path.basename(filePath, ".md");
		const content = raw;
		const nowIso = new Date(info.mtimeMs).toISOString();

		return {
			id: `${bank.id}:${slug}`,
			title,
			slug,
			bankId: bank.id,
			scope: bank.scope,
			path: filePath,
			content,
			tags: parseInlineTags(content),
			observations: parseObservations(content),
			relations: parseRelations(content),
			createdAt: nowIso,
			updatedAt: nowIso,
		};
	}

	private resolveTargetBank(bankId?: string): MemoryBankConfig {
		this.ensureInitialized();
		const banks = this.config?.banks ?? [];
		if (bankId) {
			const explicit = banks.find((bank) => bank.id === bankId && bank.enabled);
			if (explicit) {
				return explicit;
			}
			throw new Error(`Memory bank '${bankId}' is not available`);
		}

		const local = banks.find((bank) => bank.id === "local" && bank.enabled);
		if (!local) {
			throw new Error("Local memory bank is not configured");
		}
		return local;
	}

	private ensureInitialized(): void {
		if (!this.config || !this.index) {
			throw new Error("MemoryStore not initialized. Call initialize() first.");
		}
	}
}
