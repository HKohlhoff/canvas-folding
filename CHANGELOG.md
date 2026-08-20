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
- Accessible branch controls for Canvas nodes with directed descendants.
- Setting and commands to show, hide or toggle branch controls without modifying Canvas data.
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
