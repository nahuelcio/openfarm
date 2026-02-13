# Research: Agent Monitoring & Observability

## Problem Statement

Cuando un usuario sale de una ejecución del TUI o CLI, pierde toda visibilidad sobre:

1. **Qué agentes están corriendo** actualmente
2. **Logs en tiempo real** de ejecuciones activas
3. **Estado de sesiones** del task-loop u otros orquestadores
4. **Histórico detallado** de ejecuciones pasadas (más allá del resumen básico)

Esto es equivalente a manejar un servidor sin monitoreo: vas a ciegas una vez que cerrás la terminal.

## Current State Analysis

### Componentes Existentes

| Componente | Persistencia | Alcance | Problema |
|------------|--------------|---------|----------|
| `TUI Store` | SQLite (`tui-executions`) | Ejecuciones básicas (task, provider, status, output) | No guarda logs detallados ni permite reconexión |
| `ExecutionLogger` | En memoria | Logs estructurados con métricas | Se pierde al salir del proceso |
| `RemoteServer` | WebSocket en vivo | Control remoto de task-loops | No hay histórico ni persistencia de sesiones |
| `TaskLoop` | Estado en React | Estado de orquestación actual | Si salís, perdés el contexto de la sesión |

### Arquitectura de Datos Actual

```
┌─────────────────┐     ┌──────────────┐     ┌────────────────┐
│   TUI / CLI     │────▶│ SQLite (core)│◀────│  History View  │
│  (Ink/React)    │     │  tui-executions    │  (read-only)   │
└─────────────────┘     └──────────────┘     └────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│ ExecutionLogger │────▶│   Memoria    │ (se pierde al cerrar)
│  (en memoria)   │     │  (logs live) │
└─────────────────┘     └──────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   RemoteServer  │◀───▶│ WebSocket    │ (solo en vivo)
│   (WebSocket)   │     │  (tiempo real)       │
└─────────────────┘     └──────────────┘
```

### Gaps Identificados

1. **No hay servicio de background**: Todo corre en el proceso foreground del TUI
2. **Logs no persisten**: `ExecutionLogger` guarda en arrays en memoria
3. **No reconexión de sesiones**: Si el TUI se cierra, la sesión del task-loop queda huérfana
4. **Sin visibilidad cross-session**: No podés ver desde un nuevo TUI lo que está corriendo en otro proceso
5. **Monitoreo limitado**: No hay forma de ver estado de múltiples agentes simultáneamente

## Opciones de Solución

### Opción A: Comandos CLI de Status (Quick Win)

Extender el CLI actual con comandos de inspección:

```bash
# Ver estado actual
openfarm status                    # Lista ejecuciones activas
openfarm status --watch            # Modo monitoring (tipo top)

# Ver logs
openfarm logs <execution-id>       # Logs de una ejecución específica
openfarm logs --tail               # Seguir logs en tiempo real
openfarm logs --follow --all       # Follow de todas las ejecuciones

# Historial
openfarm history                   # Últimas ejecuciones
openfarm history --failed          # Solo fallidas
openfarm history --provider=aider  # Filtrar por provider
```

**Pros:**
- Implementación rápida (1-2 días)
- Útil para scripts y CI/CD
- No requiere cambios arquitectónicos

**Contras:**
- No es interactivo (no reemplaza al TUI)
- No resuelve la reconexión a sesiones
- Experiencia fragmentada

**Implementación:**
- Extender `packages/sdk/src/cli.ts`
- Agregar queries a la DB existente
- Opcional: usar OpenTUI para el modo `--watch` interactivo

---

### Opción B: Persistencia de Logs + Reconexión de Sesiones

Extender la arquitectura actual para permitir reconectar a sesiones:

```typescript
// Nuevas capacidades:
1. ExecutionLogger persiste en SQLite (no solo memoria)
2. TaskLoopOrchestrator guarda checkpoint de estado
3. TUI puede "attach" a una sesión existente
4. Detección de ejecuciones "huérfanas" (crashed TUI)
```

**UX:**
```
$ openfarm
> Detected 1 running session from previous TUI
> Session: task-loop-abc123 (running for 15m)
> [R] Reconnect  [I] Ignore  [K] Kill
```

**Pros:**
- Solución completa dentro del scope actual
- No agrega procesos externos
- Experiencia "tmux-like" que los devs entienden

