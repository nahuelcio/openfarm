# Plan de Implementación V2: Resume de Sesiones + Logs Persistidos

## Overview (Actualizado)

Implementar la capacidad de persistir logs detallados en SQLite y permitir **resumir** sesiones de Task Loop desde el punto donde quedaron, después de cerrar el TUI.

**IMPORTANTE**: El Task Loop corre en el mismo proceso que el TUI. Cuando el TUI se cierra, el Task Loop muere. Lo que implementamos es un **"resume"** (reconstruir estado y continuar), NO un "reconnect" a proceso vivo.

**Objetivo**: Cerrás el TUI, volvés a abrirlo, y podés seguir desde el último task que se estaba ejecutando, con todo el histórico de logs disponible.

---

## Decisiones Arquitectónicas Clave

### 1. Resume vs Reconnect

| Aspecto | Reconnect (V1) | Resume (V2) |
|---------|----------------|-------------|
| Proceso | Sigue corriendo en background | Murió con el TUI |
| Complejidad | Alta (daemon, heartbeats) | Media (solo persistencia) |
| Confiabilidad | Baja (race conditions) | Alta (reconstrucción) |
| UX | "Reconectar a sesión" | "Continuar desde donde quedó" |

**Elegimos Resume** porque el 95% del valor se logra con logs persistidos + checkpoints, sin la complejidad de procesos detached.

### 2. Sin Dependencia Circular

**Problema V1**: `execution-logger` → `core` (para DB) → `execution-logger` (para logging)

**Solución V2**:
```
core/                         execution-logger/
├── db/                       └── EventEmitter pattern
│   └── execution-logs.ts         └── Emite eventos, NO escribe a DB
├── schema.ts                 sdk/
└── ExecutionLogSink.ts           └── Suscribe eventos y escribe a DB
```

El `ExecutionLogger` es un emitter puro. El SDK (que ya depende de core y execution-logger) conecta el logger a la DB.

### 3. Límites de SQLite

| Recurso | Límite | Acción al superar |
|---------|--------|-------------------|
| Logs por ejecución | 10,000 | Borrar los 1,000 más viejos |
| Tamaño total tabla | 100MB | Archivar y truncar |
| Retención | 30 días | Cleanup automático |
| Nivel de log por defecto | info+ | debug solo en memoria |

---

## Arquitectura V2

```
┌─────────────────────────────────────────────────────────────────┐
│                         TUI (OpenTUI)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Dashboard  │  │  Task Loop   │  │   Resume Dialog      │   │
│  │   (lista)    │  │   Screen     │  │  "Continuar desde:"  │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ resumeSession(executionId)
                     │ - Cargar checkpoint
                     │ - Reconstruir estado
                     │ - Iniciar nuevo TaskLoop
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SDK (Bridge)                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ExecutionLogSink                                        │   │
│  │  - Suscribe a ExecutionLogger events                     │   │
│  │  - Escribe a SQLite (con batching)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SQLite (core)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │ tui_executions  │  │ execution_logs  │  │session_checkpoints│ │
│  │   (existe)      │  │    (nuevo)      │  │    (nuevo)     │   │
│  └─────────────────┘  └─────────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Schema y Módulo DB (Con Migraciones)

### 1.1 Extender Schema con Versioning

**Archivo**: `packages/core/src/db/schema.ts`

```typescript
// Agregar al final del archivo
export const executionLogsTable = sqliteTable('execution_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  executionId: text('execution_id').notNull()
    .references(() => tuiExecutionsTable.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
  level: text('level', { enum: ['info', 'warn', 'error', 'debug'] }).notNull(),
  component: text('component').notNull(),
  message: text('message').notNull(),
  metadata: text('metadata', { mode: 'json' }),
});

