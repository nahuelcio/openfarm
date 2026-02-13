# TUI Fix & Refactor Plan

## TL;DR

> **Quick Summary**: Fix critical TypeScript errors preventing TUI build, then refactor store architecture following existing review recommendations.
> 
> **Deliverables**:
> - TUI compiles without TypeScript errors
> - Store architecture split into domain-specific stores
> - DB persistence moved out of reducers
> - Test coverage maintained or improved
> 
> **Estimated Effort**: Large
> **Parallel Execution**: NO - sequential (Phase 1 must complete before Phase 2)
> **Critical Path**: Phase 1 (TS fixes) → Verify build → Phase 2 (Architecture refactor) → Verify TUI runs

---

## Context

### Original Request
User wants to fix "many problems with TUI" - specifically:
1. TypeScript errors blocking compilation
2. Architecture issues identified in prior review

### Interview Summary
**Key Discussions**:
- User wants BOTH TypeScript fixes AND architecture refactor in one plan
- User confirmed: "Fix + Refactor All" approach, "Full - Include Architecture" scope

**Research Findings**:
- `@openfarm/tui-opentui` path maps to `packages/sdk/src/tui/opentui/index.ts`
- That file only exports Box, render, Text, useApp, useInput, useStdin, useStdout, useStdoutDimensions
- Local hooks exist in `packages/sdk/src/tui/hooks/` but NOT re-exported
- Existing review (`tui-store-structure-review.md`) already documents architecture issues

### Metis Review
**Identified Gaps** (addressed):
- Scope creep risk: Locked to ONLY fix listed errors, no "while I'm here" improvements
- Missing rollback strategy: Each phase has checkpoint verification
- TypeScript vs runtime verification: Both included in criteria

**Guardrails Applied**:
- Split into TWO phases: Fix TS errors first, then architecture refactor
- Each file fix must run typecheck before moving on
- No new features, no component changes during store refactor

---

## Work Objectives

### Core Objective
Restore TUI to working state (compiles + runs) with improved maintainability (clean store architecture).

### Concrete Deliverables
- [ ] `bun run typecheck` passes with exit code 0
- [ ] `bun run dev` starts TUI without runtime errors
- [ ] `store.ts` split into domain-specific stores
- [ ] DB persistence moved to service layer

### Definition of Done
- [ ] `cd packages/sdk && bun run tsc --noEmit` exits with code 0
- [ ] `timeout 15s bun run dev` shows TUI rendering without crash
- [ ] All existing tests pass

### Must Have
- TypeScript compilation succeeds
- TUI renders in dev mode
- No regression in existing functionality

### Must NOT Have (Guardrails)
- New features or UI changes
- Changes outside `packages/sdk/src/tui/`
- "Improvements" to working code not requested
- Mixing phases in same commit

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (existing vitest suite)
- **Framework**: vitest

### Agent-Executed QA Scenarios (MANDATORY)

> All verification is executed by the agent using tools. No human intervention.

**Scenario: TypeScript compilation**
  Tool: Bash
  Preconditions: None
  Steps:
    1. cd packages/sdk
    2. bun run tsc --noEmit 2>&1
    3. Assert: exit code is 0
  Expected Result: No TypeScript errors
  Evidence: Full tsc output captured

**Scenario: TUI dev mode starts**
  Tool: interactive_bash (tmux)
  Preconditions: None
  Steps:
    1. cd packages/sdk
    2. timeout 15s bun run dev 2>&1 || true
    3. Assert: No "TypeError" or "Cannot find module" in output
    4. Assert: Process exits cleanly (not killed by timeout)
  Expected Result: TUI renders without crash
  Evidence: Terminal output captured

---

## Execution Strategy

### Phase Structure

```
Phase 1: Fix TypeScript Errors (BLOCKING - Must complete first)
├── Task 1.1: Fix useClipboard import issue
├── Task 1.2: Fix useInitialization issue  
├── Task 1.3: Fix CommandBlockData type
├── Task 1.4: Fix execSync import
├── Task 1.5: Fix header.tsx duplicate + config
├── Task 1.6: Fix React vs Ink types in file-preview.tsx
├── Task 1.7: Fix chat-store.ts streamFromMessages
└── Task 1.8: VERIFY - TypeScript compiles

Phase 2: Architecture Refactor (After Phase 1 verified)
├── Task 2.1: Extract ui-store (navigation, tabs, overlays)
├── Task 2.2: Extract execution-store (executions, currentExecution)
├── Task 2.3: Extract workflow-store
├── Task 2.4: Extract context-store
├── Task 2.5: Move DB persistence to services
└── Task 2.6: VERIFY - TUI runs correctly
```

