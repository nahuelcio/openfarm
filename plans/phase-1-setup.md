# Fase 1: Setup e Instalación

> **Duración estimada**: 30-60 minutos  
> **Dependencias**: Ninguna  
> **Objetivo**: Tener OpenTUI instalado y un "Hello World" funcionando

---

## 📋 Checklist

- [ ] 1.1 Instalar OpenTUI y dependencias
- [ ] 1.2 Configurar estructura de carpetas
- [ ] 1.3 Crear entry point del TUI
- [ ] 1.4 Verificar que compila y corre

---

## 1.1 Instalar OpenTUI y dependencias

### Paso 1: Navegar al package SDK
```bash
cd packages/sdk
```

### Paso 2: Instalar OpenTUI
```bash
bun add opentui
```

### Paso 3: Instalar dependencias adicionales necesarias
```bash
# State management
bun add zustand

# Para tipos y utilidades
bun add -d @types/react
```

> **Nota**: OpenTUI usa React como base. Aunque nuestro proyecto no es React, el TUI se renderiza en un contexto aparte.

### Paso 4: Verificar instalación
```bash
bun list opentui
```

Debería mostrar algo como:
```
opentui@0.x.x
```

---

## 1.2 Configurar Estructura de Carpetas

### Estructura propuesta dentro de `packages/sdk/src/`

```
src/
├── cli.ts                    # Entry point actual (mantener)
├── cli.tsx                   # NUEVO: Entry point del TUI
├── index.ts                  # Exports públicos
├── open-farm.ts              # SDK core
├── types.ts                  # Tipos
├── executors/                # Executors existentes
├── tui/                      # NUEVO: Todo el TUI acá
│   ├── index.tsx             # Entry point del TUI
│   ├── App.tsx               # Root component
│   ├── store/                # Estado global
│   │   ├── index.ts
│   │   └── slices/
│   ├── components/           # Componentes reutilizables
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/
│   │   │   ├── Box.tsx
│   │   │   ├── Text.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   └── domain/
│   │       ├── ProviderSelect.tsx
│   │       └── TaskInput.tsx
│   ├── screens/              # Pantallas principales
│   │   ├── Dashboard.tsx
│   │   ├── Execute.tsx
│   │   ├── History.tsx
│   │   ├── ExecutionDetail.tsx
│   │   └── Settings.tsx
│   ├── hooks/                # Custom hooks
│   │   ├── useExecution.ts
│   │   └── useKeyboard.ts
│   ├── theme/                # Temas y estilos
│   │   ├── index.ts
│   │   ├── colors.ts
│   │   └── styles.ts
│   └── router/               # Navegación
│       └── index.ts
└── ...
```

### Crear carpetas
```bash
cd packages/sdk/src
mkdir -p tui/{store/slices,components/{layout,ui,domain},screens,hooks,theme,router}
```

---

## 1.3 Crear Entry Point del TUI

### Archivo: `packages/sdk/src/tui/index.tsx`

```tsx
#!/usr/bin/env bun
import React from "react";
import { render } from "opentui";
import { App } from "./App";
import type { OpenFarmConfig } from "../types";

export function runTUI(config: OpenFarmConfig): void {
  render(<App config={config} />);
}
```

### Archivo: `packages/sdk/src/tui/App.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
import type { OpenFarmConfig } from "../types";

interface AppProps {
  config: OpenFarmConfig;
}

export function App({ config }: AppProps) {
  return (
    <Box
      width="100%"
      height="100%"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor="#0d1117"
    >
      <Text color="#58a6ff" bold>
        🌾 OpenFarm TUI
      </Text>
      <Text color="#8b949e">
        Provider: {config.defaultProvider || "opencode"}
      </Text>
      <Text color="#8b949e">
        Press Ctrl+C to exit
      </Text>
    </Box>
  );
}
```

### Archivo: `packages/sdk/src/cli.tsx` (nuevo entry point)

```tsx
#!/usr/bin/env bun
import { runTUI } from "./tui";
import type { OpenFarmConfig } from "./types";

export async function runCLI(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  // Si se pasa --cli, usar modo legacy
  if (args.includes("--cli")) {
    const { runLegacyCLI } = await import("./cli-legacy");
    return runLegacyCLI(args, config);
  }

  // Por defecto, usar TUI
  runTUI(config);
}
```

### Archivo: `packages/sdk/src/cli-legacy.ts`

Mover el contenido actual de `cli.ts` acá y renombrar la función:

```typescript
import { OpenFarm } from "./open-farm";
import type { OpenFarmConfig } from "./types";

export async function runLegacyCLI(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  // ... contenido actual de cli.ts ...
}
```

---

## 1.4 Verificar que Compila y Corre

### Paso 1: Actualizar `package.json` del SDK

Agregar scripts y cambiar el bin:

```json
{
  "name": "@openfarm/sdk",
  "bin": {
    "openfarm": "./src/cli.tsx"
  },
  "scripts": {
    "lint": "bunx biome check .",
    "type-check": "bunx tsc -p tsconfig.json --noEmit",
    "test": "bunx vitest run --passWithNoTests",
    "clean": "rm -rf dist build .turbo",
    "tui": "bun run src/cli.tsx",
    "tui:cli": "bun run src/cli.tsx --cli"
  }
}
```

### Paso 2: Actualizar `tsconfig.json` del SDK

Asegurarse de que soporte JSX:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "opentui",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### Paso 3: Probar compilación

```bash
cd packages/sdk
bun run type-check
```

No debería haber errores.

### Paso 4: Probar ejecución

```bash
bun run tui
```

Debería mostrar:
```
🌾 OpenFarm TUI
Provider: opencode
Press Ctrl+C to exit
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'opentui'"
```bash
# Asegurate de estar en packages/sdk
bun install
```

### Error: "JSX element type 'X' does not have any construct or call signatures"
```bash
# Verificar que tsconfig.json tenga jsxImportSource correcto
"jsxImportSource": "opentui"
```

### Error: "window is not defined" o similar
OpenTUI renderiza en terminal, no en browser. No usar APIs de DOM.

---

## ✅ Criterios de Aceptación

- [ ] `bun run type-check` pasa sin errores
- [ ] `bun run tui` muestra la pantalla de Hello World
- [ ] `bun run tui --cli` corre el modo legacy
- [ ] Ctrl+C cierra el TUI limpiamente
- [ ] La estructura de carpetas está creada

---

## 📝 Notas

- Mantener el CLI legacy como fallback
- OpenTUI puede tener bugs, documentar cualquier workaround
- Si OpenTUI no funciona, considerar alternativas (Ink, Blessed)

---

## 🔄 Siguiente Paso

→ [Fase 2: Componentes Core](./phase-2-core-components.md)