// Tabla de checkpoints para resume
export const sessionCheckpointsTable = sqliteTable('session_checkpoints', {
  id: text('id').primaryKey(), // sessionId
  executionId: text('execution_id').notNull()
    .references(() => tuiExecutionsTable.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['task-loop', 'workflow', 'single'] }).notNull(),
  status: text('status', { 
    enum: ['running', 'paused', 'completed', 'error', 'resumed'] 
  }).notNull(),
  currentTaskId: text('current_task_id'),
  completedTasks: text('completed_tasks', { mode: 'json' })
    .$defaultFn(() => '[]'),
  progressTotal: integer('progress_total'),
  progressCompleted: integer('progress_completed'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  lastUpdate: integer('last_update', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
  resumedFromId: text('resumed_from_id'), // Si es resume, ID del checkpoint original
  metadata: text('metadata', { mode: 'json' }),
});

// Índices optimizados
export const executionLogsExecutionIdIdx = index('logs_execution_id_idx')
  .on(executionLogsTable.executionId);
export const executionLogsTimestampIdx = index('logs_timestamp_idx')
  .on(executionLogsTable.timestamp);
export const sessionCheckpointsStatusIdx = index('checkpoints_status_idx')
  .on(sessionCheckpointsTable.status);
export const sessionCheckpointsLastUpdateIdx = index('checkpoints_last_update_idx')
  .on(sessionCheckpointsTable.lastUpdate);

// Tabla de schema versioning para migraciones
export const schemaVersionTable = sqliteTable('schema_version', {
  id: integer('id').primaryKey(),
  version: integer('version').notNull(),
  appliedAt: integer('applied_at', { mode: 'timestamp' }).notNull()
    .$defaultFn(() => new Date()),
});
```

### 1.2 Sistema de Migraciones

**Nuevo archivo**: `packages/core/src/db/migrations/002_add_execution_logs.ts`

```typescript
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export async function up(db: BetterSQLite3Database): Promise<void> {
  // Crear tabla de logs
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id TEXT NOT NULL REFERENCES tui_executions(id) ON DELETE CASCADE,
      timestamp INTEGER NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'debug')),
      component TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT
    )
  `);

  // Índices
  await db.run(sql`CREATE INDEX logs_execution_id_idx ON execution_logs(execution_id)`);
  await db.run(sql`CREATE INDEX logs_timestamp_idx ON execution_logs(timestamp)`);

  // Tabla de checkpoints
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS session_checkpoints (
      id TEXT PRIMARY KEY,
      execution_id TEXT NOT NULL REFERENCES tui_executions(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('task-loop', 'workflow', 'single')),
      status TEXT NOT NULL CHECK(status IN ('running', 'paused', 'completed', 'error', 'resumed')),
      current_task_id TEXT,
      completed_tasks TEXT DEFAULT '[]',
      progress_total INTEGER,
      progress_completed INTEGER,
      start_time INTEGER NOT NULL,
      last_update INTEGER NOT NULL,
      resumed_from_id TEXT,
      metadata TEXT
    )
  `);

  await db.run(sql`CREATE INDEX checkpoints_status_idx ON session_checkpoints(status)`);
  await db.run(sql`CREATE INDEX checkpoints_last_update_idx ON session_checkpoints(last_update)`);
}

export async function down(db: BetterSQLite3Database): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS execution_logs`);
  await db.run(sql`DROP TABLE IF EXISTS session_checkpoints`);
}
```

**Actualizar**: `packages/core/src/db/migrations.ts`

```typescript
import { migrate001 } from './migrations/001_initial';
import { migrate002 } from './migrations/002_add_execution_logs';

const migrations = [
  { version: 1, migrate: migrate001 },
  { version: 2, migrate: migrate002 },
];

export async function runMigrations(db: BetterSQLite3Database): Promise<void> {
  // Crear tabla de versiones si no existe
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY,
      version INTEGER NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  // Obtener versión actual
  const result = await db.select().from(schemaVersionTable).limit(1);
  const currentVersion = result[0]?.version ?? 0;

  // Aplicar migraciones pendientes
  for (const { version, migrate } of migrations) {
    if (version > currentVersion) {
      console.log(`[DB] Applying migration ${version}...`);
      await migrate(db);
      await db.insert(schemaVersionTable).values({ version, appliedAt: new Date() });
    }
  }
}
```

### 1.3 Módulo DB con Límites y Rotación

**Nuevo archivo**: `packages/core/src/db/execution-logs.ts`

