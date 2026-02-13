# OpenFarm Desktop Migration Window (TUI Legacy)

Last updated: 2026-02-13

## Scope

This document defines the coexistence window between OpenFarm Desktop and the legacy TUI, and the final removal path for the default TUI entrypoint.

## Current Status

- Desktop is the recommended interface for all new workflows.
- TUI is legacy-only and opt-in:
  - CLI flag: `--legacy-tui`
  - Env var: `OPENFARM_ENABLE_LEGACY_TUI=1`

## Release Plan

1. Release N (current)
- Default TUI entrypoint is disabled unless opt-in is explicit.
- Docs point to Desktop-first usage.
- Legacy TUI receives critical fixes only.

2. Release N+1
- Keep opt-in TUI available for one additional release.
- Continue publishing migration notes and known gaps.

3. Release N+2
- Remove default legacy TUI entrypoint from primary CLI path.
- Keep migration notes archived in docs.

## Exit Criteria

- Workspace lifecycle parity validated in Desktop.
- Review/merge flow validated in Desktop (including reject/conflict paths).
- Scripts and run panel validated in Desktop.
- CI coverage for Desktop lint and backend tests enabled.
