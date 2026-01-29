# 📋 Planes de Implementación - OpenFarm

Esta carpeta contiene los planes detallados para implementar features en OpenFarm.

## 📁 Planes Activos

| Plan | Descripción | Estado | Prioridad |
|------|-------------|--------|-----------|
| [TUI Master Plan](./tui-master-plan.md) | Implementación del CLI/TUI con OpenTUI | 🚧 En progreso | Alta |

## 🎯 TUI Master Plan - Fases

1. **[Fase 1: Setup e Instalación](./phase-1-setup.md)** ✅
   - Instalar OpenTUI y dependencias
   - Configurar estructura del proyecto
   - Setup inicial del CLI

2. **[Fase 2: Pantallas Principales](./phase-2-core-components.md)** ✅
   - Theme y diseño
   - Layout base
   - Componentes reutilizables
   - Pantallas: Dashboard, Execute, Executing, History, ExecutionDetail, Settings
   - Navegación y keyboard shortcuts

3. **[Fase 3: Integración con SDK](./phase-3-integration.md)** ✅
   - Persistencia de ejecuciones a ~/.openfarm/executions.json
   - Mejorado useExecution hook con cancelación y retry
   - Config loader con .openfarmrc.json support
   - Manejo de errores con códigos específicos
   - Progress bar con porcentaje

4. **[Fase 4: Polish y Extras](./phase-4-polish.md)** ✅
   - 6 themes: dark, light, dracula, monokai, nord, oneDark
   - Nuevos componentes UI: ProgressBar, Badge, Divider, Card
   - Tests del store
   - Export con clipboard fallback

4. **[Fase 4: Polish y Extras](./phase-4-polish.md)**
   - Animaciones y transiciones
   - Temas adicionales
   - Export/Import de historial
   - Tests del TUI

## 🚀 Cómo usar estos planes

1. Leé el [TUI Master Plan](./tui-master-plan.md) para entender la visión general
2. Seguí las fases en orden (cada una depende de la anterior)
3. Marcá como completado cada item en los checkboxes
4. Si encontrás problemas, documentalos en la sección "Notas" de cada fase

## 🛠️ Stack Tecnológico

- **Runtime**: Bun
- **TUI Framework**: OpenTUI (https://opentui.com/)
- **Language**: TypeScript
- **Package**: `@openfarm/sdk`
