# Web UI Architecture Plan

> Análisis crítico y opciones para llevar OpenFarm TUI al browser.
>
> **Fecha:** 2026-02-05  
> **Estado:** Draft - Revisado post-análisis de debilidades

---

## Resumen Ejecutivo

La idea inicial de hacer `bun run tui --web` reveló complejidades arquitectónicas significativas. Este documento analiza los problemas del plan original y propone alternativas realistas.

**Veredicto:** La Opción A ("Thin Client") ofrece el mejor balance costo/beneficio para un MVP funcional en 2 semanas.

---

## Análisis Crítico del Plan Original

### 🔴 Problema 1: Sobre-ingeniería en los Stores

**Plan original:**
```typescript
// Store con driver inyectado
export const createExecutionStore = (config: StoreConfig) => 
  create<ExecutionState>((set, get) => ({...}));
```

**Problemas identificados:**

1. **Zustand no está diseñado para esto** - Los stores son singletons globales. Factory functions rompen el ecosistema de hooks (`useStore()` asume store global sin parámetros).

2. **React Context requerido** - Necesitarías un `StoreProvider`, complicando todos los hooks.

3. **SSR/Build issues** - Vite pre-bundling detectaría Node.js APIs y explotaría en el bundle del browser.

**Lección:** El driver pattern es teóricamente limpio pero prácticamente incompatible con el estado actual del código.

---

### 🔴 Problema 2: WebSocket vs Server-Sent Events (SSE)

**Plan original:** WebSocket bidireccional para todo.

**Problemas:**

| Aspecto | WebSocket | SSE |
|---------|-----------|-----|
| **Estado de conexión** | Manual (heartbeat, reconnect) | Automático (browser lo maneja) |
| **Escalabilidad** | Necesita Redis/pub-sub para multi-nodo | Stateless, HTTP puro |
| **Complejidad** | Alta | Baja |
| **Dirección** | Bidireccional | Servidor→Cliente |

**Realidad:** Los logs son unidireccionales (servidor→cliente). Los comandos (start/stop/cancel) pueden ser HTTP POSTs simples.

**Recomendación:** SSE para streaming + HTTP POST para comandos.

---

### 🔴 Problema 3: El "Bridge" es un Mito

**Plan original:** Crear `NodeDriver` y `ApiDriver` intercambiables.

**Problema real:** La TUI actual NO tiene interfaz limpia:

```typescript
// Ejemplos de acoplamiento directo en la TUI actual:
- better-sqlite3 sincrónico en los stores
- process.cwd() para paths
- Bun.spawn() para ejecutar providers
- fs.readFileSync() para contexto
```

**No es "cambiar un driver". Es reescribir toda la capa de datos.**

**Estimación real:** 4-6 semanas solo para reimplementar el backend como API REST, no 1 semana.

---

### 🔴 Problema 4: Seguridad Ignorada

**Problemas no resueltos en el plan original:**

1. **Remote Code Execution (RCE)** - Si la web UI permite ejecutar tasks, cualquiera con acceso a `localhost:3000` puede correr código arbitrario en la máquina del usuario.

2. **CORS** - Frontend en `:3000`, backend en `:3001` requiere configuración CORS explícita.

3. **API Keys expuestas** - Los providers (Claude, OpenAI) requieren keys que no pueden ir al browser.

**Impacto:** Sin auth en Fase 1, la web UI es un agujero de seguridad crítico.

---

### 🔴 Problema 5: Estado Duplicado y Race Conditions

**Arquitectura propuesta:**
```
SQLite (backend) ←→ Zustand (frontend cache) ←→ WebSocket sync
```

**Race condition típica:**
1. Usuario crea ejecución (optimistic update en UI)
2. POST `/api/executions` devuelve 201
3. WebSocket broadcast del nuevo item
4. UI recibe broadcast y agrega duplicado

**Soluciones posibles:**
- IDs UUID generados en cliente antes del POST
- Deduplicación por ID en el store
- Invalidar caché en lugar de optimistic updates

**Complejidad:** Alta. Requiere reescribir la lógica de estado de los stores.

---

### 🔴 Problema 6: File System Access

