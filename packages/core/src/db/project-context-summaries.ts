import { err, ok, type Result } from "@openfarm/result";

// Use any type to avoid importing from bun during bundling
type SQL = any;

export interface ProjectContextSummary {
  id: string;
  projectId: string;
  repositoryUrl: string;
  branchName: string;
  summary: string;
  keyPoints?: string;
  fileReferences?: string;
  createdAt: string;
  updatedAt: string;
  tokenCount?: number;
  sessionIds?: string;
  expiresAt?: string;
}

interface ProjectContextSummaryRow {
  id: string;
  project_id: string;
  repository_url: string;
  branch_name: string;
  summary: string;
  key_points: string | null;
  file_references: string | null;
  created_at: string;
  updated_at: string;
  token_count: number;
  session_ids: string | null;
  expires_at: string | null;
}

/**
 * Retrieves a project context summary by ID.
 */
export async function getProjectContextSummary(
  db: SQL,
  id: string
): Promise<ProjectContextSummary | undefined> {
  try {
    const rows =
      (await db`SELECT * FROM project_context_summaries WHERE id = ${id}`) as ProjectContextSummaryRow[];

    if (rows.length === 0) {
      return undefined;
    }

    const [row] = rows;
    if (!row) {
      return undefined;
    }
    return {
      id: row.id,
      projectId: row.project_id,
      repositoryUrl: row.repository_url,
      branchName: row.branch_name,
      summary: row.summary,
      keyPoints: row.key_points || undefined,
      fileReferences: row.file_references || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tokenCount: row.token_count,
      sessionIds: row.session_ids || undefined,
      expiresAt: row.expires_at || undefined,
    };
  } catch (error) {
    console.error("[DB] Error in getProjectContextSummary:", error);
    return undefined;
  }
}

/**
 * Retrieves project context summaries by project and repository.
 */
export async function getProjectContextSummariesByProject(
  db: SQL,
  projectId: string,
  repositoryUrl: string,
  branchName: string
): Promise<ProjectContextSummary[]> {
  try {
    const rows = (await db`
        SELECT * FROM project_context_summaries 
        WHERE project_id = ${projectId} 
        AND repository_url = ${repositoryUrl}
        AND branch_name = ${branchName}
        ORDER BY updated_at DESC
      `) as ProjectContextSummaryRow[];

    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      repositoryUrl: row.repository_url,
      branchName: row.branch_name,
      summary: row.summary,
      keyPoints: row.key_points || undefined,
      fileReferences: row.file_references || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tokenCount: row.token_count,
      sessionIds: row.session_ids || undefined,
      expiresAt: row.expires_at || undefined,
    }));
  } catch (error) {
    console.error("[DB] Error in getProjectContextSummariesByProject:", error);
    return [];
  }
}

/**
 * Creates a new project context summary.
 */
export async function createProjectContextSummary(
  db: SQL,
  summary: ProjectContextSummary
): Promise<Result<string>> {
  try {
    await db`
      INSERT INTO project_context_summaries (
        id, project_id, repository_url, branch_name, summary,
        key_points, file_references, created_at, updated_at,
        token_count, session_ids, expires_at
      ) VALUES (
        ${summary.id}, ${summary.projectId}, ${summary.repositoryUrl}, 
        ${summary.branchName}, ${summary.summary},
        ${summary.keyPoints || null}, ${summary.fileReferences || null},
        ${summary.createdAt}, ${summary.updatedAt},
        ${summary.tokenCount || 0}, ${summary.sessionIds || null}, 
        ${summary.expiresAt || null}
      )
    `;
    return ok(summary.id);
  } catch (error) {
    console.error("[DB] Error in createProjectContextSummary:", error);
    return err(new Error(`Failed to create project context summary: ${error}`));
  }
}

/**
 * Updates an existing project context summary.
 */
export async function updateProjectContextSummary(
  db: SQL,
  id: string,
  updater: (summary: ProjectContextSummary) => Partial<ProjectContextSummary>
): Promise<Result<void>> {
  try {
    const current = await getProjectContextSummary(db, id);
    if (!current) {
      return err(new Error(`Project context summary not found: ${id}`));
    }

    const updates = updater(current);
    const merged = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db`
      UPDATE project_context_summaries SET
        summary = ${merged.summary},
        key_points = ${merged.keyPoints || null},
        file_references = ${merged.fileReferences || null},
        updated_at = ${merged.updatedAt},
        token_count = ${merged.tokenCount || 0},
        session_ids = ${merged.sessionIds || null},
        expires_at = ${merged.expiresAt || null}
      WHERE id = ${id}
    `;

    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in updateProjectContextSummary:", error);
    return err(new Error(`Failed to update project context summary: ${error}`));
  }
}

/**
 * Deletes expired project context summaries.
 */
export async function deleteExpiredProjectContextSummaries(
  db: SQL
): Promise<Result<number>> {
  try {
    const now = new Date().toISOString();
    const result = await db`
      DELETE FROM project_context_summaries 
      WHERE expires_at IS NOT NULL AND expires_at < ${now}
    `;
    return ok(result.count || 0);
  } catch (error) {
    console.error("[DB] Error in deleteExpiredProjectContextSummaries:", error);
    return err(
      new Error(`Failed to delete expired project context summaries: ${error}`)
    );
  }
}
