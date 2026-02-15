import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_CODEX_MODEL = "gpt-5.3-codex";
const DEFAULT_REASONING_EFFORT = "medium";
const REASONING_MODE_PREFIX = "reasoning:";
const PROFILE_MODE_PREFIX = "profile:";

// Model capabilities mapping - this should be updated dynamically from API
const MODEL_REASONING_CAPABILITIES = {
	"gpt-5.3-codex": ["low", "medium", "high", "xhigh"],
	"gpt-5.2-codex": ["low", "medium", "high"],
	"gpt-5.1-codex": ["low", "medium", "high"],
	"gpt-5.1-codex-mini": ["low", "medium", "high"],
} as const;

const FALLBACK_MODELS = [
	DEFAULT_CODEX_MODEL,
	"gpt-5.2-codex",
	"gpt-5.1-codex",
	"gpt-5.1-codex-mini",
] as const;

const CODEX_EXEC_BASE_ARGS = [
	"exec",
	"--json",
	"-s",
	"workspace-write",
] as const;

type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

function getModelReasoningCapabilities(model: string): ReasoningEffort[] {
	return MODEL_REASONING_CAPABILITIES[model as keyof typeof MODEL_REASONING_CAPABILITIES] || ["low", "medium", "high"];
}

function validateReasoningEffort(model: string, effort: string): boolean {
	const capabilities = getModelReasoningCapabilities(model);
	return capabilities.includes(effort as ReasoningEffort);
}

interface RawReasoningLevel {
	effort?: string;
	description?: string;
}

interface RawCodexModelEntry {
	slug?: string;
	display_name?: string;
	description?: string;
	default_reasoning_level?: string;
	supported_reasoning_levels?: RawReasoningLevel[];
	visibility?: string;
	priority?: number;
}

interface RawCodexModelsCache {
	models?: RawCodexModelEntry[];
}

export interface CodexModelInfo {
	id: string;
	name: string;
	description: string;
	defaultReasoningEffort?: string;
	supportedReasoningEfforts: string[];
}

export interface CodexProfileConfig {
	id: string;
	model?: string;
	reasoningEffort?: string;
}

export interface CodexConfigSnapshot {
	defaultModel?: string;
	defaultReasoningEffort?: string;
	profiles: CodexProfileConfig[];
}

export interface CodexModeInfo {
	id: string;
	name: string;
	description: string;
	kind: "profile" | "reasoning";
}

export interface CodexSelection {
	defaultModel: string;
	defaultMode: string;
}

export interface CodexCatalog {
	models: CodexModelInfo[];
	modes: CodexModeInfo[];
	defaultModel: string;
	defaultMode: string;
}

export interface CodexExecutionOptions {
	model?: string;
	mode?: string;
	knownProfiles?: string[];
}

function resolveCodexConfigPath(): string {
	return join(process.env.HOME || homedir(), ".codex", "config.toml");
}

function resolveCodexModelsCachePath(): string {
	return join(process.env.HOME || homedir(), ".codex", "models_cache.json");
}

function readTextFile(path: string): string | undefined {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return undefined;
	}
}

function fallbackModelInfos(): CodexModelInfo[] {
	return [...FALLBACK_MODELS].map((model) => ({
		id: model,
		name: model,
		description: "Codex CLI model",
		defaultReasoningEffort: DEFAULT_REASONING_EFFORT,
		supportedReasoningEfforts: [DEFAULT_REASONING_EFFORT],
	}));
}

function normalizeReasoningEffort(
	value: string | undefined,
): string | undefined {
	if (!value) {
		return undefined;
	}
	const normalized = value.trim().toLowerCase();
	return normalized || undefined;
}

