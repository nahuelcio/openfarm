# Proposal: Sistema de Specs para OpenFarm

## Problem

Actualmente en OpenFarm no hay un proceso estructurado para planificar features antes de implementarlas. Los usuarios (y nosotros) tiramos código directo sin:
- Definir claramente el problema y la solución
- Pensar requisitos y edge cases
- Diseñar antes de codear
- Tener una lista de tareas trackeable

Esto genera:
- Implementaciones a medias o incorrectas
- Falta de contexto cuando el AI implementa
- Dificultad para refinar/rehacer features
- No hay historial de decisiones técnicas

## Solution

Un sistema de specs liviano integrado al SDK con interfaz única `openfarm spec ...`.

Comandos v1 (scope completo):

Core:
- `openfarm spec plan <name> <description>` - Crea proposal, requirements, design y tasks con AI
- `openfarm spec refine <slug> <feedback>` - Ajusta el spec existente según feedback
- `openfarm spec implement <slug>` - Ejecuta las tareas del spec (integra con workflow-engine)
- `openfarm spec archive <slug>` - Mueve el spec a archivo

Soporte:
- `openfarm spec list [--status <status>] [--all]` - Lista specs activos/archivados
- `openfarm spec show <slug> [--raw <artifact>]` - Muestra resumen o artifact crudo
- `openfarm spec status <slug> <new-status>` - Cambio manual de estado

Estructura de carpetas:
```
.openfarm/specs/
├── <feature-slug>/
│   ├── _meta.json
│   ├── 01-proposal.md
│   ├── 02-requirements.md
│   ├── 03-design.md
│   └── 04-tasks.md
└── archive/
    └── <YYYY-MM-DD-feature-slug>/
```

## Motivation

- **Quality**: Pensar antes de codear reduce rework
- **Context**: El AI tiene specs completos para implementar mejor
- **Tracking**: Sabemos en qué estado está cada feature (por `_meta.json`)
- **Brownfield**: Funciona en proyectos existentes (no solo nuevos)
- **Simple**: 7 comandos en total (4 core + 3 soporte), no 20 como OpenSpec original

## Success Criteria

- [ ] Puedo crear un spec en < 30 segundos
- [ ] El AI genera requirements/design/tasks útiles en el 80% de casos
- [ ] Puedo implementar un spec con un comando
- [ ] Puedo listar y visualizar specs sin abrir archivos manualmente
- [ ] Los specs se archivan sin perder historial
- [ ] Funciona en cualquier proyecto (no depende de estructura específica)
- [ ] No afecta performance del SDK existente