```typescript
import { eq, and, desc, asc, sql, count } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { executionLogsTable, sessionCheckpointsTable } from './schema';

// Límites configurables
const MAX_LOGS_PER_EXECUTION = 10_000;
const LOG_BATCH_SIZE = 100;
const MAX_LOG_AGE_DAYS = 30;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ExecutionLogInsert {
  executionId: string;
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Buffer para batching
let logBuffer: ExecutionLogInsert[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

async function flushLogs(db: BetterSQLite3Database): Promise<void> {
  if (logBuffer.length === 0) return;

  const batch = logBuffer.splice(0, logBuffer.length);
  
  try {
    // Verificar límite antes de insertar
    for (const log of batch) {
      const currentCount = await db
        .select({ count: count() })
        .from(executionLogsTable)
        .where(eq(executionLogsTable.executionId, log.executionId));

      if (currentCount[0].count >= MAX_LOGS_PER_EXECUTION) {
        // Rotar: borrar los 1,000 más viejos de esta ejecución
        const idsToDelete = await db
          .select({ id: executionLogsTable.id })
          .from(executionLogsTable)
          .where(eq(executionLogsTable.executionId, log.executionId))
          .orderBy(asc(executionLogsTable.timestamp))
          .limit(1000);

        if (idsToDelete.length > 0) {
          await db.delete(executionLogsTable)
            .where(sql`${executionLogsTable.id} IN (${idsToDelete.map(r => r.id).join(',')})`);
        }
      }
    }

    // Insertar batch
    await db.insert(executionLogsTable).values(
      batch.map(log => ({
        executionId: log.executionId,
        timestamp: log.timestamp,
        level: log.level,
        component: log.component,
        message: log.message,
        metadata: log.metadata ? JSON.stringify(log.metadata) : null,
      }))
    );
  } catch (error) {
    console.error('[ExecutionLogs] Failed to flush:', error);
  }
}

export function queueLogInsert(db: BetterSQLite3Database, log: ExecutionLogInsert): void {
  logBuffer.push(log);

  // Flush inmediato si es error (no queremos perder errores)
  if (log.level === 'error') {
    flushLogs(db);
    return;
  }

  // Batch: flush cada 100 logs o cada 1 segundo
  if (logBuffer.length >= LOG_BATCH_SIZE) {
    flushLogs(db);
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushLogs(db);
      flushTimeout = null;
    }, 1000);
  }
}

// Obtener logs con paginación (para no bloquear UI)
export async function getExecutionLogsPaginated(
  db: BetterSQLite3Database,
  executionId: string,
  options: {
    limit?: number;
    offset?: number;
    level?: LogLevel;
  } = {}
): Promise<{
  logs: Array<{
    id: number;
    executionId: string;
    timestamp: Date;
    level: LogLevel;
    component: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>;
  total: number;
}> {
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  let whereClause = eq(executionLogsTable.executionId, executionId);
  if (options.level) {
    whereClause = and(whereClause, eq(executionLogsTable.level, options.level))!;
  }

  const [logs, totalResult] = await Promise.all([
    db.select()
      .from(executionLogsTable)
      .where(whereClause)
      .orderBy(desc(executionLogsTable.timestamp))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() })
      .from(executionLogsTable)
      .where(whereClause),
  ]);

  return {
    logs: logs.map(r => ({
      id: r.id,
      executionId: r.executionId,
      timestamp: r.timestamp,
      level: r.level as LogLevel,
      component: r.component,
      message: r.message,
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
    })),
    total: totalResult[0].count,
  };
}

// Cleanup de logs viejos
export async function cleanupOldLogs(
  db: BetterSQLite3Database,
  maxAgeDays: number = MAX_LOG_AGE_DAYS
): Promise<number> {
  const result = await db.delete(executionLogsTable)
    .where(sql`${executionLogsTable.timestamp} < datetime('now', '-${maxAgeDays} days')`);
  return result.changes || 0;
}
```

### 1.4 Session Checkpoints Module

**Nuevo archivo**: `packages/core/src/db/session-checkpoints.ts`