function isKnownReasoningEffort(value: string): boolean {
	const allEfforts = ["low", "medium", "high", "xhigh"];
	return allEfforts.includes(value);
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function sortReasoningEfforts(efforts: string[]): string[] {
	const deduped = unique(efforts.map((effort) => effort.toLowerCase()));
	const allEfforts = ["low", "medium", "high", "xhigh"];
	return deduped.sort((left, right) => {
		const leftIndex = allEfforts.indexOf(left);
		const rightIndex = allEfforts.indexOf(right);
		return leftIndex - rightIndex;
	});
}

function parseModelReasoningEfforts(model: RawCodexModelEntry): string[] {
	const fromLevels =
		model.supported_reasoning_levels
			?.map((level) => normalizeReasoningEffort(level.effort))
			.filter((value): value is string => Boolean(value)) || [];
	const defaultEffort = normalizeReasoningEffort(model.default_reasoning_level);
	return sortReasoningEfforts(
		defaultEffort ? [...fromLevels, defaultEffort] : fromLevels,
	);
}

export function parseCodexModelsCache(raw: string): CodexModelInfo[] {
	if (!raw.trim()) {
		return fallbackModelInfos();
	}

	try {
		const parsed = JSON.parse(raw) as RawCodexModelsCache;
		const models = parsed.models;
		if (!Array.isArray(models)) {
			return fallbackModelInfos();
		}

		const entries = models
			.map((model, index) => ({ index, model }))
			.filter(({ model }) => {
				const slug = typeof model.slug === "string" ? model.slug.trim() : "";
				if (!slug) {
					return false;
				}
				const visibility = (model.visibility || "").trim().toLowerCase();
				return visibility !== "hide";
			})
			.sort((left, right) => {
				const leftPriority =
					typeof left.model.priority === "number"
						? left.model.priority
						: Number.MAX_SAFE_INTEGER;
				const rightPriority =
					typeof right.model.priority === "number"
						? right.model.priority
						: Number.MAX_SAFE_INTEGER;
				if (leftPriority !== rightPriority) {
					return leftPriority - rightPriority;
				}
				return left.index - right.index;
			});

		const result = entries.map(({ model }) => {
			const id = (model.slug || "").trim();
			const name = (model.display_name || "").trim() || id;
			const description = (model.description || "").trim() || "Codex CLI model";
			const reasoningEfforts = parseModelReasoningEfforts(model);
			const defaultReasoningEffort =
				normalizeReasoningEffort(model.default_reasoning_level) ||
				reasoningEfforts[0] ||
				DEFAULT_REASONING_EFFORT;
			return {
				id,
				name,
				description,
				defaultReasoningEffort,
				supportedReasoningEfforts:
					reasoningEfforts.length > 0
						? reasoningEfforts
						: [DEFAULT_REASONING_EFFORT],
			} satisfies CodexModelInfo;
		});

		return result.length > 0 ? result : fallbackModelInfos();
	} catch {
		return fallbackModelInfos();
	}
}

export function getAvailableModelInfos(): CodexModelInfo[] {
	const raw = readTextFile(resolveCodexModelsCachePath());
	if (!raw) {
		return fallbackModelInfos();
	}
	return parseCodexModelsCache(raw);
}

export function getAvailableModels(): string[] {
	return getAvailableModelInfos().map((model) => model.id);
}

function stripInlineTomlComment(value: string): string {
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let escaped = false;
	let output = "";

	for (const char of value) {
		if (escaped) {
			output += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && inDoubleQuote) {
			output += char;
			escaped = true;
			continue;
		}

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			output += char;
			continue;
		}

		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			output += char;
			continue;
		}

		if (char === "#" && !inSingleQuote && !inDoubleQuote) {
			break;
		}

		output += char;
	}

	return output;
}

function parseTomlStringValue(raw: string): string | undefined {
	const trimmed = stripInlineTomlComment(raw).trim();
	if (!trimmed) {
		return undefined;
	}

	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		try {
			const parsed = JSON.parse(trimmed);
			return typeof parsed === "string" ? parsed : undefined;
		} catch {
			return trimmed.slice(1, -1);
		}
	}

	if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
}

function parseProfileSectionName(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) {
		return "";
	}

	if (trimmed.startsWith('"')) {
		const endIndex = trimmed.indexOf('"', 1);
		if (endIndex > 0) {
			const parsed = parseTomlStringValue(trimmed.slice(0, endIndex + 1));
			return (parsed || "").trim();
		}
	}

	if (trimmed.startsWith("'")) {
		const endIndex = trimmed.indexOf("'", 1);
		if (endIndex > 0) {
			return trimmed.slice(1, endIndex).trim();
		}
	}

	const firstSegment = trimmed.split(".")[0] || "";
	return firstSegment.trim();
}

