# Changelog

All notable changes to this plugin should be documented in this file.

The format follows the spirit of Keep a Changelog, with the newest release first.

## [Unreleased]

### Added

- Canvas Folding project identity and local hot-reload deployment support.
- A read-only active Canvas adapter and graph diagnostics command.
- Pure graph analysis with focused unit tests for roots, cycles, isolated nodes and dangling edges.
- Cycle-safe descendant traversal for directed Canvas branches.
- Session-only collapsed-branch state and non-destructive Canvas visibility handling.
- Commands to collapse or expand a selected branch and expand all branches.
- A command to collapse every rooted branch while keeping root and isolated nodes visible.
- A level chooser for showing all rooted branches through a global canvas depth.
- Branch spotlight commands with configurable opacity for inactive canvas context.
- A responsive Canvas command toolbar with contextual action states and visibility commands.
- A draggable persisted toolbar position, focus toggle, matching +/− icons and visible graph inspection feedback.
- Accessible branch controls for Canvas nodes with directed descendants.
- Setting and commands to show, hide or toggle branch controls without modifying Canvas data.
- A branch-control context menu for absolute visibility through levels 1–5.
- Optional per-canvas state persistence in versioned plugin data.
- Automatic cleanup on Canvas deletion or rename plus manual cleanup actions.
- Plugin lifecycle and a settings tab with normalized defaults.
- Reproducible npm installs through `package-lock.json` and `npm ci` in CI.

### Changed

- Improve branch-control and toolbar keyboard behavior, menu semantics and accessible labels.
- Renamed the plugin and its technical ID from Canvas Tree (`canvas-tree`) to Canvas Folding (`canvas-folding`).
- Separated neutral graph types and edge-visibility rules from the Obsidian adapter and DOM integration in preparation for a shared Canvas Core.
- Keep controls, toolbar actions and folding visibility synchronized after live Canvas structure, selection and render changes.
- Keep a newly inserted selected node visible for editing until it is deselected, and use eye icons for the branch-control toggle.
- Hide a non-empty Canvas group when all nodes fully contained by it are hidden by folding.
- Updated the baseline to Obsidian API 1.13, ESLint 10, TypeScript 6 and esbuild 0.28.
- Strengthened TypeScript compiler checks and ESLint coverage.
- Updated GitHub Actions to Node.js 22/24 and current action versions.
- Improved generated plugin documentation for Community Plugin review readiness.

### Fixed

- Preserve keyboard focus after Canvas Folding actions, use depth-first branch-control order with a selected-parent entry point and handle Space explicitly in the toolbar.
- Count automatically hidden Canvas groups correctly in the status summary.
- Hide edge labels together with collapsed Canvas branches.
- Place branch controls inside nodes to avoid standard Canvas edge and resize handles.
- Deselect hidden descendants and incident edges when collapsing a branch.
- Restore the session collapse state after returning to a Canvas in the same tab.
- Allow visible alternative parents to reveal a branch hidden by another collapse.
- Prevent standard Canvas connection and resize handles for hidden nodes.
- Wait for pointer release before opening the branch-depth context menu.
- Use the Canvas view file path as the persistence key for branch states.
