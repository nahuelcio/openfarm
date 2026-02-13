# TUI Unused Components Audit

Fecha: 2026-02-12
Estado: `INVENTORY` (sin removals automaticos)

## Metodo

- Busqueda estática con `rg` sobre `packages/sdk/src/tui`.
- Regla: componente marcado como huérfano cuando solo aparece en su propio archivo y/o en barrels, sin imports consumidores reales.

## Hallazgos Principales

## 1) Layout components huérfanos (sin consumidores)

- `packages/sdk/src/tui/components/layout/header.tsx`
  - Solo referenciado desde `packages/sdk/src/tui/components/layout/index.ts:8`.
  - No hay imports activos de `Header` en `AppV2` ni screens.

- `packages/sdk/src/tui/components/layout/side-nav.tsx`
  - Solo referenciado desde `packages/sdk/src/tui/components/layout/index.ts:14`.
  - `MainLayout` usa sidebar propio (`ImprovedSidebar`), no `SideNav`.

- `packages/sdk/src/tui/components/layout/section-panel.tsx`
  - Exportado en `packages/sdk/src/tui/components/layout/index.ts:13`.
  - Sin imports consumidores fuera de su propio módulo/barrel.

- `packages/sdk/src/tui/components/layout/resizable-layout.tsx`
  - Sin referencias de uso fuera del propio archivo.

- `packages/sdk/src/tui/components/layout/unified-input.tsx`
  - Sin referencias de uso fuera del propio archivo.

## 2) Exportes de barrel con bajo uso interno

- `packages/sdk/src/tui/components/index.ts` exporta `Footer`, `Header`, `MainLayout`, `StatusBadge`, `TabBar`, `TraceTree`.
- Uso interno actual del barrel está concentrado en `HelpOverlay` y `KeyHelpBar`.
- Riesgo: quitar exportes puede romper consumidores externos (paquete público), aunque internamente no se usen.

## 3) Screens potencialmente huérfanas por routing V2

- `file-explorer` y `warp-terminal` existen en tipo `Screen` (`packages/sdk/src/tui/store.ts:36`, `packages/sdk/src/tui/store.ts:37`) pero no tienen `case` en `AppV2` (`packages/sdk/src/tui/app-v2.tsx:180`..`packages/sdk/src/tui/app-v2.tsx:214`).
- Resultado: pueden quedar inaccesibles desde el flujo principal.

## Recomendacion de Cleanup (orden sugerido)

1. Fase segura (sin breaking API):
   - Mantener exports públicos.
   - Marcar huérfanos con etiqueta `@deprecated-internal` y moverlos a carpeta `experimental/` o `legacy/`.

2. Fase de decisión producto:
   - Confirmar si `ResizableLayout` y `UnifiedInput` siguen en roadmap V3.
   - Si no, eliminar archivos y tests asociados.

3. Fase semver:
   - Si se decide remover exports de barrels públicos, hacerlo en major release con changelog explícito.

## Notas

- Este audit no elimina código a propósito.
- El árbol actual tiene deuda de lint fuera de este alcance; conviene no mezclar cleanup estructural con fixes de comportamiento en el mismo commit.