**Contras:**
- Más complejo (manejo de estado, locks, reconexión)
- SQLite puede no escalar para logs masivos
- Solo resuelve monitoreo local (no remoto)

**Implementación:**
- Extender schema de SQLite con tabla `execution_logs`
- Agregar `session_checkpoint` para TaskLoop
- Modificar TUI para soportar "attach mode"
- Manejo de locks para evitar múltiples TUIs en misma sesión

---

### Opción C: Agent Monitor Package (Arquitectura Escalable)

Crear un nuevo package `@openfarm/agent-monitor` - un servicio de background dedicado:

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Monitor Service                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Collector  │  │    Store     │  │     API      │       │
│  │ (WebSocket/  │  │  (SQLite/    │  │  (REST/WS)   │       │
│  │  HTTP ingest)│  │   FileLog)   │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │                                    │
    ┌────┴────┐                          ┌───┴────┐
    │ Agents  │                          │ Clients│
    │(TUI/CLI)│                          │(TUI/CLI)│
    └─────────┘                          └────────┘
```

**Componentes:**

1. **Monitor Daemon**: Proceso background opcional que recolecta métricas
2. **Log Aggregator**: Recibe logs de múltiples agentes vía HTTP/WebSocket
3. **Query API**: Permite consultar estado e histórico
4. **Monitor TUI**: Interface tipo `htop` para ver todos los agentes

**UX:**
```bash
# Iniciar el monitor (opcional, en background)
openfarm monitor --daemon

# Ver dashboard de todos los agentes
openfarm monitor

# Desde cualquier TUI/CLI, auto-detecta monitor
openfarm --monitor-url=http://localhost:8080
```

**Pros:**
- Arquitectura preparada para escalar
- Dashboard centralizado de múltiples instancias
- Separa concerns: ejecución vs observabilidad
- Permite alertas, métricas, integraciones

**Contras:**
- Mayor complejidad (nuevo package, proceso, API)
- Overhead de mantener otro servicio
- Puede ser overkill para uso individual local

**Implementación:**
- Nuevo package `packages/agent-monitor/`
- HTTP API con Hono o similar
- WebSocket para streaming en tiempo real
- TUI dedicado usando OpenTUI (ya es el standard del proyecto)
- Opcional: exportar métricas en formato Prometheus

---

## Recomendación

**Short-term (ahora):** Opción A - Comandos CLI básicos de `status` y `logs`. 
- Mínima resistencia
- Resuelve el 70% del problema
- Base para Opción B después

**Medium-term (próximo sprint):** Opción B - Persistencia + reconexión.
- Experiencia "premium" que diferencia a OpenFarm
- Elimina la frustración de perder sesiones

**Long-term (si escala):** Opción C - Agent Monitor.
- Si hay usuarios con múltiples instancias
- Si se quiere dashboard centralizado en equipo

## Decisiones Pendientes

1. **¿Es crítico el monitoreo remoto o solo local?**
   - Local → Opción B es suficiente
   - Remoto → Necesitamos Opción C

2. **¿Cuántos logs queremos guardar?**
   - Solo metadata → SQLite actual está OK
   - Logs completos → Considerar rotación de archivos o SQLite con vacuum

3. **¿Hay casos de uso de "agentes corriendo en background"?**
   - No → Solo histórico necesario
   - Sí → Reconexión es prioridad

## Notas Técnicas

### Schema Extendido para Logs (Opción B)

```sql
CREATE TABLE execution_logs (
  id INTEGER PRIMARY KEY,
  execution_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT CHECK(level IN ('debug', 'info', 'warn', 'error')),
  component TEXT,  -- 'task-loop', 'agent', 'system'
  message TEXT NOT NULL,
  metadata JSON,
  FOREIGN KEY (execution_id) REFERENCES tui_executions(id)
);

CREATE INDEX idx_logs_execution ON execution_logs(execution_id);
CREATE INDEX idx_logs_timestamp ON execution_logs(timestamp);
```

### Checkpoint de Sesión (Opción B)

```typescript
interface TaskLoopCheckpoint {
  sessionId: string;
  status: 'running' | 'paused' | 'completed';
  currentTaskId?: string;
  completedTasks: string[];
  startTime: Date;
  lastUpdate: Date;
  pid: number;  // Para detectar si el proceso original sigue vivo
}
```

---

*Documento creado: 2026-02-05*
*Contexto: Análisis de necesidad de observabilidad post-ejecución*
