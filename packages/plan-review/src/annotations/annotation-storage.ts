import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { Annotation } from "../types";
import type {
	AnnotationFilter,
	CreateAnnotationRequest,
	UpdateAnnotationRequest,
} from "./annotation-types";

export class AnnotationStorage {
	private db: Database.Database;

	constructor(dbPath?: string) {
		this.db = new Database(dbPath || ":memory:");
		this.initializeSchema();
	}

	private initializeSchema(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        planId TEXT NOT NULL,
        stepId TEXT,
        content TEXT NOT NULL,
        positionStart INTEGER,
        positionEnd INTEGER,
        line INTEGER,
        author TEXT NOT NULL,
        createdAt DATETIME NOT NULL,
        resolved BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (planId) REFERENCES plans (id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_annotations_planId ON annotations(planId);
      CREATE INDEX IF NOT EXISTS idx_annotations_stepId ON annotations(stepId);
      CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
      CREATE INDEX IF NOT EXISTS idx_annotations_resolved ON annotations(resolved);
    `);
	}

	create(request: CreateAnnotationRequest): Annotation {
		const annotation: Annotation = {
			id: uuidv4(),
			type: request.type,
			planId: request.planId,
			stepId: request.stepId,
			content: request.content,
			position: request.position,
			author: request.author,
			createdAt: new Date(),
			resolved: false,
		};

		const stmt = this.db.prepare(`
      INSERT INTO annotations (
        id, type, planId, stepId, content, 
        positionStart, positionEnd, line, author, createdAt, resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			annotation.id,
			annotation.type,
			annotation.planId,
			annotation.stepId,
			annotation.content,
			annotation.position?.start,
			annotation.position?.end,
			annotation.position?.line,
			annotation.author,
			annotation.createdAt.toISOString(),
			annotation.resolved ? 1 : 0,
		);

		return annotation;
	}

	update(id: string, request: UpdateAnnotationRequest): Annotation | null {
		const existing = this.findById(id);
		if (!existing) return null;

		const updates: string[] = [];
		const values: unknown[] = [];

		if (request.content !== undefined) {
			updates.push("content = ?");
			values.push(request.content);
		}

		if (request.resolved !== undefined) {
			updates.push("resolved = ?");
			values.push(request.resolved ? 1 : 0);
		}

		if (updates.length === 0) return existing;

		updates.push("updatedAt = ?");
		values.push(new Date().toISOString());
		values.push(id);

		const stmt = this.db.prepare(`
      UPDATE annotations 
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

		stmt.run(...values);

		return this.findById(id);
	}

	findById(id: string): Annotation | null {
		const stmt = this.db.prepare("SELECT * FROM annotations WHERE id = ?");
		const row = stmt.get(id) as any;
		return row ? this.rowToAnnotation(row) : null;
	}

	findByFilter(filter: AnnotationFilter): Annotation[] {
		const conditions: string[] = [];
		const values: unknown[] = [];

		if (filter.planId) {
			conditions.push("planId = ?");
			values.push(filter.planId);
		}

		if (filter.stepId) {
			conditions.push("stepId = ?");
			values.push(filter.stepId);
		}

		if (filter.type) {
			conditions.push("type = ?");
			values.push(filter.type);
		}

		if (filter.resolved !== undefined) {
			conditions.push("resolved = ?");
			values.push(filter.resolved ? 1 : 0);
		}

		if (filter.author) {
			conditions.push("author = ?");
			values.push(filter.author);
		}

		const whereClause =
			conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
		const stmt = this.db.prepare(
			`SELECT * FROM annotations ${whereClause} ORDER BY createdAt ASC`,
		);
		const rows = stmt.all(...values) as any[];

		return rows.map((row) => this.rowToAnnotation(row));
	}

	delete(id: string): boolean {
		const stmt = this.db.prepare("DELETE FROM annotations WHERE id = ?");
		const result = stmt.run(id);
		return result.changes > 0;
	}

	deleteByPlanId(planId: string): number {
		const stmt = this.db.prepare("DELETE FROM annotations WHERE planId = ?");
		const result = stmt.run(planId);
		return result.changes;
	}

	private rowToAnnotation(row: any): Annotation {
		const annotation: Annotation = {
			id: row.id,
			type: row.type,
			planId: row.planId,
			stepId: row.stepId,
			content: row.content,
			author: row.author,
			createdAt: new Date(row.createdAt),
			resolved: row.resolved === 1,
		};

		if (row.positionStart !== null && row.positionEnd !== null) {
			annotation.position = {
				start: row.positionStart,
				end: row.positionEnd,
				line: row.line,
			};
		}

		return annotation;
	}

	close(): void {
		this.db.close();
	}
}