```typescript
import { eq, and, desc, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sessionCheckpointsTable } from './schema';

export type SessionType = 'task-loop' | 'workflow' | 'single';
export type SessionStatus = 'running' | 'paused' | 'completed' | 'error' | 'resumed';

export interface SessionCheckpointInsert {
  id: string;
  executionId: string;
  type: SessionType;
  status: SessionStatus;
  currentTaskId?: string;
  completedTasks?: string[];
  progressTotal?: number;
  progressCompleted?: number;
  startTime: Date;
  metadata?: Record<string, unknown>;
  resumedFromId?: string; // Si es resume de otra sesión
}

export interface SessionCheckpoint extends SessionCheckpointInsert {
  lastUpdate: Date;
}

// Tiempo después del cual consideramos una sesión "probablemente muerta"
const SESSION_TIMEOUT_MS = 60_000; // 1 minuto sin update

export async function upsertCheckpoint(
  db: BetterSQLite3Database,
  data: SessionCheckpointInsert
): Promise<void> {
  await db.insert(sessionCheckpointsTable)
    .values({
      ...data,
      lastUpdate: new Date(),
      completedTasks: JSON.stringify(data.completedTasks || []),
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    })
    .onConflictDoUpdate({
      target: sessionCheckpointsTable.id,
      set: {
        status: data.status,
        currentTaskId: data.currentTaskId,
        completedTasks: JSON.stringify(data.completedTasks || []),
        progressTotal: data.progressTotal,
        progressCompleted: data.progressCompleted,
        lastUpdate: new Date(),
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
}

export async function getCheckpoint(
  db: BetterSQLite3Database,
  sessionId: string
): Promise<SessionCheckpoint | null> {
  const result = await db.select()
    .from(sessionCheckpointsTable)
    .where(eq(sessionCheckpointsTable.id, sessionId))
    .limit(1);

  if (!result[0]) return null;

  return {
    id: result[0].id,
    executionId: result[0].executionId,
    type: result[0].type as SessionType,
    status: result[0].status as SessionStatus,
    currentTaskId: result[0].currentTaskId ?? undefined,
    completedTasks: result[0].completedTasks 
      ? JSON.parse(result[0].completedTasks as string) 
      : [],
    progressTotal: result[0].progressTotal ?? undefined,
    progressCompleted: result[0].progressCompleted ?? undefined,
    startTime: result[0].startTime,
    lastUpdate: result[0].lastUpdate,
    resumedFromId: result[0].resumedFromId ?? undefined,
    metadata: result[0].metadata 
      ? JSON.parse(result[0].metadata as string) 
      : undefined,
  };
}

// Buscar sesiones que pueden resumirse
export async function getResumableSessions(
  db: BetterSQLite3Database,
  options: {
    workspace?: string;
    limit?: number;
  } = {}
): Promise<Array<SessionCheckpoint & { isProbablyDead: boolean }>> {
  const limit = options.limit ?? 10;

  // Buscar checkpoints recientes en estado running/paused
  const results = await db.select()
    .from(sessionCheckpointsTable)
    .where(
      and(
        sql`${sessionCheckpointsTable.status} IN ('running', 'paused')`,
        sql`${sessionCheckpointsTable.lastUpdate} > datetime('now', '-7 days')` // Solo última semana
      )
    )
    .orderBy(desc(sessionCheckpointsTable.lastUpdate))
    .limit(limit);

  const now = Date.now();

  return results.map(r => {
    const checkpoint: SessionCheckpoint = {
      id: r.id,
      executionId: r.executionId,
      type: r.type as SessionType,
      status: r.status as SessionStatus,
      currentTaskId: r.currentTaskId ?? undefined,
      completedTasks: r.completedTasks 
        ? JSON.parse(r.completedTasks as string) 
        : [],
      progressTotal: r.progressTotal ?? undefined,
      progressCompleted: r.progressCompleted ?? undefined,
      startTime: r.startTime,
      lastUpdate: r.lastUpdate,
      resumedFromId: r.resumedFromId ?? undefined,
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
    };

    // Consideramos "muerta" si pasó más de SESSION_TIMEOUT_MS sin update
    const isProbablyDead = now - r.lastUpdate.getTime() > SESSION_TIMEOUT_MS;

    return { ...checkpoint, isProbablyDead };
  });
}

// Marcar como completada/error
export async function finalizeCheckpoint(
  db: BetterSQLite3Database,
  sessionId: string,
  status: 'completed' | 'error' | 'resumed'
): Promise<void> {
  await db.update(sessionCheckpointsTable)
    .set({ status, lastUpdate: new Date() })
    .where(eq(sessionCheckpointsTable.id, sessionId));
}

// Cleanup de checkpoints viejos
export async function cleanupOldCheckpoints(
  db: BetterSQLite3Database,
  maxAgeDays: number = 7
): Promise<number> {
  const result = await db.delete(sessionCheckpointsTable)
    .where(sql`${sessionCheckpointsTable.lastUpdate} < datetime('now', '-${maxAgeDays} days')`);
  return result.changes || 0;
}
```

---

## Fase 2: ExecutionLogger Refactor (Sin dependencia circular)

### 2.1 ExecutionLogger como Event Emitter

**Archivo**: `packages/execution-logger/src/services/execution-logger.ts`

```typescript
// ELIMINAR dependencia a @openfarm/core
// El logger es puro, no sabe de DB

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  jobId: string;
  tenantId: string;
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

type LogListener = (entry: LogEntry) => void;

export class ExecutionLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private readonly maxMemoryLogs: number;

  constructor(options: { maxMemoryLogs?: number } = {}) {
    this.maxMemoryLogs = options.maxMemoryLogs ?? 1000;
  }

  // Método principal de logging
  log(
    jobId: string,
    tenantId: string,
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    component: string = 'system'
  ): void {
    const entry: LogEntry = {
      jobId,
      tenantId,
      timestamp: new Date(),
      level,
      component,
      message,
      metadata,
    };

    // Guardar en memoria (circular buffer)
    this.logs.push(entry);
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift();
    }

    // Notificar listeners (async, no bloquea)
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (error) {
        // Ignorar errores de listeners
      }
    }

    // Console output solo en modo debug o si no hay TUI
    if (process.env.DEBUG || this.listeners.size === 0) {
      this.outputToConsole(entry);
    }
  }

  // Suscribirse a logs (para el SDK conectar a DB)
  onLog(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Obtener logs de memoria
  getLogs(jobId?: string, level?: LogLevel): LogEntry[] {
    let result = this.logs;
    if (jobId) {
      result = result.filter(l => l.jobId === jobId);
    }
    if (level) {
      result = result.filter(l => l.level === level);
    }
    return result;
  }

  private outputToConsole(entry: LogEntry): void {
    const data = {
      jobId: entry.jobId,
      level: entry.level,
      component: entry.component,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      ...entry.metadata,
    };

    switch (entry.level) {
      case 'error':
        console.error(JSON.stringify(data));
        break;
      case 'warn':
        console.warn(JSON.stringify(data));
        break;
      case 'debug':
        console.debug(JSON.stringify(data));
        break;
      default:
        console.log(JSON.stringify(data));
    }
  }

  // Métodos existentes de métricas (sin cambios)
  startExecution(jobId: string, tenantId: string): void {
    this.log(jobId, tenantId, 'info', 'Execution started', {}, 'system');
  }

  // ... resto de métodos existentes ...
}

// Singleton global
export const globalExecutionLogger = new ExecutionLogger();
```

