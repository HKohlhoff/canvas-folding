# Canvas Folding V1 manual test collection

Copy this directory to
`Publizieren/Obsidian-Plugins/canvas-folding/V1-Test-Sammlung` in the test
vault. The file-node paths in `05-groups-and-node-types.canvas` use that
location.

Before a clean pass:

1. Disable Advanced Canvas and other plugins that modify Canvas DOM or events.
2. Enable Canvas Folding and reload Obsidian after deploying the current build.
3. Use **Manage persisted canvas states → Remove all** in the settings when a
   case requires a fresh state.
4. Record platform, Obsidian version and result next to each test case.

## Update note and plugin data

- Upgrade once from Canvas Folding 1.0.1 data. Confirm that settings and any
  persisted Canvas states remain intact and the Markdown-rendered update note
  opens once.
- Close the note, verify that no release-note file is created in the Vault,
  then reload or restart Obsidian and confirm that it does not reopen.
- At the bottom of settings, choose **Show last update** and confirm that the
  same note opens again whenever requested.

For the separate release gate with Advanced Canvas enabled, use the focused
fixture, captured settings profile, and full matrix under
[`advanced-canvas/`](advanced-canvas/README.md). The baseline cases below still
start with Advanced Canvas disabled so regressions in standard Canvas remain
independently visible.

## 01 – Basic tree

File: `01-basic-tree.canvas`

- Collapse `Root`: every descendant and incident edge disappears; `Root`
  remains with a folding control showing `3` hidden nodes.
- Expand `Root`: all nodes and the edge label `label` return.
- Open the control context menu on `Upper` and show one, then all, levels.
- Use **Show canvas through level…** for levels 0, 1 and 2.
- Verify depth-first node-control order: focus then folding on `Root`, focus
  then folding on `Upper`, focus on `Upper child`, focus on `Lower`, then the
  Canvas toolbar. Leaves have focus controls even though they have no folding
  control.
- Select `Upper` and verify that the node-control order rotates to start at
  its focus control. Keyboard navigation still visits each available control
  once before reaching the Canvas toolbar.
- Focus `Upper child`, then click its active focus control again. Only that
  leaf remains active during focus, and the complete Canvas returns afterward.
- While `Root` is collapsed, add a child and an edge. The selected new child
  stays visible for editing and folds after deselection.
- Delete and undo an edge; controls update without selecting a node first.

## 02 – Multiple roots and isolated node

File: `02-multiple-roots-and-isolated.canvas`

- **Collapse all branches** keeps `Root A`, `Root B` and `Isolated` visible.
- **Expand all branches** restores both trees; `Isolated` has a focus control
  but no folding control.
- Global levels use the shortest depth from either root.
- Focusing `Root A` dims the complete second tree and `Isolated`.

## 03 – Shared descendant

File: `03-shared-descendant.canvas`

- Collapse `Parent A`: `Shared` and `Shared child` stay visible through
  `Parent B`; only `Parent A → Shared` disappears. `Parent A` shows `+` and
  reports one hidden connection, while `Parent B` remains expanded.
- Expand `Parent A`: its direct connection to `Shared` returns without changing
  any node visibility.
- In `TestCanvas`, collapse `A1`: `A2` and the two `A1`/`A2` connections to
  `B2` disappear, while the complete `B1 → B2` branch remains visible. Expand
  `A1`, then collapse `B1`: only `B1 → B2` disappears.
- Collapse `Shared`, then collapse and expand `Parent A`. The connection at
  `Parent A` toggles independently while the nested collapse at `Shared` keeps
  `Shared child` hidden.

## 04 – Rootless cycle

File: `04-rootless-cycle.canvas`

- **Inspect active canvas graph** reports three nodes, three edges and no root.
- The toolbar action **Collapse all branches** is disabled because the graph
  has no rooted branch. Invoking the command-palette action instead reports
  that there are no rooted branches and leaves the complete Canvas visible.
- Collapse and expand each individual node; traversal remains finite.
- Tab through the controls; every control occurs once and focus does not loop
  inside the Canvas controls indefinitely.

## 05 – Groups and node types

File: `05-groups-and-node-types.canvas`

- Verify controls and folding for text, note, image and link nodes.
- Collapse `Root`: all contained nodes disappear and the non-empty group frame
  disappears with them.
- Focus `Root`: all contained nodes and the group frame remain active.
- Focus `Text`: its descendants and the group frame remain active; unrelated
  content is dimmed and cannot be selected.
- Add an empty group: it remains visible when nearby branches are collapsed.

## Cross-file and lifecycle matrix

Use `01-basic-tree.canvas` unless stated otherwise.

- Open the same Canvas in two leaves. Collapse and focus remain leaf-specific.
- Navigate to another file and back in one leaf. Session state returns.
- Close the leaf and reopen the Canvas with persistence disabled: default
  visibility returns.
- Repeat with persistence enabled: the saved state returns.
- Rename and delete a copied Canvas; stale saved entries are migrated or
  removed automatically.
- Disable and re-enable Canvas Folding with persistence disabled and enabled;
  no controls, classes or interaction handlers remain stale.
- Hide and show folding controls and focus controls independently from both the
  toolbar and command palette. Fold state and active focus must remain intact.
- Verify a one-, two-, and three-digit hidden-node count. The folding control
  grows leftward without covering or shrinking the focus control or node text.
- Test Tab, Shift+Tab, Enter, Space, the context-menu key and all arrow
  keys on node controls and the toolbar handle.
- In a narrow split view, move and horizontally scroll the toolbar.
- On iPhone and iPad, select nodes by short tap/stylus with the toolbar visible,
  use toolbar buttons, scroll it horizontally and operate branch controls.

## Command-palette audit

Run every command once in a Canvas and inspect it once with no Canvas active.
Commands must be unavailable in invalid context; if the context changes during
execution, they must show a useful Notice instead of throwing.

- Show current status
- Show canvas toolbar
- Hide canvas toolbar
- Toggle canvas toolbar
- Reset canvas toolbar position
- Show branch controls
- Hide branch controls
- Toggle branch controls
- Show focus controls
- Hide focus controls
- Toggle focus controls
- Inspect active canvas graph
- Collapse selected branch
- Expand selected branch
- Focus selected branch
- Exit branch focus
- Collapse all branches
- Expand all branches
- Show canvas through level…
