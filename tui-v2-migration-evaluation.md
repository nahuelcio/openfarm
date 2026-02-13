# TUI V2 Migration Evaluation

Fecha: 2026-02-12
Estado: `PARTIAL` (migracion activa, no cerrada)

## Alcance Evaluado

- Entry point real de la TUI en CLI.
- Cobertura de routing en `AppV2`.
- Paridad funcional entre pantallas definidas y pantallas renderizadas.
- Riesgo de regresion para adopcion total de V2.

## Hallazgos (con evidencia)

1. V2 ya es el path por defecto en CLI.
   - `packages/sdk/src/tui-cli.ts:79` muestra que `--legacy` esta deprecado y se usa `AppV2`.
   - `packages/sdk/src/tui-cli.ts:94` y `packages/sdk/src/tui-cli.ts:95` invocan `runTUIV2`.

2. `Screen` declara rutas que `AppV2` no maneja.
   - Declaradas: `file-explorer`, `warp-terminal` en `packages/sdk/src/tui/store.ts:36` y `packages/sdk/src/tui/store.ts:37`.
   - `AppV2` hace `switch(screen)` en `packages/sdk/src/tui/app-v2.tsx:180`, pero no tiene `case` para esas pantallas y cae a `default` (`packages/sdk/src/tui/app-v2.tsx:214`).

3. El flujo de chat principal en V2 no usa la pantalla avanzada.
   - `AppV2` renderiza `SimpleAgent` para `agent-chat` en `packages/sdk/src/tui/app-v2.tsx:211`.
   - Existe `AgentChat` completa en `packages/sdk/src/tui/screens/agent-chat.tsx:18` pero no se usa desde `AppV2`.

4. Dashboard V2 actual es un onboarding hard-redirect.
   - `new-dashboard` manda a `simple-setup` con cualquier tecla (`packages/sdk/src/tui/screens/new-dashboard.tsx:14` y `packages/sdk/src/tui/screens/new-dashboard.tsx:15`).
   - Esto simplifica UX inicial, pero reduce navegacion directa tipo dashboard.

5. Task-loop sigue embebido en `MainLayout`.
   - `AppV2` renderiza `TaskLoopScreen` con `embedded={true}` (`packages/sdk/src/tui/app-v2.tsx:209`).
   - El plan de referencia de Ralph proponia full-screen dedicado (sin shell superior/lateral).

## Riesgo de Migracion

- Riesgo funcional: `MEDIO`
  - Porque hay rutas declaradas no cubiertas por render.
- Riesgo UX: `MEDIO-ALTO`
  - Porque el chat avanzado no es el default en `agent-chat`.
- Riesgo tecnico: `MEDIO`
  - Porque V2 convive con componentes legacy y algunas rutas caen a `default`.

## Decision Recomendada

`GO CON CONDICIONES` para migrar completamente a V2.

No recomiendo rollback a V1 (ya no es el entrypoint real), pero tampoco recomiendo declarar migracion finalizada hasta cerrar los gaps de routing y chat.

## Condiciones de Cierre (Definition of Done de migracion)

1. Paridad de rutas:
   - Agregar `case "file-explorer"` y `case "warp-terminal"` en `AppV2`, o remover esas rutas del tipo `Screen` si quedaron fuera de alcance.

2. Definir estrategia de chat:
   - Opcion A: usar `AgentChat` como pantalla oficial de `agent-chat`.
   - Opcion B: mantener `SimpleAgent` como oficial y mover `AgentChat` a feature flag/experimental.

3. Validar decision de task-loop:
   - Si se busca Ralph-style real, mover `task-loop` a full-screen fuera de `MainLayout`.
   - Si no, actualizar el plan para reflejar que queda embebido por decision de producto.

4. Criterio de calidad minimo antes de declarar migracion cerrada:
   - Cero rutas huérfanas (`Screen` vs `switch(screen)`).
   - Test de integración con matriz de navegación principal (dashboard, execute, history, workflows, context, remotes, task-loop, agent-chat).

## Plan Corto Propuesto (siguiente iteracion)

1. Cerrar paridad de routing en `AppV2`.
2. Elegir y fijar pantalla oficial para `agent-chat`.
3. Ajustar plan de migracion para que no contradiga implementación real.
4. Ejecutar lint/tests focalizados de TUI y luego suite completa cuando se estabilice el arbol.