---

## Fase 3: Bridge en SDK (Conecta Logger a DB)

### 3.1 ExecutionLogSink

**Nuevo archivo**: `packages/sdk/src/services/execution-log-sink.ts`

```typescript
import { getDb } from '@openfarm/core/db';
import { queueLogInsert } from '@openfarm/core/db/execution-logs';
import { globalExecutionLogger, type LogEntry, type LogLevel } from '@openfarm/execution-logger';

export interface LogSinkConfig {
  minLevel?: LogLevel;
  enabled?: boolean;
}

export class ExecutionLogSink {
  private unsubscribe?: () => void;
  private config: Required<LogSinkConfig>;

  constructor(config: LogSinkConfig = {}) {
    this.config = {
      minLevel: 'info',
      enabled: true,
      ...config,
    };
  }

  start(): void {
    if (!this.config.enabled) return;

    this.unsubscribe = globalExecutionLogger.onLog((entry) => {
      // Filtrar por nivel
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      if (levels.indexOf(entry.level) < levels.indexOf(this.config.minLevel)) {
        return;
      }

      // Queue para escritura async (no bloquea)
      getDb().then(db => {
        queueLogInsert(db, {
          executionId: entry.jobId,
          timestamp: entry.timestamp,
          level: entry.level,
          component: entry.component,
          message: entry.message,
          metadata: entry.metadata,
        });
      }).catch(error => {
        // Silent fail - el logger de memoria ya tiene el log
        console.error('[LogSink] Failed to queue log:', error);
      });
    });
  }

  stop(): void {
    this.unsubscribe?.();
  }
}

// Singleton
export const logSink = new ExecutionLogSink();
```

### 3.2 Checkpoint Service

**Nuevo archivo**: `packages/sdk/src/services/checkpoint-service.ts`

```typescript
import { getDb } from '@openfarm/core/db';
import {
  upsertCheckpoint,
  getCheckpoint,
  getResumableSessions,
  finalizeCheckpoint,
  type SessionCheckpointInsert,
  type SessionCheckpoint,
} from '@openfarm/core/db/session-checkpoints';

export { type SessionCheckpoint };

export class CheckpointService {
  private checkpointInterval?: ReturnType<typeof setInterval>;
  private currentCheckpoint?: SessionCheckpointInsert;

  // Guardar checkpoint periódicamente
  startCheckpointing(checkpoint: SessionCheckpointInsert, intervalMs: number = 5000): void {
    this.currentCheckpoint = checkpoint;
    
    // Guardar inmediatamente
    this.saveCheckpoint();

    // Y cada intervalo
    this.checkpointInterval = setInterval(() => {
      this.saveCheckpoint();
    }, intervalMs);
  }

  stopCheckpointing(): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = undefined;
    }
  }

  async saveCheckpoint(): Promise<void> {
    if (!this.currentCheckpoint) return;

    try {
      const db = await getDb();
      await upsertCheckpoint(db, this.currentCheckpoint);
    } catch (error) {
      console.error('[CheckpointService] Failed to save:', error);
    }
  }

  async finalize(status: 'completed' | 'error' | 'resumed'): Promise<void> {
    this.stopCheckpointing();
    if (!this.currentCheckpoint) return;

    try {
      const db = await getDb();
      await finalizeCheckpoint(db, this.currentCheckpoint.id, status);
    } catch (error) {
      console.error('[CheckpointService] Failed to finalize:', error);
    }
  }

  // Buscar sesiones resumibles
  static async findResumableSessions(): Promise<Array<SessionCheckpoint & { isProbablyDead: boolean }>> {
    const db = await getDb();
    return getResumableSessions(db, { limit: 10 });
  }

  // Cargar checkpoint específico
  static async loadCheckpoint(sessionId: string): Promise<SessionCheckpoint | null> {
    const db = await getDb();
    return getCheckpoint(db, sessionId);
  }
}
```

---

## Fase 4: UI de Resume

### 4.1 Store con Auto-refresh

