# Planes de Mejora — OpenFarm

Esta carpeta contiene planes detallados para mejorar la calidad del código, arquitectura y procesos del proyecto OpenFarm.

## Estructura

```
improvement-plans/
├── 01-critical/     # Problemas críticos que bloquean desarrollo
├── 02-architecture/ # Refactorizaciones arquitectónicas
├── 03-quality/      # Mejoras de calidad (tipos, tests, lint)
├── 04-documentation/ # Documentación faltante
└── 05-build/        # Configuración de build y empaquetado
```

## Cómo usar estos planes

1. Revisar los ADRs (Architecture Decision Records) en cada carpeta
2. Priorizar segúnurgence y esfuerzo
3. Crear issues en GitHub vinculados a cada plan
4. Seguir el orden recomendado en el roadmap general

## Roadmap General

### Fase 1: Critical Fixes (Inmediato)
- [ ] Eliminar duplicación de código (utils, validation, metrics)
- [ ] Estrictar TypeScript (`noImplicitAny: true`)
- [ ] Activar regla `noExplicitAny` en Biome
- [ ] Corregir config de packages (main/types)

### Fase 2: Architecture (1-2 semanas)
- [ ] Refactorizar dependencias (eliminar ciclos)
- [ ] Consolidar layers (tipos → utils → core → infra → orquestación → SDK)
- [ ] TSUP: remover noExternal innecesario

### Fase 3: Quality (2-3 semanas)
- [ ] Añadir tests a packages criticos (utils, core, logger)
- [ ] Eliminar TODOs y stubs
- [ ] Mejorar tipado de mocks
- [ ] Alcanzar 80% coverage

### Fase 4: Documentation (1 semana)
- [ ] READMEs para todos los packages
- [ ] ADRs para decisiones arquitectónicas
- [ ] Ejemplos adicionales
- [ ] Guía de contributor

### Fase 5: Build & Release (1 semana)
- [ ] Estandarizar tsup configs
- [ ] CI: añadir coverage checks
- [ ] Changelog automation
- [ ] Versioning strategy

## Autor

Análisis realizado por Kilo Code (Senior Architect) el 2026-02-02.
