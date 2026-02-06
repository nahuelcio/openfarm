# Plan de Implementación: Persistencia de Logs + Reconexión de Sesiones

## Overview

Implementar la capacidad de persistir logs detallados de ejecuciones en SQLite y permitir reconectar a sesiones de Task Loop que quedaron corriendo después de cerrar el TUI.

**Objetivo**: Experiencia tipo `tmux attach` - poder cerrar el TUI, volver a abrirlo y recuperar la sesión exactamente donde estaba.

---

## Arquitectura Target

```
┌─────────────────────────────────────────────────────────────────┐
│                         TUI (OpenTUI)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Dashboard  │  │  Task Loop   │  │  Session Reconnect   │   │
│  │   (lista)    │  │   Screen     │  │  (pantalla modal)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ExecutionLogger (mejorado)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Memoria    │  │    SQLite    │  │    File (opt)        │   │
│  │  (caché)     │  │  (persist)   │  │   (logs grandes)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
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

## Fase 1: Persistencia de Logs (Foundation)

### 1.1 Extender Schema de SQLite

**Archivo**: `packages/core/src/db/schema.ts`

```typescript
// Nuevas tablas a agregar

export const executionLogsTable = sqliteTable('execution_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  executionId: text('execution_id').notNull()
    .references(() => tuiExecutionsTable.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  level: text('level', { enum: ['debug', 'info', 'warn', 'error'] }).notNull(),
  component: text('component').notNull(), // 'task-loop', 'agent', 'system', 'provider'
  message: text('message').notNull(),
  metadata: text('metadata', { mode: 'json' }), // JSON flexible para datos extras
});