**Archivo**: `packages/sdk/src/tui/store.ts` (agregar)

```typescript
interface AppState {
  // ... estado existente ...
  
  // Resume
  resumableSessions: Array<SessionCheckpoint & { isProbablyDead: boolean }>;
  showResumeDialog: boolean;
  selectedResumableSession: string | null;
  isLoadingResumableSessions: boolean;
  
  // Acciones
  loadResumableSessions: () => Promise<void>;
  selectResumableSession: (id: string | null) => void;
  resumeSession: (sessionId: string) => Promise<void>;
  dismissResumeDialog: () => void;
  refreshResumableSessions: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // ... inicialización ...
  resumableSessions: [],
  showResumeDialog: false,
  selectedResumableSession: null,
  isLoadingResumableSessions: false,

  loadResumableSessions: async () => {
    set({ isLoadingResumableSessions: true });
    try {
      const sessions = await CheckpointService.findResumableSessions();
      set({
        resumableSessions: sessions,
        showResumeDialog: sessions.length > 0,
        selectedResumableSession: sessions[0]?.id || null,
      });
    } catch (error) {
      console.error('Failed to load resumable sessions:', error);
    } finally {
      set({ isLoadingResumableSessions: false });
    }
  },

  refreshResumableSessions: async () => {
    // Llamar periódicamente mientras el diálogo está abierto
    const load = get().loadResumableSessions;
    await load();
  },

  selectResumableSession: (id) => set({ selectedResumableSession: id }),

  resumeSession: async (sessionId) => {
    const session = get().resumableSessions.find(s => s.id === sessionId);
    if (!session) return;

    set({ showResumeDialog: false });
    
    // Navegar a task-loop con modo resume
    set({
      screen: 'task-loop',
      activeTab: 'task-loop',
    });

    // El TaskLoopScreen detectará el modo resume por el checkpoint
  },

  dismissResumeDialog: () => set({ showResumeDialog: false }),
}));
```

### 4.2 Resume Dialog Component

**Nuevo archivo**: `packages/sdk/src/tui/components/resume-dialog.tsx`

```typescript
import { Box, Text, useInput, Spinner } from '@openfarm/tui-opentui';
import { useEffect, useState } from 'react';
import { useThemeColors } from '../theme/hooks';
import { useStore } from '../store';

export function ResumeDialog() {
  const {
    resumableSessions,
    selectedResumableSession,
    isLoadingResumableSessions,
    selectResumableSession,
    resumeSession,
    dismissResumeDialog,
    refreshResumableSessions,
  } = useStore();

  const colors = useThemeColors();
  const selectedIndex = resumableSessions.findIndex(s => s.id === selectedResumableSession);
  
  // Auto-refresh cada 5 segundos mientras está abierto
  useEffect(() => {
    const interval = setInterval(() => {
      refreshResumableSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshResumableSessions]);

  useInput((input, key) => {
    if (isLoadingResumableSessions) return;

    if (key.escape || input === 'q') {
      dismissResumeDialog();
      return;
    }

    if (key.return && selectedResumableSession) {
      resumeSession(selectedResumableSession);
      return;
    }

    if (key.upArrow) {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : resumableSessions.length - 1;
      selectResumableSession(resumableSessions[newIndex]?.id || null);
    }

    if (key.downArrow) {
      const newIndex = selectedIndex < resumableSessions.length - 1 ? selectedIndex + 1 : 0;
      selectResumableSession(resumableSessions[newIndex]?.id || null);
    }

    if (input === 'r') {
      refreshResumableSessions();
    }

    if (input === 'd') {
      // Mark as done (descartar)
      // TODO: Implementar
    }
  });

  const formatDuration = (startTime: Date) => {
    const diff = Date.now() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <Box 
      flexDirection="column" 
      borderStyle="double" 
      borderColor={colors.primary}
      padding={1}
      gap={1}
      minWidth={60}
    >
      <Text bold color={colors.primary}>
        ▶️  Continue Previous Session
      </Text>

      <Text color={colors.muted}>
        You have sessions that can be resumed:
      </Text>

      {isLoadingResumableSessions ? (
        <Box padding={1}>
          <Spinner type="dots" />
          <Text> Loading sessions...</Text>
        </Box>
      ) : resumableSessions.length === 0 ? (
        <Text color={colors.muted}>No resumable sessions found.</Text>
      ) : (
        <Box flexDirection="column" gap={1} marginTop={1}>
          {resumableSessions.map((session, index) => (
            <Box key={session.id} flexDirection="row" gap={2}>
              <Text color={index === selectedIndex ? colors.primary : colors.muted}>
                {index === selectedIndex ? '▶' : ' '}
              </Text>
              <Box flexDirection="column">
                <Text color={index === selectedIndex ? colors.foreground : colors.muted}>
                  {session.type === 'task-loop' ? '🔄 Task Loop' : '▶️  Execution'}
                  {' '}• {session.progressCompleted}/{session.progressTotal || '?'} tasks
                  {' '}• {formatDuration(session.startTime)}
                  {session.isProbablyDead && (
                    <Text color={colors.warning}> (interrupted)</Text>
                  )}
                </Text>
                <Text color={colors.muted} dimColor>
                  Current: {session.currentTaskId?.slice(0, 30) || 'None'}... 
                  {' '}• Last update: {session.lastUpdate.toLocaleTimeString()}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={colors.border}>{'─'.repeat(50)}</Text>
      </Box>

      <Box flexDirection="row" gap={3} flexWrap="wrap">
        <Text color={colors.primary}>[Enter]</Text>
        <Text>Resume selected</Text>
        
        <Text color={colors.primary}>[↑/↓]</Text>
        <Text>Navigate</Text>
        
        <Text color={colors.muted}>[r]</Text>
        <Text>Refresh</Text>
        
        <Text color={colors.muted}>[d]</Text>
        <Text>Mark done</Text>
        
        <Text color={colors.muted}>[Esc/q]</Text>
        <Text>Close</Text>
      </Box>
    </Box>
  );
}
```