### Parallel Execution
- **Phase 1**: NO parallel - sequential fixes (each may depend on previous)
- **Phase 2**: NO parallel - each store extraction builds on previous

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1.1 | None | 1.2-1.7 |
| 1.2 | 1.1 | 1.8 |
| 1.3 | 1.1 | 1.8 |
| 1.4 | 1.1 | 1.8 |
| 1.5 | 1.1 | 1.8 |
| 1.6 | 1.1 | 1.8 |
| 1.7 | 1.1 | 1.8 |
| 1.8 | 1.1-1.7 | Phase 2 |
| 2.1 | 1.8 | 2.2 |
| 2.2 | 2.1 | 2.3 |
| 2.3 | 2.2 | 2.4 |
| 2.4 | 2.3 | 2.5 |
| 2.5 | 2.4 | 2.6 |
| 2.6 | 2.5 | None (done) |

---

## TODOs

### PHASE 1: TypeScript Error Fixes

- [ ] 1.1 Fix useClipboard import issue

  **What to do**:
  - Option A: Export useClipboard from `opentui/index.ts` (re-export from hooks)
  - Option B: Change imports in affected files to import from local hooks
  - Files affected: `command-block.tsx` (chat + terminal)
  - Choose based on existing pattern consistency

  **Must NOT do**:
  - Don't change hook implementation - only export/import
  - Don't add new hooks

  **References**:
  - `packages/sdk/src/tui/hooks/use-clipboard.ts` - Hook implementation exists
  - `packages/sdk/src/tui/hooks/index.ts` - Local exports pattern
  - `packages/sdk/src/tui/opentui/index.ts` - Where to add export

  **Acceptance Criteria**:
  - [ ] Import path corrected in command-block.tsx files
  - [ ] bun run tsc --noEmit 2>&1 | grep -c "useClipboard" → 0 errors about useClipboard

- [ ] 1.2 Fix useInitialization issue

  **What to do**:
  - Determine: Is this supposed to exist OR dead code to remove?
  - Check where it's imported in `running-with-tracing.tsx`
  - Either create the hook (if needed) OR remove import + dead code

  **Must NOT do**:
  - Don't leave broken imports

  **References**:
  - `packages/sdk/src/tui/screens/running-with-tracing.tsx:21` - Import location
  - `packages/sdk/src/tui/hooks/` - Where hooks live

  **Acceptance Criteria**:
  - [ ] Either: hook created with minimal implementation
  - [ ] Or: import removed and code refactored to not need it
  - [ ] No "Cannot find name 'useInitialization'" error

- [ ] 1.3 Fix CommandBlockData type

  **What to do**:
  - Define the missing interface/type
  - Check what fields are used in command-block.tsx
  - Create minimal type definition

  **Must NOT do**:
  - Don't over-engineer the type

  **References**:
  - `packages/sdk/src/tui/components/chat/command-block.tsx:13-16` - Props using CommandBlockData

  **Acceptance Criteria**:
  - [ ] Type CommandBlockData defined
  - [ ] No "Cannot find name 'CommandBlockData'" error

- [ ] 1.4 Fix execSync import

  **What to do**:
  - Add `import { execSync } from 'child_process';` to command-block.tsx files

  **Must NOT do**:
  - Don't change the execution logic

  **References**:
  - `packages/sdk/src/tui/components/chat/command-block.tsx:50` - Usage
  - `packages/sdk/src/tui/components/terminal/command-block.tsx` - Also affected

  **Acceptance Criteria**:
  - [ ] execSync imported from 'child_process'
  - [ ] No "Cannot find name 'execSync'" error

- [ ] 1.5 Fix header.tsx duplicate + config

  **What to do**:
  - Analyze both Header definitions - determine which is correct for the use case
  - Remove duplicate (likely the second one with config)
  - Remove `config` usage if it's undefined

  **Must NOT do**:
  - Don't delete functionality that's actually used

  **References**:
  - `packages/sdk/src/tui/components/layout/header.tsx` - Both definitions visible

  **Acceptance Criteria**:
  - [ ] Only ONE Header component defined
  - [ ] No "Duplicate function implementation" error
  - [ ] No "Cannot find name 'config'" error

- [ ] 1.6 Fix React vs Ink types in file-preview.tsx

  **What to do**:
  - Fix type mismatch between ReactElement and InkElement
  - May need type assertion or different return type

  **References**:
  - `packages/sdk/src/tui/components/files/file-preview.tsx` - Errors at lines 116, 156, 179, 234

  **Acceptance Criteria**:
  - [ ] Type errors resolved
  - [ ] Component still renders correctly

