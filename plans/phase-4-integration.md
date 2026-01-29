# Fase 4: Integración con OpenFarm

> **Duración estimada**: 2-3 horas  
> **Dependencias**: Fase 3 completada  
> **Objetivo**: Conectar el TUI con el SDK real de OpenFarm

---

## 📋 Checklist

- [ ] 4.1 Mejorar el hook de ejecución (`useExecution`)
- [ ] 4.2 Implementar streaming de respuestas
- [ ] 4.3 Manejo de errores y reintentos
- [ ] 4.4 Persistencia de ejecuciones
- [ ] 4.5 Keyboard shortcuts globales

---

## 4.1 Hook de Ejecución Mejorado

### Archivo: `packages/sdk/src/tui/hooks/useExecution.ts`

```typescript
import { useState, useCallback, useRef } from "react";
import { useAppStore } from "../store";
import { OpenFarm } from "../../open-farm";
import type { ExecutionOptions, ExecutionResult } from "../../types";

type ExecutionStatus = "idle" | "pending" | "running" | "completed" | "failed" | "cancelled";

interface UseExecutionReturn {
  status: ExecutionStatus;
  execute: (options: ExecutionOptions) => Promise<void>;
  cancel: () => void;
  logs: string[];
  result: ExecutionResult | null;
  error: Error | null;
  progress: {
    current: number;
    total: number;
  };
}

export function useExecution(): UseExecutionReturn {
  const { config } = useAppStore();
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const abortControllerRef = useRef<AbortController | null>(null);
  const clientRef = useRef<OpenFarm | null>(null);

  const execute = useCallback(
    async (options: ExecutionOptions) => {
      setStatus("pending");
      setLogs([]);
      setResult(null);
      setError(null);

      abortControllerRef.current = new AbortController();
      clientRef.current = new OpenFarm(config);

      try {
        setStatus("running");

        const executionResult = await clientRef.current.execute({
          ...options,
          onProgress: (chunk) => {
            setLogs((prev) => [...prev, chunk]);
            // Parsear progreso si el chunk lo tiene
            const progressMatch = chunk.match(/\[(\d+)\/(\d+)\]/);
            if (progressMatch) {
              setProgress({
                current: parseInt(progressMatch[1], 10),
                total: parseInt(progressMatch[2], 10),
              });
            }
          },
        });

        setResult(executionResult);
        setStatus(executionResult.success ? "completed" : "failed");
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("failed");
      }
    },
    [config]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus("cancelled");
  }, []);

  return {
    status,
    execute,
    cancel,
    logs,
    result,
    error,
    progress,
  };
}
```

---

## 4.2 Implementar Streaming de Respuestas

### Modificar `OpenFarm.execute` para soportar streaming

Archivo a modificar: `packages/sdk/src/open-farm.ts`

```typescript
async execute(options: ExecutionOptions): Promise<ExecutionResult> {
  const provider = options.provider || this.config.defaultProvider || "opencode";
  const executor = createExecutor(provider as ExecutorType);

  // Si hay onProgress, hacer streaming
  if (options.stream && options.onProgress) {
    return this.executeStreaming(executor, options);
  }

  // Ejecución normal
  return executor.execute({
    ...options,
    provider,
    model: options.model || this.config.defaultModel,
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
  });
}

private async executeStreaming(
  executor: Executor,
  options: ExecutionOptions
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const chunks: string[] = [];

  try {
    // Simular streaming - esto depende de si el executor soporta streaming real
    const result = await executor.execute({
      ...options,
      onProgress: (chunk) => {
        chunks.push(chunk);
        options.onProgress?.(chunk);
      },
    });

    return {
      ...result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    };
  }
}
```

### Actualizar tipos

Archivo: `packages/sdk/src/types.ts`

```typescript
export interface ExecutionOptions {
  task: string;
  context?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;  // NUEVO
  onProgress?: (chunk: string) => void;
}
```

---

## 4.3 Manejo de Errores y Reintentos

### Archivo: `packages/sdk/src/tui/hooks/useExecutionWithRetry.ts`

```typescript
import { useExecution } from "./useExecution";
import { useState, useCallback } from "react";
import type { ExecutionOptions } from "../../types";

interface RetryConfig {
  maxRetries: number;
  delayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
};

export function useExecutionWithRetry(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
  const execution = useExecution();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = useCallback(
    async (options: ExecutionOptions) => {
      setRetryCount(0);
      setIsRetrying(false);

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          await execution.execute(options);
          
          // Si tuvo éxito, salir
          if (execution.result?.success) {
            return;
          }

          // Si falló y hay más reintentos
          if (attempt < config.maxRetries) {
            setIsRetrying(true);
            setRetryCount(attempt + 1);
            await sleep(config.delayMs * (attempt + 1)); // Backoff exponencial
          }
        } catch (error) {
          if (attempt === config.maxRetries) {
            throw error;
          }
          setRetryCount(attempt + 1);
          await sleep(config.delayMs * (attempt + 1));
        }
      }
    },
    [execution, config]
  );

  return {
    ...execution,
    execute: executeWithRetry,
    retryCount,
    isRetrying,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Componente de Error

Archivo: `packages/sdk/src/tui/components/ui/ErrorBoundary.tsx`

```tsx
import React, { Component, type ReactNode } from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../../theme/styles";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("TUI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  const theme = useTheme("dark");

  return (
    <Box
      width="100%"
      height="100%"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor={theme.colors.background}
    >
      <Text color={theme.colors.error} bold>
        ❌ Something went wrong
      </Text>
      <Text color={theme.colors.text.secondary}>
        {error?.message || "Unknown error"}
      </Text>
    </Box>
  );
}
```

---

## 4.4 Persistencia de Ejecuciones

### Storage Adapter

Archivo: `packages/sdk/src/tui/store/storage.ts`

```typescript
import type { Execution } from "./index";