export const sessionCheckpointsTable = sqliteTable('session_checkpoints', {
  id: text('id').primaryKey(), // sessionId
  executionId: text('execution_id').notNull()
    .references(() => tuiExecutionsTable.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['task-loop', 'workflow', 'single'] }).notNull(),
  status: text('status', { enum: ['starting', 'selecting', 'executing', 'paused', 'completed', 'error'] }).notNull(),
  currentTaskId: text('current_task_id'),
  completedTasks: text('completed_tasks', { mode: 'json' }).$defaultFn(() => '[]'),
  progressTotal: integer('progress_total'),
  progressCompleted: integer('progress_completed'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  lastUpdate: integer('last_update', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  pid: integer('pid').notNull(), // Para detectar si el proceso original sigue vivo
  metadata: text('metadata', { mode: 'json' }), // Datos específicos del tipo de sesión
});

// Índices
export const executionLogsExecutionIdIdx = index('execution_logs_execution_id_idx').on(executionLogsTable.executionId);
export const executionLogsTimestampIdx = index('execution_logs_timestamp_idx').on(executionLogsTable.timestamp);
export const sessionCheckpointsStatusIdx = index('session_checkpoints_status_idx').on(sessionCheckpointsTable.status);
```

### 1.2 Crear Módulo de DB para Logs

**Nuevo archivo**: `packages/core/src/db/execution-logs.ts`

```typescript
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { executionLogsTable, sessionCheckpointsTable } from './schema';
import type { LogLevel } from '@openfarm/execution-logger';

export interface ExecutionLogInsert {
  executionId: string;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SessionCheckpointInsert {
  id: string;
  executionId: string;
  type: 'task-loop' | 'workflow' | 'single';
  status: string;
  currentTaskId?: string;
  completedTasks?: string[];
  progressTotal?: number;
  progressCompleted?: number;
  startTime: Date;
  pid: number;
  metadata?: Record<string, unknown>;
}

// Insertar log
export async function createExecutionLog(
  db: BetterSQLite3Database,
  data: ExecutionLogInsert
): Promise<void> {
  await db.insert(executionLogsTable).values({
    ...data,
    timestamp: new Date(),
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });
}

// Obtener logs de una ejecución
export async function getExecutionLogs(
  db: BetterSQLite3Database,
  executionId: string,
  options?: {
    limit?: number;
    offset?: number;
    level?: LogLevel;
    fromDate?: Date;
    toDate?: Date;
  }
): Promise<Array<{
  id: number;
  executionId: string;
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}>> {
  let query = db
    .select()
    .from(executionLogsTable)
    .where(eq(executionLogsTable.executionId, executionId))
    .orderBy(asc(executionLogsTable.timestamp));

  if (options?.level) {
    query = query.where(eq(executionLogsTable.level, options.level));
  }
  if (options?.fromDate) {
    query = query.where(sql`${executionLogsTable.timestamp} >= ${options.fromDate}`);
  }
  if (options?.toDate) {
    query = query.where(sql`${executionLogsTable.timestamp} <= ${options.toDate}`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.offset(options.offset);
  }

  const results = await query;
  return results.map(r => ({
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
  }));
}

// Crear o actualizar checkpoint
export async function upsertSessionCheckpoint(
  db: BetterSQLite3Database,
  data: SessionCheckpointInsert
): Promise<void> {
  await db
    .insert(sessionCheckpointsTable)
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

// Obtener sesiones activas (para detectar al iniciar TUI)
export async function getActiveSessions(
  db: BetterSQLite3Database
): Promise<Array<{
  id: string;
  executionId: string;
  type: string;
  status: string;
  currentTaskId?: string;
  startTime: Date;
  lastUpdate: Date;
  pid: number;
}>> {
  const results = await db
    .select()
    .from(sessionCheckpointsTable)
    .where(
      and(
        sql`${sessionCheckpointsTable.status} IN ('starting', 'selecting', 'executing', 'paused')`,
        sql`${sessionCheckpointsTable.lastUpdate} > datetime('now', '-1 hour')` // Solo recientes
      )
    )
    .orderBy(desc(sessionCheckpointsTable.lastUpdate));

  return results.map(r => ({
    ...r,
    completedTasks: r.completedTasks ? JSON.parse(r.completedTasks as string) : [],
    metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
  }));
}

// Marcar sesión como terminada
export async function completeSessionCheckpoint(
  db: BetterSQLite3Database,
  sessionId: string,
  status: 'completed' | 'error' = 'completed'
): Promise<void> {
  await db
    .update(sessionCheckpointsTable)
    .set({ status, lastUpdate: new Date() })
    .where(eq(sessionCheckpointsTable.id, sessionId));
}

// Cleanup de sesiones viejas
export async function cleanupOldCheckpoints(
  db: BetterSQLite3Database,
  maxAgeHours: number = 24
): Promise<number> {
  const result = await db
    .delete(sessionCheckpointsTable)
    .where(sql`${sessionCheckpointsTable.lastUpdate} < datetime('now', '-${maxAgeHours} hours')`);
  return result.changes || 0;
}
```

### 1.3 Extender ExecutionLogger para Persistir

**Archivo**: `packages/execution-logger/src/services/execution-logger.ts`

```typescript
// Agregar dependencia a @openfarm/core para DB
import { getDb } from '@openfarm/core/db';
import { createExecutionLog } from '@openfarm/core/db/execution-logs';

export interface ExecutionLoggerConfig {
  persistToDb?: boolean; // default: true
  memoryBufferSize?: number; // default: 1000
}

export class ExecutionLogger {
  private logs: ExecutionLog[] = [];
  private readonly metrics: Map<string, ExecutionMetrics> = new Map();
  private readonly config: Required<ExecutionLoggerConfig>;
  private dbWriteQueue: Promise<void> = Promise.resolve();

  constructor(config: ExecutionLoggerConfig = {}) {
    this.config = {
      persistToDb: true,
      memoryBufferSize: 1000,
      ...config,
    };
  }

  async log(
    jobId: string,
    tenantId: string,
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    component: string = 'system'
  ): Promise<void> {
    const logEntry: ExecutionLog = {
      jobId,
      tenantId,
      timestamp: new Date(),
      level,
      message,
      metadata,
    };

    // Siempre guardar en memoria (para acceso rápido)
    this.logs.push(logEntry);
    
    // Mantener buffer en tamaño razonable
    if (this.logs.length > this.config.memoryBufferSize) {
      this.logs = this.logs.slice(-this.config.memoryBufferSize);
    }

    // Persistir a DB si está habilitado
    if (this.config.persistToDb) {
      this.dbWriteQueue = this.dbWriteQueue.then(async () => {
        try {
          const db = await getDb();
          await createExecutionLog(db, {
            executionId: jobId,
            level,
            component,
            message,
            metadata,
          });
        } catch (error) {
          // Fallback: log a consola si falla DB
          console.error('[ExecutionLogger] Failed to persist to DB:', error);
        }
      });
    }

    // Console output (existente)
    const logData = { jobId, tenantId, level, message, timestamp: logEntry.timestamp.toISOString(), ...metadata };
    // ... switch case existente ...
  }

  // Método para cargar logs históricos desde DB
  async loadLogsFromDb(executionId: string): Promise<void> {
    try {
      const db = await getDb();
      const logs = await getExecutionLogs(db, executionId, { limit: 1000 });
      
      // Merge con logs en memoria (por si hay nuevos)
      const existingIds = new Set(this.logs.map(l => l.timestamp.getTime()));
      const newLogs = logs
        .filter(l => !existingIds.has(l.timestamp.getTime()))
        .map(l => ({
          jobId: l.executionId,
          tenantId: '', // TODO: agregar tenant a schema si es necesario
          timestamp: l.timestamp,
          level: l.level,
          message: l.message,
          metadata: l.metadata,
        }));
      
      this.logs = [...newLogs, ...this.logs].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    } catch (error) {
      console.error('[ExecutionLogger] Failed to load logs from DB:', error);
    }
  }

  // ... resto de métodos existentes ...
}
```

**Exportar en index.ts**:
```typescript
export type { ExecutionLoggerConfig } from './services/execution-logger';
```

---

## Fase 2: Checkpoint de Sesión en Task Loop

### 2.1 Modificar TaskLoopOrchestrator

**Archivo**: `packages/task-loop/src/orchestrator.ts` (o donde esté)

Agregar método para guardar checkpoint en cada evento importante:

```typescript
import { upsertSessionCheckpoint, completeSessionCheckpoint } from '@openfarm/core/db/session-checkpoints';

export class TaskLoopOrchestrator {
  private sessionId: string;
  private executionId: string;
  private checkpointInterval?: ReturnType<typeof setInterval>;

  async run(options: {
    onEvent?: (event: TaskLoopEvent) => void;
    executionId?: string; // Para reconectar a ejecución existente
  }): Promise<void> {
    // Si se pasa executionId, estamos reconectando
    if (options.executionId) {
      await this.reconnectToSession(options.executionId);
    } else {
      this.executionId = generateId();
      this.sessionId = generateSessionId();
    }

    // Iniciar guardado periódico de checkpoint
    this.startCheckpointing();

    try {
      // ... lógica existente del task loop ...
    } finally {
      this.stopCheckpointing();
      await this.saveFinalCheckpoint();
    }
  }

  private async saveCheckpoint(status: string): Promise<void> {
    try {
      const db = await getDb();
      await upsertSessionCheckpoint(db, {
        id: this.sessionId,
        executionId: this.executionId,
        type: 'task-loop',
        status: status as any,
        currentTaskId: this.currentTask?.id,
        completedTasks: this.completedTasks.map(t => t.id),
        progressTotal: this.tasks.length,
        progressCompleted: this.completedTasks.length,
        startTime: this.startTime,
        pid: process.pid,
        metadata: {
          currentIteration: this.iteration,
          settings: this.settings,
        },
      });
    } catch (error) {
      console.error('[TaskLoop] Failed to save checkpoint:', error);
    }
  }

  private startCheckpointing(): void {
    // Guardar cada 5 segundos si hay cambios
    this.checkpointInterval = setInterval(() => {
      this.saveCheckpoint(this.lifecycle);
    }, 5000);
  }

  private stopCheckpointing(): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
    }
  }

  private async saveFinalCheckpoint(): Promise<void> {
    const finalStatus = this.error ? 'error' : 'completed';
    await this.saveCheckpoint(finalStatus);
    
    try {
      const db = await getDb();
      await completeSessionCheckpoint(db, this.sessionId, finalStatus);
    } catch (error) {
      console.error('[TaskLoop] Failed to complete checkpoint:', error);
    }
  }

  // Método para reconectar
  private async reconnectToSession(executionId: string): Promise<void> {
    const db = await getDb();
    const checkpoint = await getSessionCheckpoint(db, executionId);
    
    if (!checkpoint) {
      throw new Error(`No checkpoint found for execution ${executionId}`);
    }

    // Restaurar estado
    this.executionId = checkpoint.executionId;
    this.sessionId = checkpoint.id;
    this.currentTask = checkpoint.currentTaskId 
      ? await this.loadTask(checkpoint.currentTaskId)
      : null;
    this.completedTasks = await this.loadTasks(checkpoint.completedTasks || []);
    this.startTime = checkpoint.startTime;
    this.iteration = checkpoint.metadata?.currentIteration || 0;
    
    // Cargar logs históricos
    await this.executionLogger.loadLogsFromDb(executionId);
  }
}
```

---

## Fase 3: Pantalla de Reconexión en TUI

### 3.1 Store: Detectar Sesiones al Iniciar

**Archivo**: `packages/sdk/src/tui/store.ts`

```typescript
// Agregar al estado
interface AppState {
  // ... estado existente ...
  
  // Detección de sesiones
  orphanedSessions: Array<{
    id: string;
    executionId: string;
    type: string;
    status: string;
    startTime: Date;
    lastUpdate: Date;
    pid: number;
    isProcessAlive: boolean;
  }>;
  showReconnectDialog: boolean;
  selectedOrphanedSession: string | null;
  
  // Acciones
  detectOrphanedSessions: () => Promise<void>;
  selectOrphanedSession: (id: string | null) => void;
  reconnectToSession: (sessionId: string) => Promise<void>;
  dismissOrphanedSessions: () => void;
}

// Implementación
export const useStore = create<AppState>((set, get) => ({
  // ... estado inicial ...
  orphanedSessions: [],
  showReconnectDialog: false,
  selectedOrphanedSession: null,

  detectOrphanedSessions: async () => {
    try {
      const db = await getDb();
      const sessions = await getActiveSessions(db);
      
      // Verificar cuáles procesos siguen vivos
      const sessionsWithStatus = await Promise.all(
        sessions.map(async (s) => ({
          ...s,
          isProcessAlive: await isProcessRunning(s.pid),
        }))
      );

      // Solo mostrar las que el proceso original murió
      const orphaned = sessionsWithStatus.filter(s => !s.isProcessAlive);
      
      set({
        orphanedSessions: orphaned,
        showReconnectDialog: orphaned.length > 0,
        selectedOrphanedSession: orphaned[0]?.id || null,
      });
    } catch (error) {
      logger.error('Failed to detect orphaned sessions:', error);
    }
  },

  selectOrphanedSession: (id) => set({ selectedOrphanedSession: id }),

  reconnectToSession: async (sessionId) => {
    const session = get().orphanedSessions.find(s => s.id === sessionId);
    if (!session) return;

    // Preparar estado para reconexión
    set({
      showReconnectDialog: false,
      screen: 'task-loop',
      activeTab: 'task-loop',
    });

    // El TaskLoopScreen va a detectar que hay una ejecución activa y reconectar
  },

  dismissOrphanedSessions: () => {
    set({ showReconnectDialog: false });
  },
}));

// Helper para verificar si un proceso existe
async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    // En Node/Bun: process.kill(pid, 0) no mata, solo verifica
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
```

### 3.2 Componente: SessionReconnectDialog

**Nuevo archivo**: `packages/sdk/src/tui/components/session-reconnect-dialog.tsx`

```typescript
import { Box, Text, useInput } from '@openfarm/tui-opentui';
import { useThemeColors } from '../theme/hooks';
import { useStore } from '../store';

export function SessionReconnectDialog() {
  const {
    orphanedSessions,
    selectedOrphanedSession,
    selectOrphanedSession,
    reconnectToSession,
    dismissOrphanedSessions,
  } = useStore();
  
  const colors = useThemeColors();
  const selectedIndex = orphanedSessions.findIndex(s => s.id === selectedOrphanedSession);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      dismissOrphanedSessions();
      return;
    }

    if (key.return && selectedOrphanedSession) {
      reconnectToSession(selectedOrphanedSession);
      return;
    }

    if (key.upArrow) {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : orphanedSessions.length - 1;
      selectOrphanedSession(orphanedSessions[newIndex]?.id || null);
    }

    if (key.downArrow) {
      const newIndex = selectedIndex < orphanedSessions.length - 1 ? selectedIndex + 1 : 0;
      selectOrphanedSession(orphanedSessions[newIndex]?.id || null);
    }

    if (input === 'k') {
      // Kill session (marcar como failed)
      // TODO: implementar
    }

    if (input === 'i') {
      // Ignore all
      dismissOrphanedSessions();
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
      borderColor={colors.warning}
      padding={1}
      gap={1}
    >
      <Text bold color={colors.warning}>
        ⚠️  Detected {orphanedSessions.length} running session(s)
      </Text>
      
      <Text color={colors.muted}>
        These sessions were left running after the TUI was closed.
      </Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        {orphanedSessions.map((session, index) => (
          <Box key={session.id} flexDirection="row" gap={2}>
            <Text color={index === selectedIndex ? colors.primary : colors.muted}>
              {index === selectedIndex ? '▶' : ' '}
            </Text>
            <Box flexDirection="column">
              <Text color={index === selectedIndex ? colors.foreground : colors.muted}>
                {session.type === 'task-loop' ? '🔄 Task Loop' : '▶️  Execution'}
                {' '}• {session.status}
                {' '}• running for {formatDuration(session.startTime)}
              </Text>
              <Text color={colors.muted} dimColor>
                Session: {session.id.slice(0, 8)}... • PID: {session.pid} (dead)
                {' '}• Last update: {session.lastUpdate.toLocaleTimeString()}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color={colors.border}>─'.repeat(50)}</Text>
      </Box>

      <Box flexDirection="row" gap={3}>
        <Text color={colors.primary}>[Enter]</Text>
        <Text>Reconnect</Text>
        
        <Text color={colors.error}>[k]</Text>
        <Text>Mark as failed</Text>
        
        <Text color={colors.muted}>[i]</Text>
        <Text>Ignore all</Text>
        
        <Text color={colors.muted}>[Esc/q]</Text>
        <Text>Close</Text>
      </Box>
    </Box>
  );
}
```

### 3.3 Integrar en App Principal

**Archivo**: `packages/sdk/src/tui/app.tsx` (o app-v2.tsx según cuál se use)

```typescript
import { SessionReconnectDialog } from './components/session-reconnect-dialog';

export function App() {
  const { screen, showReconnectDialog, detectOrphanedSessions } = useStore();

  // Detectar sesiones huérfanas al iniciar
  useEffect(() => {
    detectOrphanedSessions();
  }, []);

  return (
    <Box flexDirection="column" height="100%">
      {/* Mostrar dialog si hay sesiones */}
      {showReconnectDialog && (
        <Box 
          position="absolute" 
          width="100%" 
          height="100%"
          justifyContent="center"
          alignItems="center"
          backgroundColor="black" // Overlay
        >
          <SessionReconnectDialog />
        </Box>
      )}

      {/* Render screen actual */}
      {screen === 'dashboard' && <Dashboard />}
      {screen === 'task-loop' && <TaskLoopScreen />}
      {/* ... resto de screens ... */}
    </Box>
  );
}
```

---

## Fase 4: Task Loop Screen - Modo Reconnect

### 4.1 Modificar TaskLoopScreen para Soportar Reconnect

**Archivo**: `packages/sdk/src/tui/screens/task-loop.tsx`

```typescript
export function TaskLoopScreen({ embedded = false }: TaskLoopScreenProps) {
  const { 
    currentExecution, 
    orphanedSessions,
    // ... resto 
  } = useStore();
  
  const store = useTaskLoopStore();
  const isReconnecting = useRef(false);

  // Detectar si estamos reconectando al montar
  useEffect(() => {
    const checkForReconnect = async () => {
      // Si hay un orphaned session seleccionado y no tenemos ejecución actual
      const orphanedSession = orphanedSessions.find(
        s => s.id === useStore.getState().selectedOrphanedSession
      );
      
      if (orphanedSession && !currentExecution) {
        isReconnecting.current = true;
        
        // Cargar logs históricos
        await loadLogStore().loadLogs(orphanedSession.executionId);
        
        // Iniciar task loop en modo reconexión
        startTaskLoop({ reconnectTo: orphanedSession.executionId });
      }
    };

    checkForReconnect();
  }, []);

  const startTaskLoop = useCallback(async (options?: { reconnectTo?: string }) => {
    // ... código existente ...
    
    const orchestrator = new TaskLoopOrchestrator({
      provider: currentStore.settings.provider || 'external-agent',
      model: currentStore.settings.model || undefined,
      // ... config ...
    });

    // Si es reconexión, pasar el executionId
    await orchestrator.run({
      onEvent: handleEvent,
      executionId: options?.reconnectTo, // Este es el cambio clave
    });
    
    // ... resto ...
  }, []);

  // Mostrar indicador de reconexión
  if (isReconnecting.current && store.lifecycle === 'starting') {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center">
        <Text color={colors.warning}>Reconnecting to session...</Text>
        <Text color={colors.muted}>Loading logs and restoring state</Text>
      </Box>
    );
  }

  // ... resto del render ...
}
```

---

## Fase 5: Testing Strategy

### 5.1 Tests Unitarios

**Archivo**: `packages/core/src/db/__tests__/execution-logs.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createExecutionLog, getExecutionLogs } from '../execution-logs';
import { getTestDb, resetTestDb } from './test-helpers';

describe('execution-logs', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it('should persist and retrieve logs', async () => {
    const db = await getTestDb();
    
    await createExecutionLog(db, {
      executionId: 'exec-123',
      level: 'info',
      component: 'task-loop',
      message: 'Task started',
      metadata: { taskId: 'task-1' },
    });

    const logs = await getExecutionLogs(db, 'exec-123');
    
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Task started');
    expect(logs[0].metadata?.taskId).toBe('task-1');
  });

  it('should filter by level', async () => {
    // ... tests de filtros ...
  });

  it('should enforce retention policy', async () => {
    // ... tests de cleanup ...
  });
});
```

### 5.2 Tests de Integración

**Archivo**: `packages/sdk/src/tui/__tests__/session-reconnect.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderTUI } from '@openfarm/tui-opentui/testing';
import { SessionReconnectDialog } from '../components/session-reconnect-dialog';