- [ ] 1.7 Fix chat-store.ts streamFromMessages

  **What to do**:
  - Option A: Add stub method to AIService
  - Option B: Fix call site if method shouldn't exist
  - Determine which based on expected behavior

  **References**:
  - `packages/sdk/src/tui/store/chat-store.ts:402` - Call site
  - `packages/sdk/src/tui/services/ai-service.ts` - AIService definition

  **Acceptance Criteria**:
  - [ ] Method exists OR call site fixed
  - [ ] Type assignment errors resolved

- [ ] 1.8 VERIFY - TypeScript compiles

  **What to do**:
  - Run full typecheck
  - Verify exit code 0
  - Document any remaining warnings

  **Acceptance Criteria**:
  - [ ] bun run tsc --noEmit exits with code 0
  - [ ] Output contains "Found 0 errors"

---

### PHASE 2: Architecture Refactor

> **WARNING**: Only begin Phase 2 AFTER Phase 1 verified and stable.

- [ ] 2.1 Extract ui-store (navigation, tabs, overlays)

  **What to do**:
  - Create `packages/sdk/src/tui/store/ui-store.ts`
  - Move screen, activeTab, isTyping, overlay state from store.ts
  - Update imports in all consuming components
  - Keep store.ts as compat layer with deprecation warnings

  **Must NOT do**:
  - Don't change component logic - only import paths
  - Don't add new features

  **References**:
  - `packages/sdk/src/tui/store.ts` - Current monolithic store
  - `packages/sdk/src/tui/store/task-loop-store.ts` - Example of extracted store

  **Acceptance Criteria**:
  - [ ] New ui-store.ts exists with navigation state
  - [ ] Components import from new location
  - [ ] TypeScript still compiles
  - [ ] TUI still runs

- [ ] 2.2 Extract execution-store

  **What to do**:
  - Create `packages/sdk/src/tui/store/execution-store.ts`
  - Move executions, currentExecution, selectedExecutionForDiff from store.ts
  - Update all consumers

  **References**:
  - `packages/sdk/src/tui/store.ts` - Look for execution-related state

  **Acceptance Criteria**:
  - [ ] New execution-store.ts exists
  - [ ] All execution state moved
  - [ ] TUI still runs

- [ ] 2.3 Extract workflow-store

  **What to do**:
  - Create `packages/sdk/src/tui/store/workflow-store.ts`
  - Move workflows, currentWorkflow, editingStep, selectedWorkflowId

  **References**:
  - `packages/sdk/src/tui/store.ts` - Workflow state

  **Acceptance Criteria**:
  - [ ] New workflow-store.ts exists
  - [ ] TUI still runs

- [ ] 2.4 Extract context-store

  **What to do**:
  - Create `packages/sdk/src/tui/store/context-store.ts`
  - Move contextStatus, contextProvider, contextModel, contextProgress, contextResult, contextError
  - Move generatedContexts, currentContext, cachedContext

  **References**:
  - `packages/sdk/src/tui/store.ts` - Context state

  **Acceptance Criteria**:
  - [ ] New context-store.ts exists
  - [ ] TUI still runs

- [ ] 2.5 Move DB persistence to services

  **What to do**:
  - Identify addExecution, updateExecution in store.ts that call DB directly
  - Move persistence logic to service layer (e.g., execution-service.ts)
  - Store actions should ONLY update state, not persist

  **Must NOT do**:
  - Don't change what gets persisted - just WHERE it persists

  **References**:
  - `packages/sdk/src/tui/store.ts` - addExecution, updateExecution methods
  - `packages/sdk/src/tui/store/chat-store.ts` - Has DB integration pattern

  **Acceptance Criteria**:
  - [ ] Store actions are pure state updates
  - [ ] DB persistence happens in service layer
  - [ ] No regression in data persistence

- [ ] 2.6 VERIFY - TUI runs correctly

  **What to do**:
  - Run full typecheck
  - Run TUI in dev mode
  - Run existing tests

  **Acceptance Criteria**:
  - [ ] bun run tsc --noEmit exits with code 0
  - [ ] timeout 15s bun run dev → TUI renders
  - [ ] bun test packages/sdk/src/tui/ → tests pass

---

## Success Criteria

### Verification Commands
```bash
# Phase 1 complete
cd packages/sdk && bun run tsc --noEmit
# Expected: exit code 0, "Found 0 errors"

# Phase 2 complete  
cd packages/sdk && bun run tsc --noEmit && timeout 15s bun run dev
# Expected: Both pass
```

### Final Checklist
- [ ] All TypeScript errors fixed
- [ ] TUI compiles without errors
- [ ] TUI runs in dev mode
- [ ] Store architecture refactored per review
- [ ] DB persistence moved to services
- [ ] All tests pass
