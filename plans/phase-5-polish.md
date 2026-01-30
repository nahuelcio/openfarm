# Fase 5: Polish y Extras

> **Duración estimada**: 2-3 horas  
> **Dependencias**: Fase 4 completada  
> **Objetivo**: Agregar animaciones, configuración avanzada, y features nice-to-have

---

## 📋 Checklist

- [ ] 5.1 Animaciones y transiciones
- [ ] 5.2 Soporte para múltiples themes
- [ ] 5.3 Diff viewer mejorado
- [ ] 5.4 Export/Import de ejecuciones
- [ ] 5.5 Configuración desde archivo
- [ ] 5.6 Tests del TUI

---

## 5.1 Animaciones y Transiciones

### Spinner mejorado

```tsx
// packages/sdk/src/tui/components/ui/Spinner.tsx
const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
```

### ProgressBar

```tsx
// packages/sdk/src/tui/components/ui/ProgressBar.tsx
interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
}
```

---

## 5.2 Soporte para Múltiples Themes

Agregar themes adicionales:

```typescript
// themes/colors.ts
export const colors = {
  dark: { /* ... */ },
  light: { /* ... */ },
  dracula: { /* ... */ },
  monokai: { /* ... */ },
};
```

---

## 5.3 Diff Viewer Mejorado

```tsx
// Componente para mostrar diffs con syntax highlighting
interface DiffViewerProps {
  files: Array<{
    path: string;
    diff: string;
    additions: number;
    deletions: number;
  }>;
}
```

---

## 5.4 Export/Import de Ejecuciones

```typescript
// storage.ts
export function exportExecutions(executions: Execution[]): string {
  return JSON.stringify(executions, null, 2);
}

export function importExecutions(data: string): Execution[] {
  return JSON.parse(data);
}
```

---

## 5.5 Configuración desde Archivo

Soportar archivo `.openfarmrc.json`:

```json
{
  "defaultProvider": "opencode",
  "defaultModel": "claude-3.5-sonnet",
  "theme": "dark",
  "shortcuts": {
    "newTask": "Ctrl+N",
    "history": "Ctrl+H"
  }
}
```

---

## 5.6 Tests del TUI

```typescript
// tests/tui/App.test.tsx
import { render } from "opentui/testing";
import { App } from "../tui/App";

test("renders dashboard by default", () => {
  const { lastFrame } = render(<App config={{}} />);
  expect(lastFrame()).toContain("Dashboard");
});
```

---

## ✅ Criterios de Aceptación

- [ ] Hay múltiples themes disponibles
- [ ] El diff viewer muestra cambios coloreados
- [ ] Se puede exportar/importar historial
- [ ] Lee config desde `.openfarmrc.json`
- [ ] Hay tests básicos del TUI

---

## 🎉 Conclusión

Con estas 5 fases tenemos un TUI completo:

1. **Fase 1**: Setup y estructura
2. **Fase 2**: Componentes core
3. **Fase 3**: Pantallas principales  
4. **Fase 4**: Integración con SDK
5. **Fase 5**: Polish y extras

---

## 🚀 Próximos Pasos Post-Implementación

- [ ] Publicar nuevo release con TUI
- [ ] Documentar en README
- [ ] Crear video demo
- [ ] Recolectar feedback de usuarios
