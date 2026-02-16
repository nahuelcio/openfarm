import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type {
	MemoryBankConfig,
	MemorySystemConfig,
	WorkspaceMemoryBinding,
} from "../types";

const LOCAL_CONFIG_RELATIVE_PATH = ".openfarm/memory-config.json";
const GLOBAL_CONFIG_RELATIVE_PATH = ".openfarm-global/workspaces.json";

export interface MemoryConfigPaths {
	localConfigPath: string;
	globalConfigPath: string;
	localBankPath: string;
	localDbPath: string;
	globalBanksRoot: string;
}

function getGlobalConfigPath(): string {
	return path.join(homedir(), GLOBAL_CONFIG_RELATIVE_PATH);
}

export function buildMemoryConfigPaths(
	workspaceRoot: string,
): MemoryConfigPaths {
	const localConfigPath = path.join(workspaceRoot, LOCAL_CONFIG_RELATIVE_PATH);
	const localBankPath = path.join(workspaceRoot, ".openfarm", "memories");
	const localDbPath = path.join(workspaceRoot, ".openfarm", "memory.db");
	const globalConfigPath = getGlobalConfigPath();
	const globalBanksRoot = path.join(
		homedir(),
		".openfarm-global",
		"shared-banks",
	);

	return {
		localConfigPath,
		globalConfigPath,
		localBankPath,
		localDbPath,
		globalBanksRoot,
	};
}

export function getDefaultConfig(workspaceRoot: string): MemorySystemConfig {
	const paths = buildMemoryConfigPaths(workspaceRoot);

	const localBank: MemoryBankConfig = {
		id: "local",
		name: "Local Workspace Memory",
		path: paths.localBankPath,
		scope: "local",
		enabled: true,
	};

	return {
		version: 1,
		localBankPath: paths.localBankPath,
		globalBanksRoot: paths.globalBanksRoot,
		multiWorkspaceEnabled: false,
		banks: [localBank],
		workspaces: [],
	};
}

async function readJson<T>(filePath: string): Promise<T | null> {
	try {
		const content = await readFile(filePath, "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export async function loadLocalConfig(
	workspaceRoot: string,
): Promise<MemorySystemConfig> {
	const paths = buildMemoryConfigPaths(workspaceRoot);
	const config = await readJson<MemorySystemConfig>(paths.localConfigPath);
	if (config) {
		return config;
	}

	const fallback = getDefaultConfig(workspaceRoot);
	await writeJson(paths.localConfigPath, fallback);
	return fallback;
}

export async function saveLocalConfig(
	workspaceRoot: string,
	config: MemorySystemConfig,
): Promise<void> {
	const paths = buildMemoryConfigPaths(workspaceRoot);
	await writeJson(paths.localConfigPath, config);
}

export interface GlobalWorkspaceConfig {
	workspaces: WorkspaceMemoryBinding[];
}

export async function loadGlobalWorkspaceConfig(
	workspaceRoot: string,
): Promise<GlobalWorkspaceConfig> {
	const paths = buildMemoryConfigPaths(workspaceRoot);
	const config = await readJson<GlobalWorkspaceConfig>(paths.globalConfigPath);
	if (config) {
		return config;
	}

	const fallback: GlobalWorkspaceConfig = { workspaces: [] };
	await writeJson(paths.globalConfigPath, fallback);
	return fallback;
}

export async function saveGlobalWorkspaceConfig(
	workspaceRoot: string,
	config: GlobalWorkspaceConfig,
): Promise<void> {
	const paths = buildMemoryConfigPaths(workspaceRoot);
	await writeJson(paths.globalConfigPath, config);
}