export function parseCodexConfigToml(raw: string): CodexConfigSnapshot {
	if (!raw.trim()) {
		return { profiles: [] };
	}

	const profilesById = new Map<string, CodexProfileConfig>();
	let currentSection = "";
	let currentProfileId = "";
	let defaultModel: string | undefined;
	let defaultReasoningEffort: string | undefined;

	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const sectionMatch = /^\[([^\]]+)\]$/.exec(trimmed);
		if (sectionMatch) {
			currentSection = sectionMatch[1]?.trim() || "";
			currentProfileId = "";
			if (currentSection.startsWith("profiles.")) {
				const profileSuffix = currentSection.slice("profiles.".length);
				const profileName = parseProfileSectionName(profileSuffix);
				if (profileName) {
					currentProfileId = profileName;
					if (!profilesById.has(profileName)) {
						profilesById.set(profileName, { id: profileName });
					}
				}
			}
			continue;
		}

		const assignment = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/.exec(trimmed);
		if (!assignment) {
			continue;
		}

		const key = assignment[1]?.trim() || "";
		const value = parseTomlStringValue(assignment[2] || "");
		if (!value) {
			continue;
		}

		if (currentProfileId) {
			const profile = profilesById.get(currentProfileId) || {
				id: currentProfileId,
			};
			if (key === "model") {
				profile.model = value;
			} else if (key === "model_reasoning_effort") {
				profile.reasoningEffort = normalizeReasoningEffort(value);
			}
			profilesById.set(currentProfileId, profile);
			continue;
		}

		if (!currentSection) {
			if (key === "model") {
				defaultModel = value;
			} else if (key === "model_reasoning_effort") {
				defaultReasoningEffort = normalizeReasoningEffort(value);
			}
		}
	}

	const profiles = [...profilesById.values()].sort((left, right) =>
		left.id.localeCompare(right.id),
	);

	return {
		defaultModel,
		defaultReasoningEffort,
		profiles,
	};
}

export function getCodexConfigSnapshot(): CodexConfigSnapshot {
	const raw = readTextFile(resolveCodexConfigPath());
	if (!raw) {
		return { profiles: [] };
	}
	return parseCodexConfigToml(raw);
}

function collectReasoningEfforts(
	configSnapshot: CodexConfigSnapshot,
	modelInfos: CodexModelInfo[],
): string[] {
	const fromModels = modelInfos.flatMap((model) => [
		...model.supportedReasoningEfforts,
		...(model.defaultReasoningEffort ? [model.defaultReasoningEffort] : []),
	]);
	const fromConfig = [
		configSnapshot.defaultReasoningEffort,
		...configSnapshot.profiles.map((profile) => profile.reasoningEffort),
	].filter((value): value is string => Boolean(value));

	const values = sortReasoningEfforts([...fromModels, ...fromConfig]);
	return values.length > 0 ? values : [DEFAULT_REASONING_EFFORT];
}

function buildProfileModeDescription(profile: CodexProfileConfig): string {
	const details: string[] = [];
	if (profile.model) {
		details.push(`model: ${profile.model}`);
	}
	if (profile.reasoningEffort) {
		details.push(`reasoning: ${profile.reasoningEffort}`);
	}
	if (details.length === 0) {
		return "Codex profile from config.toml";
	}
	return `Codex profile (${details.join(" | ")})`;
}

function reasoningModeId(effort: string): string {
	return `${REASONING_MODE_PREFIX}${effort}`;
}

export function getAvailableModes(input?: {
	configSnapshot?: CodexConfigSnapshot;
	modelInfos?: CodexModelInfo[];
}): CodexModeInfo[] {
	const configSnapshot = input?.configSnapshot || getCodexConfigSnapshot();
	const modelInfos = input?.modelInfos || getAvailableModelInfos();

	const profileModes = configSnapshot.profiles.map((profile) => ({
		id: profile.id,
		name: profile.id,
		description: buildProfileModeDescription(profile),
		kind: "profile" as const,
	}));

	const reasoningModes = collectReasoningEfforts(
		configSnapshot,
		modelInfos,
	).map((effort) => ({
		id: reasoningModeId(effort),
		name: effort,
		description: `Codex reasoning effort: ${effort}`,
		kind: "reasoning" as const,
	}));

	const seen = new Set<string>();
	return [...profileModes, ...reasoningModes].filter((mode) => {
		if (seen.has(mode.id)) {
			return false;
		}
		seen.add(mode.id);
		return true;
	});
}

function resolveDefaultModel(
	configSnapshot: CodexConfigSnapshot,
	modelInfos: CodexModelInfo[],
): string {
	if (
		configSnapshot.defaultModel &&
		modelInfos.some((model) => model.id === configSnapshot.defaultModel)
	) {
		return configSnapshot.defaultModel;
	}
	return modelInfos[0]?.id || DEFAULT_CODEX_MODEL;
}

