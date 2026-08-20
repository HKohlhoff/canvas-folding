# Changelog

All notable changes to this plugin should be documented in this file.

The format follows the spirit of Keep a Changelog, with the newest release first.

## [Unreleased]

### Added

- Canvas Tree project identity and local hot-reload deployment support.
- A read-only active Canvas adapter and graph diagnostics command.
- Pure graph analysis with focused unit tests for roots, cycles, isolated nodes and dangling edges.
- Cycle-safe descendant traversal for directed Canvas branches.
- Session-only collapsed-branch state and non-destructive Canvas visibility handling.
- Commands to collapse or expand a selected branch and expand all branches.
- A command to collapse every rooted branch while keeping root and isolated nodes visible.
- A level chooser for showing all rooted branches through a global canvas depth.
- Branch focus commands with an option to keep all ancestor paths visible.
- Accessible branch controls for Canvas nodes with directed descendants.
- Setting and commands to show, hide or toggle branch controls without modifying Canvas data.
- A branch-control context menu for absolute visibility through levels 1–5.
- Optional per-canvas state persistence in versioned plugin data.
- Automatic cleanup on Canvas deletion or rename plus manual cleanup actions.
- Plugin lifecycle and a settings tab with normalized defaults.
- Reproducible npm installs through `package-lock.json` and `npm ci` in CI.

### Changed

- Updated the baseline to Obsidian API 1.13, ESLint 10, TypeScript 6 and esbuild 0.28.
- Strengthened TypeScript compiler checks and ESLint coverage.
- Updated GitHub Actions to Node.js 22/24 and current action versions.
- Improved generated plugin documentation for Community Plugin review readiness.

### Fixed

- Hide edge labels together with collapsed Canvas branches.
- Place branch controls inside nodes to avoid standard Canvas edge and resize handles.
- Deselect hidden descendants and incident edges when collapsing a branch.
- Restore the session collapse state after returning to a Canvas in the same tab.
- Allow visible alternative parents to reveal a branch hidden by another collapse.
- Prevent standard Canvas connection and resize handles for hidden nodes.
- Wait for pointer release before opening the branch-depth context menu.
- Use the Canvas view file path as the persistence key for branch states.