### 4.3 Integration en App

**Archivo**: `packages/sdk/src/tui/app.tsx`

```typescript
import { ResumeDialog } from './components/resume-dialog';

export function App() {
  const { screen, showResumeDialog, loadResumableSessions } = useStore();

  // Detectar sesiones resumibles al iniciar
  useEffect(() => {
    loadResumableSessions();
  }, []);

  // Centrar el diálogo
  const { stdout } = useStdout();
  const [columns, rows] = [stdout.columns, stdout.rows];

  return (
    <Box flexDirection="column" height="100%">
      {showResumeDialog && (
        <Box 
          position="absolute" 
          top={Math.floor(rows / 4)}
          left={Math.floor((columns - 60) / 2)}
        >
          <ResumeDialog />
        </Box>
      )}

      {screen === 'dashboard' && <Dashboard />}
      {screen === 'task-loop' && <TaskLoopScreen />}
      {/* ... */}
    </Box>
  );
}
```

---

## Fase 5: Task Loop con Resume

### 5.1 Modificar TaskLoopOrchestrator

```typescript
import { CheckpointService } from '../../services/checkpoint-service';
import { globalExecutionLogger } from '@openfarm/execution-logger';

export class TaskLoopOrchestrator {
  private checkpointService = new CheckpointService();

  async run(options: {
    onEvent?: (event: TaskLoopEvent) => void;
    resumeFromCheckpoint?: SessionCheckpoint; // NUEVO
  }): Promise<void> {
    
    // Si hay checkpoint para resumir, restaurar estado
    if (options.resumeFromCheckpoint) {
      await this.restoreFromCheckpoint(options.resumeFromCheckpoint);
    } else {
      // Nueva ejecución
      this.sessionId = generateId();
      this.executionId = generateId();
    }

    // Iniciar checkpointing periódico
    this.checkpointService.startCheckpointing({
      id: this.sessionId,
      executionId: this.executionId,
      type: 'task-loop',
      status: 'running',
      currentTaskId: undefined,
      completedTasks: [],
      progressTotal: this.tasks.length,
      progressCompleted: 0,
      startTime: new Date(),
      metadata: {
        workspace: this.workspace,
        provider: this.provider,
      },
    });

    try {
      // ... lógica existente ...
    } finally {
      await this.checkpointService.finalize(this.error ? 'error' : 'completed');
    }
  }

  private async restoreFromCheckpoint(checkpoint: SessionCheckpoint): Promise<void> {
    this.sessionId = generateId(); // Nueva sesión
    this.executionId = checkpoint.executionId; // Misma ejecución lógica
    this.resumedFromId = checkpoint.id;
    
    // Restaurar estado
    this.completedTasks = checkpoint.completedTasks || [];
    this.currentTaskIndex = this.completedTasks.length;
    
    // Cargar logs históricos
    const db = await getDb();
    const { logs } = await getExecutionLogsPaginated(db, checkpoint.executionId, {
      limit: 1000,
    });
    
    // Re-hidratar logger con logs históricos (para visualización)
    for (const log of logs) {
      globalExecutionLogger.log(
        log.executionId,
        '',
        log.level,
        log.message,
        log.metadata,
        log.component
      );
    }

    // Emitir evento de resumen
    this.emitEvent({
      type: 'session.resumed',
      sessionId: this.sessionId,
      data: { fromCheckpoint: checkpoint.id, completedTasks: this.completedTasks },
    });
  }
}
```

### 5.2 TaskLoopScreen con Loading de Logs