function resolveDefaultMode(
	configSnapshot: CodexConfigSnapshot,
	modelInfos: CodexModelInfo[],
	modes: CodexModeInfo[],
	selectedModel: string,
): string {
	const knownModeIds = new Set(modes.map((mode) => mode.id));

	const explicitDefaultProfile =
		configSnapshot.profiles.find((profile) => profile.id === "default")?.id ||
		configSnapshot.profiles[0]?.id;
	if (explicitDefaultProfile && knownModeIds.has(explicitDefaultProfile)) {
		return explicitDefaultProfile;
	}

	const defaultFromConfig = configSnapshot.defaultReasoningEffort;
	if (defaultFromConfig) {
		const configReasoningMode = reasoningModeId(defaultFromConfig);
		if (knownModeIds.has(configReasoningMode)) {
			return configReasoningMode;
		}
	}

	const selectedModelInfo = modelInfos.find(
		(model) => model.id === selectedModel,
	);
	if (selectedModelInfo?.defaultReasoningEffort) {
		const modelReasoningMode = reasoningModeId(
			selectedModelInfo.defaultReasoningEffort,
		);
		if (knownModeIds.has(modelReasoningMode)) {
			return modelReasoningMode;
		}
	}

	return modes[0]?.id || "";
}

export function getDefaultCodexSelection(input?: {
	configSnapshot?: CodexConfigSnapshot;
	modelInfos?: CodexModelInfo[];
	modes?: CodexModeInfo[];
}): CodexSelection {
	const configSnapshot = input?.configSnapshot || getCodexConfigSnapshot();
	const modelInfos = input?.modelInfos || getAvailableModelInfos();
	const modes =
		input?.modes || getAvailableModes({ configSnapshot, modelInfos });
	const defaultModel = resolveDefaultModel(configSnapshot, modelInfos);
	const defaultMode = resolveDefaultMode(
		configSnapshot,
		modelInfos,
		modes,
		defaultModel,
	);
	return {
		defaultModel,
		defaultMode,
	};
}

export function getCodexCatalog(input?: {
	configSnapshot?: CodexConfigSnapshot;
	modelInfos?: CodexModelInfo[];
	modes?: CodexModeInfo[];
}): CodexCatalog {
	const configSnapshot = input?.configSnapshot || getCodexConfigSnapshot();
	const modelInfos = input?.modelInfos || getAvailableModelInfos();
	const modes =
		input?.modes || getAvailableModes({ configSnapshot, modelInfos });
	const defaults = getDefaultCodexSelection({
		configSnapshot,
		modelInfos,
		modes,
	});

	return {
		models: modelInfos,
		modes,
		defaultModel: defaults.defaultModel,
		defaultMode: defaults.defaultMode,
	};
}

function parseModeSelection(
	mode: string | undefined,
	knownProfiles: string[],
): {
	profile?: string;
	reasoningEffort?: string;
} {
	const value = (mode || "").trim();
	if (!value) {
		return {};
	}
	const lower = value.toLowerCase();
	if (lower === "general" || lower === "default" || lower === "defaultmodel") {
		return {};
	}

	if (lower.startsWith(REASONING_MODE_PREFIX)) {
		const effort = normalizeReasoningEffort(
			value.slice(REASONING_MODE_PREFIX.length),
		);
		if (effort) {
			return { reasoningEffort: effort };
		}
		return {};
	}

	if (lower.startsWith(PROFILE_MODE_PREFIX)) {
		const profile = value.slice(PROFILE_MODE_PREFIX.length).trim();
		if (profile) {
			return { profile };
		}
		return {};
	}

	if (knownProfiles.includes(value)) {
		return { profile: value };
	}

	if (isKnownReasoningEffort(lower)) {
		return { reasoningEffort: lower };
	}

	return { profile: value };
}

export function resolveCodexExecutionArgs(
	options: CodexExecutionOptions = {},
): string[] {
	const args = [...CODEX_EXEC_BASE_ARGS];
	const model = (options.model || "").trim();
	if (model) {
		args.push("--model", model);
	}

	const knownProfiles = unique(options.knownProfiles || []);
	const parsedMode = parseModeSelection(options.mode, knownProfiles);
	if (parsedMode.profile) {
		args.push("--profile", parsedMode.profile);
	} else if (parsedMode.reasoningEffort) {
		// Validate reasoning effort against model capabilities
		if (!validateReasoningEffort(model || DEFAULT_CODEX_MODEL, parsedMode.reasoningEffort)) {
			const capabilities = getModelReasoningCapabilities(model || DEFAULT_CODEX_MODEL);
			throw new Error(
				`Reasoning effort '${parsedMode.reasoningEffort}' is not supported by model '${model}'. ` +
				`Supported values: ${capabilities.join(", ")}`
			);
		}
		args.push("-c", `model_reasoning_effort=${parsedMode.reasoningEffort}`);
	}

	return args;
}

// Export model capabilities for external use
export function getModelCapabilities(model: string): ReasoningEffort[] {
	return getModelReasoningCapabilities(model);
}

// Export all available reasoning efforts for UI
export function getAllReasoningEfforts(): ReasoningEffort[] {
	return ["low", "medium", "high", "xhigh"];
}
