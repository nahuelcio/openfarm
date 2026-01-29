# 📋 Planes de Implementación - OpenFarm

Esta carpeta contiene los planes detallados para implementar features en OpenFarm.

## 📁 Planes Activos

| Plan | Descripción | Estado | Prioridad |
|------|-------------|--------|-----------|
| [TUI Master Plan](./tui-master-plan.md) | Implementación del CLI/TUI con OpenTUI | 📝 Planificación | Alta |

## 🎯 TUI Master Plan - Fases

1. **[Fase 1: Setup e Instalación](./phase-1-setup.md)**
   - Instalar OpenTUI y dependencias
   - Configurar estructura del proyecto
   - Setup inicial del CLI

2. **[Fase 2: Componentes Core](./phase-2-core-components.md)**
   - Theme y diseño
   - Layout base
   - Componentes reutilizables

3. **[Fase 3: Pantallas Principales](./phase-3-screens.md)**
   - Dashboard
   - Ejecución de tareas
   - Historial y logs

4. **[Fase 4: Integración con OpenFarm](./phase-4-integration.md)**
   - Conectar con SDK
   - Manejo de estado
   - Streaming de respuestas

5. **[Fase 5: Polish y Extras](./phase-5-polish.md)**
   - Animaciones
   - Configuración
   - Shortcuts

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
