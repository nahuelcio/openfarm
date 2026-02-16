import type { MemoryObservation, MemoryRelation } from "../types";

const OBSERVATION_PATTERN = /^-\s*\[([^\]]+)\]\s*(.+)$/;
const RELATION_PATTERN = /^-\s*([a-zA-Z_][\w-]*)\s*\[\[([^\]]+)\]\]/;
const TAG_PATTERN = /#([a-zA-Z0-9_-]+)/g;

function extractTags(value: string): string[] {
	const tags = new Set<string>();
	for (const match of value.matchAll(TAG_PATTERN)) {
		const tag = match[1]?.trim();
		if (tag) {
			tags.add(tag);
		}
	}
	return Array.from(tags);
}

export function parseObservations(content: string): MemoryObservation[] {
	const observations: MemoryObservation[] = [];
	const lines = content.split("\n");

	for (const line of lines) {
		const match = line.trim().match(OBSERVATION_PATTERN);
		if (!match) {
			continue;
		}

		const kind = match[1]?.trim();
		const value = match[2]?.trim();
		if (!kind || !value) {
			continue;
		}

		observations.push({
			kind,
			value,
			tags: extractTags(value),
		});
	}

	return observations;
}

export function parseRelations(content: string): MemoryRelation[] {
	const relations: MemoryRelation[] = [];
	const lines = content.split("\n");

	for (const line of lines) {
		const match = line.trim().match(RELATION_PATTERN);
		if (!match) {
			continue;
		}

		const type = match[1]?.trim();
		const target = match[2]?.trim();
		if (!type || !target) {
			continue;
		}

		relations.push({ type, target });
	}

	return relations;
}

export function parseInlineTags(content: string): string[] {
	const tags = new Set<string>();
	for (const line of content.split("\n")) {
		for (const tag of extractTags(line)) {
			tags.add(tag);
		}
	}
	return Array.from(tags);
}