**Operaciones que la TUI hace hoy:**
- Leer cualquier archivo del proyecto (`fs.readFile`)
- Escribir archivos (aplicar diffs de código)
- Ejecutar git (status, diff, commit)
- Acceder a API keys en `~/.config/openfarm/`

**Limitaciones en el browser:**
- File System Access API requiere permisos explícitos por directorio (usuario debe "elegir carpeta")
- No hay git nativo (wasm-git existe pero es experimental)
- LocalStorage tiene límite de ~5MB
- API keys no pueden exponerse al frontend

**Consecuencia:** La Web UI será necesariamente más limitada o más lenta (round-trip HTTP por cada operación de FS).

---

### 🔴 Problema 7: Build y Deployment

**Problema no considerado:** El frontend necesita saber dónde está el backend.

```typescript
// En el browser:
const API_URL = 'http://localhost:3001'; // ¿Y en producción?
```

**Opciones analizadas:**

| Opción | Pros | Contras |
|--------|------|---------|
| Same-origin (proxy) | Simple para el cliente | Requiere nginx reverse proxy |
| Build-time env | Fácil de implementar | No puede cambiar en runtime |
| Runtime config.json | Flexible | Extra request al iniciar |

**Impacto:** Agrega complejidad de infraestructura no contemplada.

---

### 🔴 Problema 8: Hot Reload vs Estado

**Experiencia de desarrollo:**
- Vite HMR recarga componentes
- Zustand state se pierde en cada recarga
- WebSocket/SSE se desconecta

**Soluciones:**
- Persistir en `sessionStorage` durante HMR
- Usar React Query/SWR que manejan re-fetching automático
- Aceptar reinicio completo en desarrollo

---

## Opciones Revisadas

### Opción A: "Thin Client" (Recomendada)

**Concepto:** La Web UI es una terminal remota mejorada usando xterm.js.

```
┌─────────────┐      WebSocket (raw data)      ┌─────────────┐
│   Browser   │  ◄──────────────────────────►  │   Backend   │
│  (xterm.js) │                                │  (TUI real) │
└─────────────┘                                └─────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  PTY (pseudo-TTY)│
                    │  bun run tui     │
                    └─────────────────┘
```

**Implementación técnica:**
```typescript
// Backend: crea PTY con TUI real
const pty = spawn('bun', ['run', 'tui'], { pty: true });

// WebSocket bridge
ws.on('message', (data) => pty.write(data));
pty.on('data', (data) => ws.send(data));
```

**Pros:**
- ✅ 100% feature parity instantánea
- ✅ Cero cambios en el SDK
- ✅ Funciona en 2 semanas
- ✅ Seguridad: misma que TUI local (el usuario elige correrlo)

**Contras:**
- ⚠️ Se ve como terminal (monospace, box-drawing chars)
- ⚠️ No aprovecha CSS/HTML nativo
- ⚠️ No hay "responsive design" (fixed grid)

**Estimación:** 2 semanas (1 semana backend WS + PTY, 1 semana frontend xterm.js)

---

### Opción B: "Hybrid"

**Concepto:** UI mixta - algunas pantallas web nativas, ejecución en terminal embebida.