describe('Session Reconnect', () => {
  it('should display orphaned sessions', async () => {
    // Setup: Crear sesiones en DB de test
    
    const { lastFrame } = renderTUI(<SessionReconnectDialog />);
    
    expect(lastFrame()).toContain('Detected 1 running session');
    expect(lastFrame()).toContain('Task Loop');
  });

  it('should allow reconnecting with Enter', async () => {
    // Test de interacción
  });
});
```

### 5.3 Test Manual (Checklist)

```markdown
## QA Checklist - Session Reconnect

### Setup
- [ ] Iniciar TUI en workspace de test
- [ ] Crear work items para task loop

### Test 1: Cierre y Reconexión Básica
- [ ] Iniciar task loop
- [ ] Esperar a que empiece a procesar un task
- [ ] Cerrar TUI (Ctrl+C o cerrar terminal)
- [ ] Abrir TUI nuevamente
- [ ] Verificar que aparece "Detected 1 running session"
- [ ] Presionar Enter para reconectar
- [ ] Verificar que se muestra el estado anterior
- [ ] Verificar que los logs históricos están visibles

### Test 2: Logs Persistidos
- [ ] Ejecutar task loop completo
- [ ] Cerrar TUI
- [ ] Abrir History
- [ ] Verificar que la ejecución aparece en la lista
- [ ] Ver detalle de ejecución
- [ ] Verificar que los logs están completos

