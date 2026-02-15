import type { Agent, AgentMessage, AgentStatus } from "@/lib/store";

export interface AgentSubthread {
	id: string;
	name: string;
	status: AgentStatus;
	lastUpdate: string;
	preview: string;
}

const SUBAGENT_PATTERNS = [
	/background_output\s+([a-zA-Z][a-zA-Z0-9_-]*)/gi,
	/\bsubagente\s+`?([a-zA-Z][a-zA-Z0-9_-]*)`?/gi,
	/\bsubagent\s+`?([a-zA-Z][a-zA-Z0-9_-]*)`?/gi,
	/\bagente\s+`([a-zA-Z][a-zA-Z0-9_-]*)`/gi,
	/\bagent\s+`([a-zA-Z][a-zA-Z0-9_-]*)`/gi,
	/@([a-zA-Z][a-zA-Z0-9_-]*)/g,
];

const BLOCKED_SUBAGENT_NAMES = new Set([
	"agent",
	"agente",
	"subagent",
	"subagente",
	"workspace",
	"repo",
]);

function normalizeSubagentName(value: string): string | null {
	const clean = value.trim().toLowerCase();
	if (!clean) {
		return null;
	}
	if (BLOCKED_SUBAGENT_NAMES.has(clean)) {
		return null;
	}
	return clean;
}

function extractSubagentNames(content: string): string[] {
	const names = new Set<string>();
	for (const pattern of SUBAGENT_PATTERNS) {
		const regex = new RegExp(pattern.source, pattern.flags);
		for (const match of content.matchAll(regex)) {
			const raw = match[1];
			if (!raw) {
				continue;
			}
			const normalized = normalizeSubagentName(raw);
			if (!normalized) {
				continue;
			}
			names.add(normalized);
		}
	}
	return [...names];
}

function contentMentionsSubthread(
	content: string,
	normalizedName: string,
): boolean {
	if (!content.trim()) {
		return false;
	}
	if (extractSubagentNames(content).includes(normalizedName)) {
		return true;
	}
	return new RegExp(`\\b${normalizedName}\\b`, "i").test(content);
}

function extractMatchingLines(
	content: string,
	normalizedName: string,
): string[] {
	return content
		.replaceAll("\r\n", "\n")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && contentMentionsSubthread(line, normalizedName));
}

function inferSubthreadStatus(content: string): AgentStatus {
	const normalized = content.toLowerCase();
	if (
		normalized.includes("(completed)") ||
		normalized.includes("completed") ||
		normalized.includes("done") ||
		normalized.includes("finalizado") ||
		normalized.includes("completado")
	) {
		return "completed";
	}
	if (
		normalized.includes("failed") ||
		normalized.includes("error") ||
		normalized.includes("fallo")
	) {
		return "error";
	}
	if (
		normalized.includes("working") ||
		normalized.includes("running") ||
		normalized.includes("thinking") ||
		normalized.includes("trabajando")
	) {
		return "running";
	}
	return "idle";
}

export function extractSubthreads(
	agent: Pick<Agent, "id" | "messages">,
): AgentSubthread[] {
	const byName = new Map<string, AgentSubthread>();
	for (const message of agent.messages) {
		const names = extractSubagentNames(message.content || "");
		if (names.length === 0) {
			continue;
		}
		const statusFromMessage = inferSubthreadStatus(message.content || "");
		for (const name of names) {
			const existing = byName.get(name);
			if (!existing) {
				byName.set(name, {
					id: `${agent.id}::${name}`,
					name,
					status: statusFromMessage,
					lastUpdate: message.timestamp,
					preview: message.content,
				});
				continue;
			}
			existing.status = statusFromMessage;
			existing.lastUpdate = message.timestamp;
			existing.preview = message.content;
		}
	}

	return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterMessagesForSubthread(
	messages: AgentMessage[],
	subthreadName: string,
): AgentMessage[] {
	const normalizedName = normalizeSubagentName(subthreadName);
	if (!normalizedName) {
		return messages;
	}

	const filtered: AgentMessage[] = [];
	let includeFollowingAgentReply = false;

	for (const message of messages) {
		if (message.thinking) {
			if (includeFollowingAgentReply) {
				filtered.push(message);
			}
			continue;
		}

		if (message.role === "user") {
			const mentionsSubthread = contentMentionsSubthread(
				message.content || "",
				normalizedName,
			);
			includeFollowingAgentReply = mentionsSubthread;
			if (mentionsSubthread) {
				filtered.push(message);
			}
			continue;
		}

		const matchingLines = extractMatchingLines(
			message.content || "",
			normalizedName,
		);
		const mentionsSubthread = matchingLines.length > 0;
		if (mentionsSubthread) {
			if (message.role === "system") {
				filtered.push({
					...message,
					content: matchingLines.join("\n"),
				});
			} else {
				filtered.push(message);
			}
			includeFollowingAgentReply = true;
			continue;
		}

		if (includeFollowingAgentReply && message.role === "agent") {
			filtered.push(message);
		}
	}

	return filtered;
}
