# 🎨 TUI Master Plan - OpenFarm CLI

## Visión General

Transformar el CLI actual de OpenFarm (básico, solo comandos) en una **Terminal User Interface (TUI)** rica e interactiva usando [OpenTUI](https://opentui.com/).

### ¿Por qué OpenTUI?

- **TypeScript-first**: Perfecto para nuestro stack
- **Flexbox layout**: Usa Yoga engine, familiar si venís de CSS
- **Multi-framework**: Soporta React, SolidJS, Vue (usamos la versión core)
- **Performance**: Optimizado para terminales
- **Active development**: Está en desarrollo activo

---

## 🎯 Objetivos

### Primary
- [ ] Reemplazar CLI básico por TUI interactivo
- [ ] Visualizar ejecución de agentes en tiempo real
- [ ] Navegar historial de ejecuciones
- [ ] Gestionar configuración desde la UI

### Secondary
- [ ] Soporte para múltiples paneles (split view)
- [ ] Visualización de diffs con syntax highlighting
- [ ] Keyboard shortcuts personalizables
- [ ] Themes (dark/light/custom)

### Nice-to-have
- [ ] Plugin system para extender la UI
- [ ] Integración con Git (visualización de branches)
- [ ] Mini-dashboard con métricas

---

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│  🌾 OpenFarm TUI                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🧭 Header (status, provider, model)               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  ┌──────────────┐  ┌───────────────────────────┐   │   │
│  │  │ 📁 Sidebar   │  │     📋 Main Content       │   │   │
│  │  │              │  │                           │   │   │
│  │  │ • Dashboard  │  │  [Dashboard / Exec /      │   │   │
│  │  │ • New Task   │  │   History / Config]       │   │   │
│  │  │ • History    │  │                           │   │   │
│  │  │ • Settings   │  │                           │   │   │
│  │  │              │  │                           │   │   │
│  │  └──────────────┘  └───────────────────────────┘   │   │
│  │                                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ⌨️  Footer (shortcuts, help)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Pantallas / Vistas

### 1. Dashboard (`/dashboard`)
```
┌────────────────────────────────────────┐
│  🌾 Dashboard                          │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 🚀 Quick │ │ 📊 Stats │ │ ⚡️    │ │
│  │  Start   │ │          │ │ Recent │ │
│  └──────────┘ └──────────┘ └────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  📝 Quick Task Input             │ │
│  │  > _                             │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### 2. Nueva Ejecución (`/execute`)
```
┌────────────────────────────────────────┐
│  🚀 Nueva Ejecución                    │
├────────────────────────────────────────┤
│                                        │
│  Provider: [OpenCode ▼]                │
│  Model:    [claude-3.5-sonnet ▼]       │
│                                        │
│  Task:                                   │
│  ┌──────────────────────────────────┐ │
│  │ Implementar autenticación JWT  │ │
│  │ en el endpoint /api/login      │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Contexto (opcional):                  │
│  ┌──────────────────────────────────┐ │
│  │ src/auth/*                       │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [  Ejecutar  ]  [  Simular  ]         │
│                                        │
└────────────────────────────────────────┘
```

### 3. Ejecución en Progreso (`/ executing`)
```
┌────────────────────────────────────────┐
│  ⏳ Ejecución #123 - OpenCode          │
├────────────────────────────────────────┤
│  Status: 🟡 Running (45s)              │
│  Tokens: 1,234 / Est: 2,000            │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  📜 Log Output                   │ │
│  │                                  │ │
│  │  Analyzing codebase...     ✓    │ │
│  │  Creating plan...          ✓    │ │
│  │  > Implementing auth...    🔄   │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [ ⏹ Stop ] [ ⏸ Pause ] [ 👁 Watch ]  │
└────────────────────────────────────────┘
```

### 4. Historial (`/history`)
```
┌────────────────────────────────────────┐
│  📜 Historial de Ejecuciones           │
├────────────────────────────────────────┤
│                                        │
│  ID    │ Task              │ Status   │
│ ───────┼───────────────────┼───────── │
│  #124  │ Fix auth bug      │ ✅ Done  │
│  #123  │ Implement JWT     │ ✅ Done  │
│  #122  │ Refactor utils    │ ❌ Fail  │
│  #121  │ Add tests         │ ✅ Done  │
│                                        │
│  [←] Anterior  [→] Siguiente  [Enter]  │
│                                        │
└────────────────────────────────────────┘
```

### 5. Detalle de Ejecución (`/execution/:id`)
```
┌────────────────────────────────────────┐
│  📄 Ejecución #123                     │
├────────────────────────────────────────┤
│  [📜 Log] [📊 Stats] [📝 Diff] [💾 Files]│
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Diff View                       │ │
│  │                                  │ │
│  │  src/auth/jwt.ts                 │ │
│  │  ─────────────────────────────   │ │
│  │  + import jwt from 'jsonwebtoken'│ │
│  │  +                              │ │
│  │  + export function sign...      │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [💾 Aplicar cambios] [🔄 Re-ejecutar] │
└────────────────────────────────────────┘
```

### 6. Configuración (`/settings`)
```
┌────────────────────────────────────────┐
│  ⚙️  Configuración                     │
├────────────────────────────────────────┤
│                                        │
│  General:                              │
│  ├─ Default Provider: [OpenCode   ▼]  │
│  ├─ Default Model:    [claude-3.5 ▼]  │
│  ├─ Theme:            [Dark       ▼]  │
│  └─ Auto-save:        [✓]             │
│                                        │
│  OpenCode:                             │
│  ├─ Host: localhost:3000               │
│  └─ Password: ********                 │
│                                        │
│  Shortcuts:                            │
│  ├─ New Task:     Ctrl+N               │
│  ├─ History:      Ctrl+H               │
│  └─ Quit:         Ctrl+Q               │
│                                        │
│           [ Guardar ]                  │
└────────────────────────────────────────┘
```

---

## 🧩 Componentes Reutilizables

### Layout Components
- `App` - Root component con routing
- `Layout` - Estructura base (header, sidebar, main, footer)
- `Sidebar` - Navegación lateral
- `Header` - Barra superior con status
- `Footer` - Atajos y ayuda

### UI Components
- `Box` - Contenedor estilizable
- `Text` - Texto con estilos
- `Button` - Botones interactivos
- `Input` - Campos de texto
- `Select` - Dropdowns
- `Table` - Tablas con navegación
- `Tabs` - Pestañas
- `ScrollView` - Scroll de contenido
- `ProgressBar` - Barra de progreso
- `Spinner` - Indicador de carga
- `Badge` - Etiquetas de estado

### Domain Components
- `ProviderSelect` - Selector de provider con iconos
- `ModelSelect` - Selector de modelo
- `TaskInput` - Input de tarea multiline
- `ExecutionCard` - Card de ejecución
- `DiffViewer` - Visualizador de diffs
- `LogViewer` - Visualizador de logs con scroll

---

## 🔄 Flujo de Datos

```typescript
// Estado global (zustand o similar)
interface AppState {
  // Configuración
  config: OpenFarmConfig;
  
  // Ejecución actual
  currentExecution: Execution | null;
  
  // Historial
  executions: Execution[];
  
  // UI State
  currentScreen: Screen;
  sidebarOpen: boolean;
  theme: Theme;
}

// Flujo de ejecución
1. User input → TaskInput
2. Submit → OpenFarm.execute()
3. Streaming → LogViewer (real-time)
4. Completion → ExecutionCard + DiffViewer
5. Save → Historial
```

---

## 📋 Checklist de Implementación

- [ ] Fase 1: Setup e Instalación
- [ ] Fase 2: Componentes Core
- [ ] Fase 3: Pantallas Principales
- [ ] Fase 4: Integración con OpenFarm
- [ ] Fase 5: Polish y Extras

---

## 🎨 Diseño y UX

### Principios
1. **Keyboard-first**: Todo se puede hacer con teclado
2. **Minimalista**: Solo información relevante
3. **Feedback inmediato**: Estados claros y loading states
4. **Consistente**: Patrones repetibles

### Color Palette (Dark Theme - Default)
```
Background:     #0d1117 (GitHub dark bg)
Surface:        #161b22 (Cards, panels)
Border:         #30363d (Borders)
Text Primary:   #c9d1d9 (Main text)
Text Secondary: #8b949e (Muted text)
Accent:         #58a6ff (Links, buttons)
Success:        #238636 (Success states)
Warning:        #d29922 (Warnings)
Error:          #da3633 (Errors)
Info:           #2f81f7 (Info)
```

### Keyboard Shortcuts Base
```
Ctrl+N        Nueva tarea
Ctrl+H        Historial
Ctrl+S        Settings
Ctrl+Q        Quit
Ctrl+C        Cancelar ejecución
Tab           Siguiente foco
Shift+Tab     Foco anterior
Enter         Confirmar
Esc           Volver/Cancelar
↑/↓           Navegar listas
```

---

## 📚 Referencias

- [OpenTUI Documentation](https://opentui.com/)
- [OpenTUI GitHub](https://github.com/anomalyco/opentui)
- Ink (alternativa): https://github.com/vadimdemedes/ink
- Blessed (alternativa): https://github.com/chjj/blessed

---

## 📝 Notas

- OpenTUI está en desarrollo activo, pueden haber breaking changes
- Considerar tener una versión CLI "legacy" sin TUI por si falla
- El TUI debe funcionar en: iTerm2, Terminal.app, Windows Terminal, VS Code terminal