const STORAGE_KEY = "openfarm_executions";

export function saveExecutions(executions: Execution[]): void {
  try {
    const data = JSON.stringify(executions);
    // Usar fs en Node.js o localStorage si estamos en un entorno que lo soporta
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, data);
    }
  } catch (error) {
    console.error("Failed to save executions:", error);
  }
}

export function loadExecutions(): Execution[] {
  try {
    if (typeof localStorage !== "undefined") {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Convertir fechas de string a Date
        return parsed.map((e: any) => ({
          ...e,
          startedAt: new Date(e.startedAt),
          completedAt: e.completedAt ? new Date(e.completedAt) : undefined,
        }));
      }
    }
  } catch (error) {
    console.error("Failed to load executions:", error);
  }
  return [];
}

export function clearExecutions(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to clear executions:", error);
  }
}
```

### Actualizar Store con Persistencia

Archivo: `packages/sdk/src/tui/store/index.ts` (actualización)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OpenFarmConfig, ExecutionResult } from "../../types";

export interface Execution {
  id: string;
  task: string;
  provider: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: ExecutionResult;
  startedAt: Date;
  completedAt?: Date;
}

interface AppState {
  // ... estado anterior ...
}

// Storage adapter para Zustand
const storage = {
  getItem: (name: string) => {
    const value = localStorage.getItem(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: unknown) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ... estado inicial ...
    }),
    {
      name: "openfarm-tui",
      storage,
      partialize: (state) => ({
        // Solo persistir estas keys
        executions: state.executions,
        config: state.config,
        theme: state.theme,
      }),
    }
  )
);
```

---

## 4.5 Keyboard Shortcuts Globales

### Archivo: `packages/sdk/src/tui/hooks/useKeyboard.ts`

```typescript
import { useEffect, useCallback } from "react";
import { useAppStore } from "../store";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboard(shortcuts: ShortcutConfig[]) {
  const { setScreen } = useAppStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === event.ctrlKey;
        const altMatch = !!shortcut.alt === event.altKey;
        const shiftMatch = !!shortcut.shift === event.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Hook predefinido para la app
export function useAppShortcuts() {
  const { setScreen } = useAppStore();

  useKeyboard([
    { key: "n", ctrl: true, handler: () => setScreen("execute") },
    { key: "h", ctrl: true, handler: () => setScreen("history") },
    { key: "s", ctrl: true, handler: () => setScreen("settings") },
    { key: "d", ctrl: true, handler: () => setScreen("dashboard") },
    { key: "q", ctrl: true, handler: () => process.exit(0) },
    { key: "Escape", handler: () => setScreen("dashboard") },
  ]);
}
```

### Actualizar App.tsx para usar shortcuts

Archivo: `packages/sdk/src/tui/App.tsx`

```tsx
import React from "react";
import { Layout } from "./components/layout";
import { Dashboard } from "./screens/Dashboard";
import { Execute } from "./screens/Execute";
import { Executing } from "./screens/Executing";
import { History } from "./screens/History";
import { ExecutionDetail } from "./screens/ExecutionDetail";
import { Settings } from "./screens/Settings";
import { useAppStore } from "./store";
import { useAppShortcuts } from "./hooks/useKeyboard";
import type { OpenFarmConfig } from "../types";

interface AppProps {
  config: OpenFarmConfig;
}

export function App({ config }: AppProps) {
  const { currentScreen, setConfig } = useAppStore();

  // Setup keyboard shortcuts
  useAppShortcuts();

  // Set config on mount
  React.useEffect(() => {
    setConfig(config);
  }, [config, setConfig]);

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <Dashboard />;
      case "execute":
        return <Execute />;
      case "executing":
        return <Executing />;
      case "history":
        return <History />;
      case "execution-detail":
        return <ExecutionDetail />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderScreen()}</Layout>;
}
```

---

## ✅ Criterios de Aceptación

- [ ] El hook `useExecution` maneja todo el ciclo de vida
- [ ] El streaming muestra output en tiempo real
- [ ] Los errores se muestran en la UI con retry automático
- [ ] Las ejecuciones se guardan entre sesiones
- [ ] Los shortcuts funcionan en todas las pantallas
- [ ] Ctrl+Q cierra la app limpiamente
- [ ] Esc vuelve al dashboard

---

## 📝 Notas

- El streaming depende de si los executors lo soportan
- La persistencia puede usar SQLite en vez de localStorage para más datos
- Considerar agregar un "clear history" en Settings
- Los shortcuts pueden conflicto con el terminal, documentar alternativas

---

## 🔄 Siguiente Paso

→ [Fase 5: Polish y Extras](./phase-5-polish.md)
