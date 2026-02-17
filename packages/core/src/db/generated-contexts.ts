// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import { parseJson, toJson } from "./utils";

// Type for database row results
interface GeneratedContextRow {
	id: string;
	workspace: string;
	provider: string;
	model: string | null;
	content: string;
	git_hash: string | null;
	files_analyzed: number | null;
	duration: number | null;
	size_bytes: number | null;
	metadata: string | null;
	created_at: string;
}

// Type for generated context metadata
export interface ContextMetadata {
	analyzedAt?: string;
	filesExplored?: number;
	techStack?: string[];
	summary?: string;
	[key: string]: unknown;
}

// Type for generated context
export interface GeneratedContext {
	id: string;
	workspace: string;
	provider: string;
	model?: string;
	content: string;
	gitHash?: string;
	filesAnalyzed?: number;
	duration?: number;
	sizeBytes?: number;
	metadata?: ContextMetadata;
	createdAt: Date;
}

/**
 * Converts a database row to a GeneratedContext object
 */
function rowToContext(row: GeneratedContextRow): GeneratedContext {
	return {
		id: row.id,
		workspace: row.workspace,
		provider: row.provider,
		model: row.model || undefined,
		content: row.content,
		gitHash: row.git_hash || undefined,
		filesAnalyzed: row.files_analyzed !== null ? row.files_analyzed : undefined,
		duration: row.duration !== null ? row.duration : undefined,
		sizeBytes: row.size_bytes !== null ? row.size_bytes : undefined,
		metadata: parseJson<ContextMetadata>(row.metadata) || undefined,
		createdAt: new Date(row.created_at),
	};
}

/**
 * Retrieves generated contexts from the database
 */
export async function getGeneratedContexts(
	db: SQL,
	limit = 100,
): Promise<GeneratedContext[]> {
	const rows =
		(await db`SELECT * FROM generated_contexts ORDER BY created_at DESC LIMIT ${limit}`) as GeneratedContextRow[];
	return rows.map(rowToContext);
}

/**
 * Retrieves contexts for a specific workspace
 */
export async function getContextsForWorkspace(
	db: SQL,
	workspace: string,
	limit = 50,
): Promise<GeneratedContext[]> {
	const rows =
		(await db`SELECT * FROM generated_contexts WHERE workspace = ${workspace} ORDER BY created_at DESC LIMIT ${limit}`) as GeneratedContextRow[];
	return rows.map(rowToContext);
}

/**
 * Retrieves the latest context for a workspace with a specific git hash
 */
export async function getContextByGitHash(
	db: SQL,
	workspace: string,
	gitHash: string,
): Promise<GeneratedContext | null> {
	const rows =
		(await db`SELECT * FROM generated_contexts WHERE workspace = ${workspace} AND git_hash = ${gitHash} ORDER BY created_at DESC LIMIT 1`) as GeneratedContextRow[];
	return rows.length > 0 ? rowToContext(rows[0]) : null;
}

/**
 * Retrieves the latest context for a workspace (regardless of git hash)
 */
export async function getLatestContextForWorkspace(
	db: SQL,
	workspace: string,
): Promise<GeneratedContext | null> {
	const rows =
		(await db`SELECT * FROM generated_contexts WHERE workspace = ${workspace} ORDER BY created_at DESC LIMIT 1`) as GeneratedContextRow[];
	return rows.length > 0 ? rowToContext(rows[0]) : null;
}

/**
 * Retrieves a generated context by ID
 */
export async function getGeneratedContextById(
	db: SQL,
	id: string,
): Promise<Result<GeneratedContext, string>> {
	try {
		const rows =
			(await db`SELECT * FROM generated_contexts WHERE id = ${id}`) as GeneratedContextRow[];
		if (rows.length === 0) {
			return err("Context not found");
		}
		return ok(rowToContext(rows[0]));
	} catch (error) {
		const errorMsg =
			error instanceof Error ? error.message : "Unknown error occurred";
		return err(errorMsg);
	}
}

/**
 * Creates a new generated context
 */
export async function createGeneratedContext(
	db: SQL,
	context: GeneratedContext,
): Promise<Result<void, string>> {
	try {
		const now = new Date().toISOString();
		const sizeBytes = context.content
			? Buffer.byteLength(context.content, "utf8")
			: 0;

		await db`
      INSERT INTO generated_contexts (
        id, workspace, provider, model, content, git_hash,
        files_analyzed, duration, size_bytes, metadata, created_at
      ) VALUES (
        ${context.id},
        ${context.workspace},
        ${context.provider},
        ${context.model || null},
        ${context.content},
        ${context.gitHash || null},
        ${context.filesAnalyzed || null},
        ${context.duration || null},
        ${sizeBytes},
        ${toJson(context.metadata) || null},
        ${now}
      )
    `;
		return ok(undefined);
	} catch (error) {
		const errorMsg =
			error instanceof Error ? error.message : "Unknown error occurred";
		return err(errorMsg);
	}
}

/**
 * Deletes a generated context
 */
export async function deleteGeneratedContext(
	db: SQL,
	id: string,
): Promise<Result<void, string>> {
	try {
		await db`DELETE FROM generated_contexts WHERE id = ${id}`;
		return ok(undefined);
	} catch (error) {
		const errorMsg =
			error instanceof Error ? error.message : "Unknown error occurred";
		return err(errorMsg);
	}
}

/**
 * Deletes old contexts for a workspace, keeping only the most recent N
 */
export async function pruneOldContexts(
	db: SQL,
	workspace: string,
	keepCount = 10,
): Promise<Result<number, string>> {
	try {
		// Get IDs to keep
		const keepRows =
			(await db`SELECT id FROM generated_contexts WHERE workspace = ${workspace} ORDER BY created_at DESC LIMIT ${keepCount}`) as {
				id: string;
			}[];
		const keepIds = keepRows.map((r) => r.id);

		if (keepIds.length === 0) {
			return ok(0);
		}

		// Delete old ones
		const result =
			await db`DELETE FROM generated_contexts WHERE workspace = ${workspace} AND id NOT IN ${keepIds}`;
		return ok(result.affectedRows || 0);
	} catch (error) {
		const errorMsg =
			error instanceof Error ? error.message : "Unknown error occurred";
		return err(errorMsg);
	}
}