```typescript
export function TaskLoopScreen() {
  const { resumeFromSessionId } = useStore();
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (resumeFromSessionId) {
      loadAndResume(resumeFromSessionId);
    }
  }, [resumeFromSessionId]);

  const loadAndResume = async (sessionId: string) => {
    setIsLoadingLogs(true);
    abortControllerRef.current = new AbortController();

    try {
      const checkpoint = await CheckpointService.loadCheckpoint(sessionId);
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      // Cargar logs paginados con progreso
      const db = await getDb();
      let offset = 0;
      const limit = 100;
      let total = Infinity;
      const allLogs = [];

      while (offset < total && !abortControllerRef.current.signal.aborted) {
        const { logs, total: t } = await getExecutionLogsPaginated(db, checkpoint.executionId, {
          limit,
          offset,
        });
        total = t;
        allLogs.push(...logs);
        offset += limit;
        
        setLoadingProgress(Math.min(100, Math.round((offset / total) * 100)));
      }

      // Iniciar orchestrator con resume
      await orchestrator.run({
        resumeFromCheckpoint: checkpoint,
      });

    } catch (error) {
      console.error('Failed to resume:', error);
      // Volver a dashboard con error
    } finally {
      setIsLoadingLogs(false);
    }
  };

  if (isLoadingLogs) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" height="100%">
        <Text color={colors.primary}>Loading session logs...</Text>
        <Box width={40} marginTop={1}>
          <Text>{'█'.repeat(loadingProgress / 2.5)}{'░'.repeat(40 - loadingProgress / 2.5)}</Text>
        </Box>
        <Text color={colors.muted}>{loadingProgress}%</Text>
        <Text color={colors.muted} dimColor>Press Esc to cancel</Text>
      </Box>
    );
  }

  // ... resto del render ...
}
```

---

## Fase 6: Testing

### 6.1 Unit Tests

```typescript
// packages/core/src/db/__tests__/execution-logs.test.ts
describe('execution-logs', () => {
  it('should rotate logs when exceeding max', async () => {
    const db = await getTestDb();
    
    // Insertar 10,100 logs
    for (let i = 0; i < 10100; i++) {
      queueLogInsert(db, {
        executionId: 'exec-1',
        timestamp: new Date(),
        level: 'info',
        component: 'test',
        message: `log ${i}`,
      });
    }
    
    // Flush
    await flushLogs(db);
    
    // Verificar que solo quedan 9,100 (10,000 - 1,000 rotados + 100 nuevos)
    const count = await db.select({ count: count() }).from(executionLogsTable);
    expect(count[0].count).toBeLessThanOrEqual(10000);
  });
});
```

### 6.2 Integration Tests

```typescript
// Verificar flujo completo: checkpoint → cierre → resume
describe('resume flow', () => {
  it('should resume from checkpoint', async () => {
    // 1. Crear checkpoint
    // 2. Simular "cierre" (solo dejar de actualizar)
    // 3. Cargar checkpoint
    // 4. Verificar estado restaurado
  });
});
```

---

## Timeline V2

| Fase | Duración | Notas |
|------|----------|-------|
| **1.1** Schema + Migraciones | 3h | Con sistema de versionado |
| **1.2** Logs Module | 3h | Con batching y rotación |
| **1.3** Checkpoints Module | 2h | Con detección de timeout |
| **2** ExecutionLogger Refactor | 2h | Event emitter pattern |
| **3** SDK Bridge | 2h | LogSink + CheckpointService |
| **4** UI Resume Dialog | 4h | Con auto-refresh |
| **5** Task Loop Integration | 3h | Modo resume con loading |
| **6** Testing | 3h | Unit + integration |
| **Buffer** | 3h | Edge cases |
| **TOTAL** | **25h** | ~3 días |

---

## Riesgos V2 (Mitigados)

| Riesgo | Prob | Mitigación |
|--------|------|------------|
| SQLite crece indefinidamente | Baja | Rotación automática, límites hard |
| UI se bloquea cargando logs | Baja | Paginación, loading con progreso, cancelable |
| Dep. circular | Eliminado | Event emitter, bridge en SDK |
| Race condition | Eliminado | No hay proceso compartido, solo resume |
| Schema migrations | Media | Sistema de versionado con up/down |

---

## Cambios Clave vs V1

1. **Resume ≠ Reconnect**: No hay proceso vivo, reconstruimos desde checkpoint
2. **Sin dependencia circular**: Logger emite eventos, SDK conecta a DB
3. **Límites de SQLite**: Rotación automática de logs viejos
4. **UX mejorada**: Loading con progreso, cancelable, auto-refresh
5. **Más robusto**: No hay procesos huérfanos reales, solo checkpoints

---

*V2 creada: 2026-02-05*
*Estado: Listo para implementar*