### Test 3: Múltiples Sesiones
- [ ] Iniciar 2 task loops en workspaces diferentes
- [ ] Cerrar ambos
- [ ] Abrir TUI
- [ ] Verificar que detecta ambas sesiones
- [ ] Reconectar a una
- [ ] Volver al dashboard
- [ ] Reconectar a la otra

### Test 4: Cleanup
- [ ] Verificar que sesiones completadas no aparecen como "orphaned"
- [ ] Verificar que sesiones de +24h se limpian
```

---

## Timeline

| Fase | Duración | Entregable |
|------|----------|------------|
| **1.1** Schema DB | 2h | Tablas nuevas, migraciones |
| **1.2** Módulo DB | 3h | CRUD de logs y checkpoints |
| **1.3** ExecutionLogger | 3h | Persistencia async a DB |
| **2.1** TaskLoop Checkpoint | 4h | Guardado periódico de estado |
| **3.1** Store + Detección | 3h | Lógica de detección de procesos |
| **3.2** UI Dialog | 4h | Componente de reconexión |
| **3.3** Integración App | 2h | Flujo completo |
| **4.1** TaskLoop Reconnect | 3h | Modo reconexión en orchestrator |
| **5** Testing | 4h | Tests + QA manual |
| **Buffer** | 4h | Fixes, edge cases |
| **TOTAL** | **32h** | ~4 días de trabajo |

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Performance de SQLite con muchos logs | Medio | Implementar batching, índices, rotación |
| Corrupción de DB si se mata el proceso | Bajo | SQLite es resiliente, usar WAL mode |
| Proceso zombie detectado como vivo | Bajo | Verificar con `kill(pid, 0)` + timeout |
| Reconexión falla por estado inconsistente | Medio | Guardar estado completo, permitir "force reset" |
| Muchas sesiones orphaned en lista | Bajo | Limitar a 10, ordenar por reciente |

---

## Notas de Implementación

### Convenciones de Código
- Seguir kebab-case para archivos (ya lo hacen)
- Usar named exports
- TypeScript strict mode
- Manejo de errores: si falla persistencia, log a consola pero no romper flujo

### Compatibilidad
- No romper API existente de ExecutionLogger
- Feature flag opcional: `OPENFARM_PERSIST_LOGS=false` para desactivar

### Performance
- Logs se escriben async (no bloquean ejecución)
- Batch writes cada 1 segundo o 100 logs (lo que pase primero)
- Caché en memoria para lecturas recientes

---

## Post-Implementación (Futuro)

Una vez que esto esté funcionando, se puede extender fácilmente a:

1. **Web Dashboard**: Exportar checkpoints vía API para dashboard web
2. **Métricas**: Agregar tiempo promedio de tasks, tasa de éxito, etc.
3. **Alertas**: Notificar si una sesión está stuck por X tiempo
4. **Compartir sesiones**: Link a ejecución para que otro dev vea los logs

---

*Plan creado: 2026-02-05*
*Autor: AI Agent*
*Estado: Listo para implementación*
