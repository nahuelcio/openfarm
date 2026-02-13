# TUI Store Structure Review

Fecha: 2026-02-12
Estado: `REVIEWED`

## Resumen Ejecutivo

La arquitectura de stores en TUI está funcional, pero hay dos problemas estructurales:

1. `useStore` (`packages/sdk/src/tui/store.ts`) mezcla demasiados dominios y además ejecuta efectos de persistencia.
2. Hay duplicación de responsabilidad entre stores especializados y `useStore` principal (ejecuciones, contexto y navegación).

Esto no rompe hoy, pero sube costo de mantenimiento y riesgo de regresión al tocar flujos cross-screen.

## Inventario de Stores (actual)

- `packages/sdk/src/tui/store.ts`: store principal monolítico (routing, ejecuciones, workflows, contexto, diff, typing).
- `packages/sdk/src/tui/store/chat-store.ts`: chat + persistencia + streaming.
- `packages/sdk/src/tui/store/execution-runtime-store.ts`: estado efímero de ejecución en memoria.
- `packages/sdk/src/tui/store/task-loop-store.ts`: estado local del task loop screen.
- `packages/sdk/src/tui/store/remote-store.ts`: instancias remotas + conexiones.
- `packages/sdk/src/tui/store/log-store.ts`: logs enriquecidos y filtros.
- `packages/sdk/src/tui/store/tracing-store.ts`: árbol de trazas.
- `packages/sdk/src/tui/theme/store.ts` + bridge legacy `packages/sdk/src/tui/store/theme-store.ts`.

## Hallazgos Clave

## 1) Monolito en `useStore`

`packages/sdk/src/tui/store.ts` concentra:
- navegación (`screen`, `activeTab`),
- ejecución (`executions`, `currentExecution`, `addExecution`, `updateExecution`),
- workflows (`workflows`, `currentWorkflow`, `editingStep`, `selectedWorkflowId`),
- contexto (`context*`, `generatedContexts`, cache),
- diff state y typing state.

Impacto:
- Alto acoplamiento entre features.
- Mayor superficie de re-render accidental si se selecciona estado amplio en screens.

## 2) Side effects dentro de reducers/actions del store principal

En `packages/sdk/src/tui/store.ts`, `addExecution` y `updateExecution` persisten directo a DB (`getDb`, `createTuiExecution`, `updateTuiExecution`).

Impacto:
- Mezcla capa de estado UI con I/O.
- Hace más difícil testear sin mocks de DB.
- Complica reutilización del store en modo offline/sandbox.

## 3) Frontera difusa entre estado persistente y efímero

El split `useStore` vs `useExecutionRuntimeStore` está bien conceptualmente, pero aún hay datos de ejecución repartidos entre ambos stores.

Impacto:
- Riesgo de inconsistencias (ej. status y sesión activa no siempre en misma fuente de verdad).

## 4) Duplicidad de modelo de tema (bridge legacy)

Existe store nuevo `packages/sdk/src/tui/theme/store.ts` y bridge en `packages/sdk/src/tui/store/theme-store.ts`.

Impacto:
- Deuda técnica controlada, pero conviene plan de retiro del bridge para evitar imports mixtos.

## 5) Calidad de tipos inconsistente en chat-store

`packages/sdk/src/tui/store/chat-store.ts` define `type SQL = any` (no usado en la lógica visible) y mezcla concerns de estado + DB + AI streaming.

Impacto:
- Violación de guideline de tipo estricto.
- Acción demasiado pesada para un único store.

## Recomendación de Estructura Objetivo

Mantener Zustand, pero dividir por dominio explícito:

1. `ui-store`:
   - `screen`, `activeTab`, `isTyping`, estado de overlays globales.

2. `execution-store`:
   - `executions`, `currentExecution`, `selectedExecutionForDiff`, `selectedDiffFileIndex`.

3. `workflow-store`:
   - `workflows`, `currentWorkflow`, `editingStep`, `selectedWorkflowId`.

4. `context-store`:
   - `contextStatus`, `contextProvider`, `contextModel`, `contextProgress`, `contextResult`, `contextError`,
   - `generatedContexts`, `currentContext`, `cachedContext`.

5. `runtime-store`:
   - mantener `execution-runtime-store` como está (ephemeral).

6. `services/*`:
   - mover persistencia DB y orquestación de AI fuera de reducers hacia servicios invocados por acciones finas.

## Plan Incremental (sin big-bang)

1. Introducir selectors reutilizables para `useStore` antes de dividirlo.
2. Extraer primero `ui-store` (bajo riesgo, poco I/O).
3. Extraer `execution-store` y redirigir pantallas de history/running/detail.
4. Extraer `workflow-store` y `context-store`.
5. Migrar side effects de DB a servicios (`store` queda puro de estado).
6. Dejar `store.ts` como compat layer temporal con deprecaciones internas.

## Criterios de Éxito

- Ningún store nuevo con más de un dominio.
- Actions de store sin side effects de red/DB directos.
- Todos los screens consumiendo selectors acotados.
- Tests de stores por dominio (unit) y smoke integration de navegación.

## Riesgo de Implementación

- Riesgo técnico: `MEDIO`.
- Riesgo operativo: `BAJO-MEDIO` si se hace en etapas y con compat layer.
