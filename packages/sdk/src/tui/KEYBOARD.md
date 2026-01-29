# TUI Keyboard Navigation Guide

## 🎯 Quick Actions (Dashboard)

| Key | Action |
|-----|--------|
| **1** | New Task |
| **2** | History |
| **3** | Settings |
| **Ctrl+N** | New Task (global) |
| **Ctrl+H** | History (global) |
| **Ctrl+Q** | Quit |

## 📝 Form Navigation (Execute Screen)

### Step 1: Select Provider
- **↑/↓** - Navigate providers
- **Enter** - Select provider
- **Tab** - Go to task input

### Step 2: Describe Task
- **Tab** - Go to actions

### Step 3: Actions
- **↑/↓** - Switch between Execute/Cancel
- **Enter** - Activate button
- **Esc** - Cancel

### Any Step
- **Tab** - Next field
- **Shift+Tab** - Previous field
- **Esc** - Cancel

## 📜 Navigation Patterns

### Tab Navigation
```
[Provider 1] → [Provider 2] → ... → [Task Input] → [Execute] → [Cancel]
     ↑↓               ↑↓                              ↑↓
   Select         Select                           Select
```

### Arrow Keys
- **↑/↓** - Navigate within current section
- **←/→** - Not used (reserved for future)

## 🎨 Visual Indicators

### Focus State (Yellow Border)
When an item is focused with Tab/Arrows:
```
┌──────────────────┐
│ [Provider 1]     │  ← Normal
└──────────────────┘
╔══════════════════╗
║ [Provider 2]     ║  ← Focused (double border, yellow)
╚══════════════════╝
```

### Selected State
```
┌──────────────────┐
│ ● OpenCode       │  ← Selected (filled circle)
│ ○ Claude Code    │  ← Not selected (empty circle)
└──────────────────┘
```

## 📋 Screen-Specific Shortcuts

### Dashboard
- `1` - New Task
- `2` - History  
- `3` - Settings

### Execute
- `Tab` - Next field
- `↑/↓` - Navigate items
- `Enter` - Select/Confirm
- `Esc` - Cancel

### Executing
- `Esc` - Cancel execution

### History / Detail
- `↑/↓` - Navigate items
- `Enter` - Open item
- `Esc` - Go back

### Settings
- `Tab` - Next option
- `Enter` - Select
- `Esc` - Back to dashboard

## 💡 Pro Tips

1. **Start with numbers**: On Dashboard, just press `1` to create task
2. **Tab through forms**: In Execute, keep pressing Tab to move forward
3. **Escape always works**: Press Esc anytime to go back or cancel
4. **Watch the footer**: Bottom bar shows shortcuts for current screen

## 🚫 Not Supported (Yet)

- Mouse hover effects (OpenTUI limitation)
- Shift+Tab (might work, not fully tested)
- Page Up/Down for scrolling
- Search/filter in lists
