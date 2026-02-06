# Design

## Approach

Package `@openfarm/spec` con arquitectura simple:

```
packages/spec/
├── src/
│   ├── index.ts           # API pública
│   ├── cli.ts             # Entry point CLI
│   ├── commands/
│   │   ├── plan.ts
│   │   ├── refine.ts
│   │   ├── implement.ts
│   │   ├── archive.ts
│   │   ├── list.ts
│   │   ├── show.ts
│   │   └── status.ts
│   ├── core/
│   │   ├── spec-manager.ts    # CRUD specs + filesystem
│   │   ├── prompt-engine.ts   # Generación de prompts
│   │   └── implementer.ts     # Ejecutar tasks
│   ├── format/
│   │   ├── formatters.ts
│   │   └── parsers.ts
│   ├── prompts/
│   │   ├── plan.ts            # Prompt plan
│   │   ├── refine.ts          # Prompt refine
│   │   ├── tasks.ts           # Prompt tasks
│   │   └── context.ts         # Contexto del proyecto
│   └── types.ts
```

## Decisions

### ¿Dónde guardar los specs?

**Opción A**: `.openfarm/specs/` (elegida)
- Pros: Estándar en proyecto, fácil de ignorar en git (opcional)
- Cons: Un poco de clutter

**Opción B**: `openspec/changes/` (como OpenSpec original)
- Pros: Compatible
- Cons: Nombre genérico, posible conflicto

**Decisión**: `.openfarm/specs/` - namespace propio, consistente con otros configs.

### ¿Qué interfaz de comandos exponer?

**Opción A**: `openfarm spec ...` (elegida)
- Pros: consistente con CLI actual, mantenible, documentable
- Cons: un nivel extra de comando

**Opción B**: slash commands `/spec-*`
- Pros: corto
- Cons: inconsistente con el router CLI actual

**Decisión**: superficie oficial v1 `openfarm spec ...`.

### ¿Formato de archivos?

**Opción A**: Markdown con estructura libre
- Pros: Legible, editable a mano
- Cons: Parsing más complejo

**Opción B**: YAML frontmatter + Markdown
- Pros: Metadata estructurada
- Cons: Más verboso

**Opción C**: JSON puro
- Pros: Fácil de parsear
- Cons: No editable a mano fácilmente

**Decisión**: Markdown simple con `_meta.json` para metadata. Balance entre legibilidad y estructura.

Schema v1 de `_meta.json`:

```json
{
  "slug": "spec-system",
  "name": "Spec System",
  "status": "draft|ready|implementing|done|archived",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "archivedAt": "ISO-8601|null",
  "artifacts": {
    "proposal": "01-proposal.md",
    "requirements": "02-requirements.md",
    "design": "03-design.md",
    "tasks": "04-tasks.md"
  }
}
```

### ¿Cómo generar con AI?

**Opción A**: Un solo prompt genera todo
- Pros: Simple, un solo llamado
- Cons: Puede perderse en detalles, output muy largo

**Opción B**: Prompts separados por artifact
- Pros: Mejor calidad por artifact, puede parar en medio
- Cons: Más llamados a AI (costo)

**Decisión**: Un solo prompt que genere proposal+requirements+design, otro para tasks. 2 llamados máximo por plan.

### ¿Cómo implementar tasks?

**Opción A**: Cada task es un workflow
- Pros: Reusa todo el sistema existente
- Cons: Overhead por task

**Opción B**: Un workflow con múltiples pasos
- Pros: Un solo contexto de AI
- Cons: Menos granularidad

**Decisión**: Un workflow por phase, tasks como pasos dentro del workflow. Balance de granularidad vs overhead.

## Architecture

### Flujo `openfarm spec plan`

```
1. Parsear nombre → slug
2. Detectar contexto (file tree, package.json, etc)
3. Llamar AI con prompt PLAN
4. Parsear respuesta (markdown estructurado)
5. Escribir archivos:
   - .openfarm/specs/<slug>/_meta.json
   - .openfarm/specs/<slug>/01-proposal.md
   - .openfarm/specs/<slug>/02-requirements.md
   - .openfarm/specs/<slug>/03-design.md
6. Llamar AI con prompt TASKS (usa design como input)
7. Escribir 04-tasks.md
8. Persistir `_meta.json` (status inicial: `draft`)
```

### Flujo `openfarm spec refine`

```
1. Leer spec existente
2. Construir prompt REFINE con:
   - Artifact actual (o todos)
   - Feedback del usuario
   - Contexto completo (otros artifacts)
3. Llamar AI
4. Parsear respuesta
5. Sobreescribir archivo(s)
6. Actualizar _meta.json updatedAt
```

### Flujo `openfarm spec implement`

```
1. Leer tasks del spec
2. Por cada phase:
   a. Crear workflow con contexto del spec
   b. Ejecutar workflow (usa task-loop internamente)
   c. Marcar tasks como done en archivo
3. Actualizar status a "done"
4. Reportar resumen
```

### Flujo `openfarm spec archive`

```
1. Validar spec existe
2. Mover carpeta a archive/<date-slug>
3. Actualizar _meta.json status + path
```

### Flujo `openfarm spec list`

```
1. Leer `.openfarm/specs/*/_meta.json`
2. Si `--all`, incluir `.openfarm/specs/archive/*/_meta.json`
3. Aplicar filtro `--status` si existe
4. Renderizar tabla: slug, name, status, updatedAt
```

### Flujo `openfarm spec show`

```
1. Resolver spec por slug
2. Si `--raw <artifact>`, imprimir artifact textual
3. Si no, mostrar resumen desde `_meta.json` + preview de artifacts
```

### Flujo `openfarm spec status`

```
1. Validar spec existe
2. Validar nuevo estado contra enum v1
3. Persistir status + updatedAt
4. Reportar transición previa -> nueva
```

## Risks

- **HIGH**: AI genera specs de mala calidad
  - Mitigation: Prompts bien tuneados, fallback a templates vacíos

- **MEDIUM**: Usuario pierde trabajo al sobreescribir en refine
  - Mitigation: Git tracking, backups automáticos (v2)

- **MEDIUM**: Implementación de tasks falla a mitad de camino
  - Mitigation: Tasks marcan estado parcial, pueden reanudar

- **LOW**: Specs crecen y ensucian repo
  - Mitigation: Archive, gitignore opcional
