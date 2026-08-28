# Changelog

All notable changes to this plugin should be documented in this file.

The format follows the spirit of Keep a Changelog, with the newest release first.

## [Unreleased]

### Added

- Add a focus control to every visible node and group, including leaf items,
  and allow it to toggle focus directly.
- Add independent settings, commands, and Canvas-toolbar actions for showing
  or hiding folding and focus controls without changing the current view state.
- Add a transient one-time update description, a reusable **Show last update**
  settings action, and the matching repository document `Last Update.md`.

### Changed

- Replace the plus sign on a folded branch with its number of hidden content
  nodes and let the control grow for multi-digit counts.
- Keep focus and folding controls in one shared per-node control row with a
  consistent visual and keyboard order.
- Group the focus-control visibility action directly before the focus action
  in the Canvas toolbar.
- Keep shared descendants visible while another open parent branch still
  reaches them, hiding only exclusive descendants and the collapsed branch
  connections.
- Treat groups connected by directed edges like regular folding nodes,
  including clickable folding controls and recursive group branches.

## [1.0.1]

### Changed

- Align the plugin description with the Community Directory manifest rules.
- Produce the standard root `main.js` during builds while retaining the
  existing synchronized release artifacts in `release/`.
- Replace CSS `!important` overrides with Canvas-scoped selectors of sufficient
  specificity.

## [1.0.0] – release candidate

### Added

- A documented, self-contained demo Canvas with local note and image nodes.
- A versioned optional `CanvasFoldingApi` v1 that exposes effective hidden node and edge IDs through the `canvas-folding` plugin instance.
- A versioned manual V1 test collection with focused Canvas fixtures and an explicit command, lifecycle, keyboard and touch matrix.
- A dedicated Advanced Canvas coexistence matrix, reproducible settings profile, and nested-group/style fixture.
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

### Changed

- Expand the README with a prominent Advanced Canvas coexistence summary and
  visual guides for branch folding, the level menu, focus mode, and the Canvas
  toolbar.
- Clarify that persisted states are device-local unless an external sync setup
  also synchronizes Canvas Folding's plugin data.
- Point users to the `+`/`−` control tooltips, including the additional
  Advanced Canvas collapsed-group explanation and its touch equivalent.
- Add a quick start, define global Canvas levels, streamline repeated
  compatibility text, and place installation before the demo.
- Expose the Ko-fi support link through Obsidian's official `fundingUrl` field
  and make the default `build` script reproducibly generate production output.
- Show the Advanced Canvas collapsed-group explanation in the branch menu so
  it remains available on touch devices without hover.
- Replace the separate persisted-state cleanup actions with a manager that
  lists stored Canvas paths and removes individual or all restoration states.
- Updated the public demo from its reviewed Vault layout while retaining portable local asset paths.
- Reordered the Behavior settings and added a prominent reminder that Canvas Folding never modifies Canvas files.
- Prepared the public documentation and package metadata for a first release under GPL-3.0-or-later, with support and demo instructions.
- A draggable persisted toolbar position, focus toggle, matching +/− icons and visible graph inspection feedback.
- Accessible branch controls for Canvas nodes with directed descendants.
- Setting and commands to show, hide or toggle branch controls without modifying Canvas data.
- A branch-control context menu for absolute visibility through levels 1–5.
- Optional per-canvas state persistence in versioned plugin data.
- Automatic cleanup on Canvas deletion or rename plus manual cleanup actions.
- Plugin lifecycle and a settings tab with normalized defaults.
- Reproducible npm installs through `package-lock.json` and `npm ci` in CI.

- Improve branch-control and toolbar keyboard behavior, menu semantics and accessible labels.
- Standardized the plugin name and technical ID as Canvas Folding (`canvas-folding`) across code, packaging and documentation.
- Separated neutral graph types and edge-visibility rules from the Obsidian adapter and DOM integration while keeping Canvas Folding independently deployable.
- Keep controls, toolbar actions and folding visibility synchronized after live Canvas structure, selection and render changes.
- Keep a newly inserted selected node visible for editing until it is deselected, and use eye icons for the branch-control toggle.
- Hide a non-empty Canvas group when all nodes fully contained by it are hidden by folding.
- Updated the baseline to Obsidian API 1.13, ESLint 10, TypeScript 6 and esbuild 0.28.
- Strengthened TypeScript compiler checks and ESLint coverage.
- Updated GitHub Actions to Node.js 22/24 and current action versions.
- Improved generated plugin documentation for Community Plugin review readiness.

### Fixed

- Keep connected branch controls and the Canvas toolbar visible while keyboard
  focus moves through Obsidian's native tab controls, while still pruning UI
  belonging to genuinely detached Canvas views.
- Hide an opened Advanced Canvas portal's virtual nodes, internal edges and
  labels together with its folded portal file node, while keeping the portal's
  read-only contents free of Folding controls.
- Recognize nodes and edges retained in a collapsed Advanced Canvas group after
  Advanced Canvas is disabled, keeping Folding controls stable so standard
  Canvas restores the complete group when the file is reopened.
- Explain Folding branches with any descendants hidden inside collapsed Advanced Canvas groups in one consistent Obsidian tooltip, and omit runtime-empty depths from their level menus without changing external group state.
- Preserve persisted folding state when Obsidian briefly exposes an empty Canvas runtime during view opening.
- Remove the retired Shift+F10 branch-menu shortcut and its tooltip hint while retaining the context-menu key.
- Keep a Canvas group active during branch focus when it geometrically contains an active focused node.
- Ignore Obsidian's transient `mobile-tap` class in live synchronization so a visible toolbar is not rebuilt during native node selection.
- Block the transparent Canvas edge interaction path while an edge is dimmed or hidden.
- Preserve native tap and stylus node selection in mobile Obsidian by limiting the private Canvas interaction-layer guard to desktop mode.
- Keep a narrow toolbar horizontally touch-scrollable, isolate its pointer sequence from underlying Canvas nodes and enlarge branch controls for coarse pointers.
- Keep Obsidian's native Canvas controls in a dedicated compositing layer above node content on iOS.
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
