# Canvas Folding V1 manual test collection

Copy this directory to
`Publizieren/Obsidian-Plugins/canvas-folding/V1-Test-Sammlung` in the test
vault. The file-node paths in `05-groups-and-node-types.canvas` use that
location.

Before a clean pass:

1. Disable Advanced Canvas and other plugins that modify Canvas DOM or events.
2. Enable Canvas Folding and reload Obsidian after deploying the current build.
3. Use **Clear all saved canvas states** in the settings when a case requires a
   fresh state.
4. Record platform, Obsidian version and result next to each test case.

## 01 – Basic tree

File: `01-basic-tree.canvas`

- Collapse `Root`: every descendant and incident edge disappears; `Root`
  remains with a `+` control.
- Expand `Root`: all nodes and the edge label `label` return.
- Open the control context menu on `Upper` and show one, then all, levels.
- Use **Show canvas through level…** for levels 0, 1 and 2.
- Verify depth-first control order: `Root`, `Upper`, `Upper child`, `Lower`.
- While `Root` is collapsed, add a child and an edge. The selected new child
  stays visible for editing and folds after deselection.
- Delete and undo an edge; controls update without selecting a node first.

## 02 – Multiple roots and isolated node

File: `02-multiple-roots-and-isolated.canvas`

- **Collapse all branches** keeps `Root A`, `Root B` and `Isolated` visible.
- **Expand all branches** restores both trees; `Isolated` never receives a
  branch control.
- Global levels use the shortest depth from either root.
- Focusing `Root A` dims the complete second tree and `Isolated`.

## 03 – Shared descendant

File: `03-shared-descendant.canvas`

- Collapse `Parent A`: `Shared` remains visible through `Parent B`; only the
  hidden incoming path disappears.
- Collapse `Parent B` as well: `Shared` and `Shared child` disappear.
- The visible alternative parent receives `+` whenever it can reveal the
  shared branch without revealing the other parent.
- Expand in both orders and verify that nested collapse state remains intact.

## 04 – Rootless cycle

File: `04-rootless-cycle.canvas`

- **Inspect active canvas graph** reports three nodes, three edges and no root.
- **Collapse all branches** does not hide the entire Canvas.
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
- Test Tab, Shift+Tab, Enter, Space, context-menu key, Shift+F10 and all arrow
  keys on branch controls and the toolbar handle.
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
- Inspect active canvas graph
- Collapse selected branch
- Expand selected branch
- Focus selected branch
- Exit branch focus
- Collapse all branches
- Expand all branches
- Show canvas through level…