```
┌────────────────────────────────────────────┐
│  Dashboard (React/HTML)                    │◄── HTTP API
│  ┌──────────────────────────────────────┐  │
│  │  Execution (xterm.js embed)          │◄── WebSocket PTY
│  │  ┌────────────────────────────────┐  │  │
│  │  │  Logs en tiempo real           │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**División de responsabilidades:**

| Pantalla | Tecnología | Razón |
|----------|------------|-------|
| Dashboard | Web nativo | Datos agregados, fácil de mostrar |
| History | Web nativo | Lista scrollable, filtros |
| Settings | Web nativo | Formularios, validación |
| Execution | xterm.js | Logs en tiempo real, colores ANSI |
| Workflow Editor | Web nativo | Drag & drop, formularios |

**Arquitectura:**
- **Backend:** API REST para datos (JSON) + WebSocket PTY para ejecución
- **Frontend:** React Router para navegación entre pantallas

**Pros:**
- ✅ Mejor UX en pantallas estáticas (Dashboard, History)
- ✅ Ejecución mantiene la experiencia terminal real
- ✅ Migration path gradual (empezar con web, agregar xterm después)

**Contras:**
- ⚠️ Dos tecnologías diferentes (React DOM + xterm.js canvas)
- ⚠️ Coordinación de estado entre contextos
- ⚠️ Más complejo que Thin Client

**Estimación:** 4-6 semanas

---

### Opción C: "Full Web" (Plan Original Descartado)

**Concepto:** Reimplementar todo como SPA con API REST + WebSocket.

**Estado:** Descartado por sobre-ingeniería (12+ semanas, alta complejidad, beneficios marginales para el uso principal de OpenFarm).

---

## Recomendación y Next Steps

### Decisión: Opción A (Thin Client)

**Razones:**
1. **Time-to-market:** 2 semanas vs 4-6 semanas
2. **Sin deuda técnica:** No requiere refactor del SDK
3. **Funcionalidad completa:** Todo funciona día 1
4. **Base para iterar:** Podemos migrar a Hybrid después si es necesario

### Plan de Implementación (Opción A)

#### Semana 1: Backend

**Día 1-2: Servidor WebSocket + PTY**
```typescript
// packages/web-server/src/index.ts
import { spawn } from 'node-pty';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

wss.on('connection', (ws) => {
  const pty = spawn('bun', ['run', 'tui'], {
    cwd: process.cwd(),
    env: process.env,
  });

  ws.on('message', (data) => pty.write(data));
  pty.on('data', (data) => ws.send(data));
  
  pty.on('exit', () => ws.close());
  ws.on('close', () => pty.kill());
});
```

**Día 3-4: HTTP básico para metadata**
```typescript
// GET /api/project - nombre y path del proyecto
// GET /api/version - versión de OpenFarm
```

**Día 5: Integración y tests**

#### Semana 2: Frontend

**Día 1-2: Setup xterm.js**
```typescript
// packages/web-ui/src/terminal.tsx
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

const term = new Terminal({
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontSize: 14,
  theme: {
    background: '#1a1a1a',
    foreground: '#e0e0e0',
  },
});

const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (e) => term.write(e.data);
term.onData((data) => ws.send(data));
```

**Día 3-4: UI shell (header, conexión status)**

**Día 5: Polishing, error handling, reconnection**

### Comandos Finales

```bash
# Desarrollo
bun run tui --web              # Levanta servidor en :3001 + abre browser
bun run tui --web --port 8080  # Puerto custom
bun run tui --web --no-open    # Sin abrir browser automáticamente

# Producción (deploy)
bun run @openfarm/web-server   # Solo servidor, sin abrir browser
```

### Consideraciones Post-MVP

**Si la Thin Client tiene tracción, evaluar migración a Hybrid:**

1. **Fase 1:** Identificar qué pantallas se benefician más de ser web nativas (probablemente History y Settings)
2. **Fase 2:** Implementar API REST para esas pantallas
3. **Fase 3:** Crear componentes React que consuman la API
4. **Fase 4:** Router que switchee entre React y xterm.js según la ruta

**Métricas para decidir:**
- ¿Los usuarios piden "mejor" UI para alguna pantalla específica?
- ¿Hay features imposibles en terminal (ej: drag & drop de archivos)?
- ¿El performance de xterm.js es suficiente para logs grandes?

---

## Apéndice: Decisiones Descartadas

### Descartado: SharedWorker para estado

**Idea:** Mantener estado en un SharedWorker para sobrevivir recargas.

**Problema:** Complejidad alta, beneficios bajos. Los usuarios no recargan la página constantemente.

### Descartado: GraphQL

**Idea:** Usar GraphQL para queries flexibles.

**Problema:** Overkill para las necesidades actuales. REST con endpoints específicos es suficiente.

### Descartado: WebRTC (P2P)

**Idea:** Conectar browser directamente al backend sin servidor intermediario.

**Problema:** NAT traversal complejo, no resuelve el problema real (necesitamos el backend Bun de todos modos).

---

## Referencias

- [xterm.js documentation](https://xtermjs.org/)
- [node-pty](https://github.com/microsoft/node-pty)
- [Server-Sent Events vs WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [Hono - Web Framework](https://hono.dev/)

---

*Documento mantenido por el equipo de OpenFarm. Última actualización: 2026-02-05*
