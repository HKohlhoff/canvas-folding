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

- Upgrade once from Canvas Folding 1.1.1 data. Confirm that settings and any
  persisted Canvas states remain intact and the Markdown-rendered update note
  opens once.
- Keep at least one persisted entry whose Canvas is closed or temporarily
  unavailable. Reload and update the plugin, then open and close **Manage
  persisted canvas states**. Confirm that the entry and its node state remain
  unchanged until an explicit remove action or actual Vault event occurs.
- With a non-empty state persisted, turn persistence off and change that Canvas
  to a different non-empty state. Turn persistence on again and confirm that
  the saved state returns. Repeat with a Canvas that has no saved state and
  confirm that its temporary folds are discarded in favor of the default
  expanded state.
- Close the note, verify that no release-note file is created in the Vault,
  then reload or restart Obsidian and confirm that it does not reopen.
- At the bottom of settings, choose **Show last update** and confirm that the
  same note opens again whenever requested.
- Choose **Show readme** beside it and confirm that the complete documentation
  opens as rendered Markdown, closes cleanly, creates no Vault file and does not
  load embedded README images or show image-placeholder notices. The Ko-fi
  support link remains visible and opens only after an explicit click; relative
  documentation links likewise open the repository only after a click.
- Confirm that removed display-only content leaves no repeated blank lines.
- Open **Manage persisted canvas states** with multiple same-named and numbered
  Canvases in different folders. Confirm the **Canvas**, **Path** and **Action**
  columns, default Canvas-name order, ascending/descending header clicks and
  correct per-row removal. Add enough entries to exceed the available height;
  confirm that only the list scrolls vertically, its column header remains
  visible and the explanation plus **Remove all** stay outside the scroll area.

For the separate release gate with Advanced Canvas enabled, use the focused
fixture, captured settings profile, and full matrix under
[`advanced-canvas/`](advanced-canvas/README.md). The baseline cases below still
start with Advanced Canvas disabled so regressions in standard Canvas remain
independently visible.

## Node-control theme test record

The current compact controls and their neutral highlight states passed the
maintained theme profile on all three Apple platforms:

| Date | Platform | Obsidian | Canvas Folding | Themes | Result |
| --- | --- | --- | --- | --- | --- |
| 2026-08-29 | macOS 26.6.2 | 1.13.7 | 1.1.1 | Default; Minimal 9.0.2; AnuPpuccin 1.5.0 | PASS |
| 2026-08-29 | iPadOS 26.6.1 | 1.13.7 | 1.1.1 | Default; Minimal 9.0.2; AnuPpuccin 1.5.0 | PASS |
| 2026-08-29 | iOS 26.6 | 1.13.7 | 1.1.1 | Default; Minimal 9.0.2; AnuPpuccin 1.5.0 | PASS |

The AnuPpuccin checks used Style Settings 1.0.9 and the maintained 114-setting
profile with its two associated snippets. Each pass covered circular and pill
geometry, compact dimensions, direct visibility, readable folded counts, and
neutral pointer or touch highlight states.

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
- Connect groups through directed edges. Verify that their folding controls are
  clickable, collapsing a parent hides the complete connected group branch,
  and every visible group has a working focus control.
- Put an unconnected node inside a connected child group. Collapsing the parent
  group must hide both the child group and that geometrically contained node.
- Put the child of a separate node branch inside that connected child group.
  Collapsing the separate node branch must hide its child but keep the group
  frame visible; collapsing the connected group parent must hide both.
- While that connected group parent is collapsed, confirm the separate visible
  parent keeps its folding control in place but disabled with **Branch hidden
  by folded group**. Expanding the group must restore the control without
  changing the separate branch's previous state.
- With Advanced Canvas active, collapse a group through Advanced Canvas and
  confirm both Canvas Folding controls disappear from its compact frame; expand
  it and confirm the controls return exactly once.
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
- Verify one-, two-, and three-digit hidden-item totals. Include a connected
  group with geometrically contained nodes: the folding control counts all
  hidden nodes and groups, while its tooltip reports both categories
  separately. The control grows leftward without covering or shrinking the
  focus control or node text.
- Collapse a parent and verify that only its folding count/`+` remains. Expand
  it and verify that its focus control returns. Repeat with the focus-control
  toolbar eye disabled; expanding must then leave the focus control hidden.
- Test Tab, Shift+Tab, Enter, Space, the context-menu key and all arrow
  keys on node controls and the toolbar handle.
- In a narrow split view, move and horizontally scroll the toolbar.
- On macOS, iPhone and iPad, open the same Canvas with Obsidian's default theme,
  Minimal and AnuPpuccin using the maintained test profile. Confirm that all
  enabled controls remain directly visible inside the upper-right corner before
  and after selection. Controls stay circular or pill-shaped as appropriate,
  compact and neutrally colored after clicking or tapping, and folded counts
  remain canvas-wide readable.
- With a selected node on iPhone and iPad, use both node controls and the
  corresponding selected-branch toolbar actions. Scroll the toolbar
  horizontally and move it by its drag handle.
- Toggle each toolbar eye twice and verify immediately that the corresponding
  branch or focus controls disappear, reappear and that the eye icon changes.
- Resize selected nodes from every border section. Verify that the inset
  Folding controls remain reachable, while clicking a control never starts a
  resize or move operation.
- With a node selected, open the complete native Canvas popup including all
  Advanced Canvas additions. The inset upper-right Folding controls must neither
  visually overlap nor intercept any popup action; repeat on a narrow node and
  near the top and bottom viewport boundaries.

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
