import { mkdir } from "node:fs/promises";
import path from "node:path";
import type Database from "better-sqlite3";
import BetterSqlite3 from "better-sqlite3";
import type { MemoryDocument } from "../types";

interface MemoryIndexRow {
	id: string;
	title: string;
	slug: string;
	bank_id: string;
	scope: "local" | "shared";
	file_path: string;
	content: string;
	tags_json: string;
	observations_json: string;
	relations_json: string;
	created_at: string;
	updated_at: string;
}

export class MemoryIndex {
	private db: Database.Database;

	constructor(dbPath: string) {
		this.db = new BetterSqlite3(dbPath);
		this.initializeSchema();
	}

	static async create(dbPath: string): Promise<MemoryIndex> {
		await mkdir(path.dirname(dbPath), { recursive: true });
		return new MemoryIndex(dbPath);
	}

	private initializeSchema(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        bank_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        observations_json TEXT NOT NULL,
        relations_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_bank_id ON memories(bank_id);
      CREATE INDEX IF NOT EXISTS idx_memories_slug ON memories(slug);
      CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at);
    `);
	}

	upsertMemory(memory: MemoryDocument): void {
		const statement = this.db.prepare(`
      INSERT INTO memories (
        id, title, slug, bank_id, scope, file_path, content,
        tags_json, observations_json, relations_json, created_at, updated_at
      ) VALUES (
        @id, @title, @slug, @bank_id, @scope, @file_path, @content,
        @tags_json, @observations_json, @relations_json, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        slug = excluded.slug,
        bank_id = excluded.bank_id,
        scope = excluded.scope,
        file_path = excluded.file_path,
        content = excluded.content,
        tags_json = excluded.tags_json,
        observations_json = excluded.observations_json,
        relations_json = excluded.relations_json,
        updated_at = excluded.updated_at;
    `);

		statement.run({
			id: memory.id,
			title: memory.title,
			slug: memory.slug,
			bank_id: memory.bankId,
			scope: memory.scope,
			file_path: memory.path,
			content: memory.content,
			tags_json: JSON.stringify(memory.tags),
			observations_json: JSON.stringify(memory.observations),
			relations_json: JSON.stringify(memory.relations),
			created_at: memory.createdAt,
			updated_at: memory.updatedAt,
		});
	}

	findById(id: string): MemoryDocument | null {
		const row = this.db
			.prepare("SELECT * FROM memories WHERE id = ?")
			.get(id) as MemoryIndexRow | undefined;

		if (!row) {
			return null;
		}

		return this.mapRow(row);
	}

	search(query: string, bankIds: string[], limit: number): MemoryDocument[] {
		const normalizedQuery = `%${query.toLowerCase()}%`;
		const clauses =
			bankIds.length > 0
				? `AND bank_id IN (${bankIds.map(() => "?").join(",")})`
				: "";

		const rows = this.db
			.prepare(
				`SELECT *
         FROM memories
         WHERE (
           LOWER(title) LIKE ? OR
           LOWER(content) LIKE ? OR
           LOWER(tags_json) LIKE ?
         )
         ${clauses}
         ORDER BY updated_at DESC
         LIMIT ?`,
			)
			.all(
				normalizedQuery,
				normalizedQuery,
				normalizedQuery,
				...bankIds,
				limit,
			) as MemoryIndexRow[];

		return rows.map((row) => this.mapRow(row));
	}

	listByBank(bankId: string): MemoryDocument[] {
		const rows = this.db
			.prepare(
				"SELECT * FROM memories WHERE bank_id = ? ORDER BY updated_at DESC",
			)
			.all(bankId) as MemoryIndexRow[];

		return rows.map((row) => this.mapRow(row));
	}

	close(): void {
		this.db.close();
	}

	private mapRow(row: MemoryIndexRow): MemoryDocument {
		return {
			id: row.id,
			title: row.title,
			slug: row.slug,
			bankId: row.bank_id,
			scope: row.scope,
			path: row.file_path,
			content: row.content,
			tags: JSON.parse(row.tags_json) as string[],
			observations: JSON.parse(row.observations_json),
			relations: JSON.parse(row.relations_json),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}
}
