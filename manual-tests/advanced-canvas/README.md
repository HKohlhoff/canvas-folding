# Advanced Canvas compatibility matrix

This matrix verifies coexistence between Canvas Folding and Advanced Canvas.
It is a release gate, not a dependency declaration: Canvas Folding must remain
fully functional without Advanced Canvas and must never write folding state to
a `.canvas` file.

The focused fixture is derived from the `Adv.Canvas` branch of the development
`TestCanvas`. It contains no vault-specific paths and can be copied anywhere in
a test vault.

## Test record

Record one row for every complete run:

| Date | Platform | Obsidian | Canvas Folding | Advanced Canvas | Profile | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-08-25 | macOS 26.6.2 | 1.13.7 | 1.0.0 | 6.5.4 | reference | _open_ | Initial compatibility gate |
| _fill in_ | iPadOS | _fill in_ | 1.0.0 | _fill in_ | reference | _open_ | |
| _fill in_ | iOS | _fill in_ | 1.0.0 | _fill in_ | reference | _open_ | |

Use `PASS`, `FAIL`, or `N/A` for each case. A failure must include the fixture,
the exact settings delta, the action, and the observed result.

## Preparation

1. Use a dedicated test vault or make a recoverable backup.
2. Copy this directory into the vault and open
   `01-nested-groups-and-styles.canvas`.
3. Confirm the installed plugin versions and record them above.
4. Compare Advanced Canvas settings with
   `settings-profile-6.5.4.json`. The file is a reference snapshot; do not
   overwrite a live plugin `data.json` without making a backup.
5. In Canvas Folding, disable persistence and clear saved states before the
   first run. Repeat the persistence cases with persistence enabled later.
6. Reload Obsidian after changing a feature toggle that rebuilds Canvas DOM or
   runtime data.

The reference profile was captured from Advanced Canvas 6.5.4 on 2026-08-25.
Its behavior-relevant enabled features include node and edge styling, floating
edges, flip edge, auto resize, collapsible groups, focus mode, extended
commands, metadata compatibility, and edge selection.

## Fixture structure

`01-nested-groups-and-styles.canvas` contains:

- `Adv.Canvas root` → `C1` → three `C2` nodes;
- an outer group around the complete descendant branch;
- an inner group around all three `C2` nodes;
- Advanced Canvas node shapes `pill`, `predefined-process`, and `database`;
- `dynamicHeight` on every text node and Advanced edge metadata.

With both groups expanded, **Inspect active canvas graph** must report seven
nodes, four edges, and three roots. Only `Adv.Canvas root` and `C1` have Canvas
Folding branch controls; the geometrical group containers have no directed
children.

## A – Lifecycle and load order

- [x] **AC-A01 · Folding first:** Disable both plugins, enable Canvas Folding,
  then Advanced Canvas, and reload. One Folding toolbar and one control per
  eligible node appear; selection, moving, resizing, and edge creation work.
- [x] **AC-A02 · Advanced first:** Repeat with the reverse enable order. The
  result is identical.
- [x] **AC-A03 · Restart:** Restart Obsidian with both plugins enabled. No
  duplicate controls, stale classes, observers, notices, or console errors
  appear.
- [x] **AC-A04 · Disable Advanced:** Collapse the inner group with Advanced
  Canvas, then disable Advanced Canvas while Folding remains active. Standard
  Canvas renders the stored nodes normally and Folding controls remain usable.
  The already open view may retain Advanced Canvas' transient collapsed-group
  runtime and controls until the Canvas is closed and reopened; after that
  standard Canvas must render all stored nodes normally.
  **Verified:** With Folding persistence disabled, `C1` retains its `−` and
  reopening restores the three contained nodes and their edges in standard
  Canvas.
- [x] **AC-A05 · Re-enable Advanced:** Re-enable Advanced Canvas. Its group
  state returns without changing the Canvas Folding state.
- [x] **AC-A06 · Disable Folding:** With an Advanced group collapsed, disable
  and re-enable Canvas Folding. Advanced state and controls remain intact; no
  Folding DOM or interaction guard remains while Folding is disabled.

## B – Expanded and nested groups

Start with both Advanced groups expanded and Canvas Folding fully expanded.

- [ ] **AC-B01 · Folding outer branch:** Collapse `Adv.Canvas root`. All four
  descendants, four incident edges, and both non-empty group frames disappear.
  Expand it; Advanced shapes, sizes, edge metadata, and group frames return.
- [ ] **AC-B02 · Folding inner branch:** Collapse `C1`. The three `C2` nodes,
  their incident edges, and the inner group disappear. The outer group remains
  because it still contains visible `C1`. Expand `C1` to restore them.
- [ ] **AC-B03 · Advanced inner collapse:** Collapse `Advanced inner group`
  with Advanced Canvas. The three `C2` nodes and their edges disappear while
  the collapsed inner group and `C1` remain visible. `C1` keeps a `−` because
  its Folding branch is still open. Its Quickinfo explains that Advanced
  Canvas currently hides descendants. The level menu offers only depths that
  still contain Runtime-visible descendant nodes.
- [ ] **AC-B04 · Fold over collapsed inner group:** Click the `−` on `C1`.
  The collapsed inner group disappears. Click `+`; it returns still collapsed.
  Open it with the Advanced Canvas group control; all three shaped nodes and
  edges return and the special Folding Quickinfo disappears.
- [ ] **AC-B05 · Advanced outer collapse:** Collapse `Advanced outer group`.
  Only `Adv.Canvas root` and the collapsed outer group remain. The root keeps a
  `−` with the Advanced Canvas Quickinfo. Folding `−` hides the collapsed group;
  Folding `+` restores it still collapsed.
- [ ] **AC-B05a · Mixed visible children:** Add a second child to
  `Adv.Canvas root` outside both groups, then collapse the outer group. The
  Advanced Canvas Quickinfo remains present although the second child is still
  visible. The level menu omits depths represented only by group-hidden nodes.
- [ ] **AC-B06 · Nested persistence:** Collapse the inner group, then the outer
  group. Reopen the outer group and verify that the inner group is still
  collapsed. Repeat after closing and reopening the Canvas.
- [ ] **AC-B07 · Undo/redo:** Undo and redo each Advanced group collapse. The
  correct Folding Quickinfo and controls update without selecting a node.
- [ ] **AC-B08 · Preview while dragging:** Repeat dragging a node across a
  collapsed group with **Collapsed group preview on drag** enabled and disabled.
  Folding controls must not duplicate, move to another host, or intercept drag.
- [ ] **AC-B09 · Collapsible groups disabled:** Disable **Collapsible groups**
  and reload. The fixture behaves like standard Canvas; all Folding group rules
  and controls remain unchanged.

## C – Styling, resize, and node controls

- [ ] **AC-C01 · Node styling:** With **Node styling** enabled, exercise every
  shaped `C2` node. Folding controls, native connection handles, resize handles,
  and Advanced popup actions do not overlap or block one another.
- [ ] **AC-C02 · Styling toggle:** Disable and re-enable **Node styling** while
  a Folding branch is collapsed and after it is expanded. Folding state and
  control ownership remain stable.
- [ ] **AC-C03 · Auto resize:** With **Auto resize node** and its default
  enabled, add several lines to `C1` and to a shaped child. Controls follow the
  resized node. Collapse/expand and undo/redo retain the new geometry.
- [ ] **AC-C04 · Auto resize disabled:** Disable **Auto resize node**, resize
  the same nodes manually, and repeat folding. Behavior matches standard Canvas.
- [ ] **AC-C05 · Popup additions:** Enable **Z ordering controls**, **Aspect
  ratio control**, and the node-reference popup button one at a time. Every
  Advanced popup action remains clickable with Folding controls and toolbar
  visible.
- [ ] **AC-C06 · Variable breakpoint and text rendering:** Enable **Variable
  breakpoint** and **Alternative text rendering** separately. Zoom through the
  rendering breakpoint, edit text, and fold the branch without stale controls.

## D – Edges and live graph changes

- [ ] **AC-D01 · Styled edges:** Apply several Advanced path and arrow styles.
  Folding hides and restores the complete edge, arrow, interaction path, and
  label without losing its style.
- [ ] **AC-D02 · Floating edges:** Create floating edges with both creation
  options enabled, then with each disabled. Collapse/expand after every case;
  no endpoint or invisible interaction path remains active.
- [ ] **AC-D03 · Flip edge:** Flip `Adv.Canvas root → C1`. Folding graph
  direction, root controls, toolbar availability, and Quickinfos update live.
  Undo and redo the flip without selecting a node.
- [ ] **AC-D04 · Edge highlight:** Enable outgoing and incoming **Edge
  highlight** variants. Folding focus still dims and protects unrelated edges;
  collapse still hides highlighted edges completely.
- [ ] **AC-D05 · Edge selection:** Use all connected/incoming/outgoing edge
  selection actions. Collapse the selected branch; hidden or dimmed edges cannot
  open either plugin's edge toolbar.
- [ ] **AC-D06 · Auto file node edges:** On a copy of the mixed-node core
  fixture, enable **Auto file node edges**, create and remove a frontmatter
  connection, and verify live Folding controls plus undo/redo.

## E – Focus, navigation, and modes

- [ ] **AC-E01 · Folding focus:** Focus `C1` with Canvas Folding. Both group
  frames containing active descendants remain active; unrelated Advanced shapes
  and edges are dimmed and cannot be selected.
- [ ] **AC-E02 · Advanced focus:** Exit Folding focus, activate Advanced Canvas
  Focus Mode on `C1`, then fold and expand `C1`. Both visual effects clean up
  completely when their owning mode exits.
- [ ] **AC-E03 · Combined focus:** Activate the two focus modes in both orders.
  Exiting one must not clear or strand classes belonging to the other.
- [ ] **AC-E04 · Popup, pan, and zoom guards:** Test the fixture with **Disable
  node popup**, **Disable pan**, and **Disable zoom** individually enabled and
  disabled. Folding toolbar scrolling/dragging and branch controls remain usable.
- [ ] **AC-E05 · Better readonly:** Enable **Better readonly**, enter readonly
  mode, and verify the documented read-only actions. Leaving readonly restores
  normal selection and both plugins' controls without duplicates.
- [ ] **AC-E06 · Presentation:** Enable **Presentations**, create a temporary
  slide around the fixture, enter and exit presentation, and verify viewport,
  toolbar, controls, and folding state afterward.

## F – Structural Advanced Canvas features

Run these on disposable copies because they intentionally modify Canvas data.

- [ ] **AC-F01 · Encapsulation:** Enable **Canvas encapsulation**, encapsulate
  `C1` and its children, and confirm the resulting source and target Canvases
  can each be folded without stale IDs or controls.
- [ ] **AC-F02 · Portal:** Enable **Portals**, create an enabled portal to a
  copy of the basic-tree fixture, and fold source and portal branches. Disable
  and re-enable the portal and repeat with **Show edges into disabled portals**
  both ways.
- [ ] **AC-F03 · Metadata compatibility:** Toggle Canvas metadata compatibility
  and single-node links. Reload, edit, fold, and inspect the graph; Folding never
  changes the Advanced metadata fields.

## G – Core regression, persistence, API, and mobile

- [ ] **AC-G01 · Core fixtures:** With the reference profile active, complete
  every case in the parent `manual-tests/README.md`: basic tree, multiple roots,
  shared descendant, rootless cycle, mixed node types, lifecycle, commands,
  keyboard, and touch.
- [ ] **AC-G02 · Two leaves:** Open the Advanced fixture in two leaves. Advanced
  group state may be file-wide; Canvas Folding collapse/focus remains isolated
  per leaf and reconciles each re-render correctly.
- [ ] **AC-G03 · Persistence off:** Navigate away/back, close/reopen the tab,
  and restart with Folding persistence disabled. Advanced group state remains
  its own file state; closed Folding tab state does not return.
- [ ] **AC-G04 · Persistence on:** Repeat with Folding persistence enabled.
  Both independently owned states return and clearing Folding state does not
  expand Advanced groups.
- [ ] **AC-G05 · API v1:** Compare `getFoldState()` while groups are expanded,
  collapsed by Advanced Canvas, collapsed by Folding, and collapsed by both.
  The API reports only effective Canvas Folding state and never exposes
  `collapsedData` or private runtime objects.
- [ ] **AC-G06 · iPad and iPhone:** Repeat AC-B03 through AC-B05, node selection,
  toolbar tapping/scrolling/dragging, group controls, and focus on both devices.
  Short tap and stylus selection remain native.

## Settings coverage strategy

Do not test every possible Cartesian combination. Use these controlled passes:

| Tier | Settings | Required coverage |
| --- | --- | --- |
| 1 | Reference profile | Complete A–G once on macOS and the mobile subset on iPad/iPhone. |
| 2 | Collapsible groups, node/edge styling, auto resize, focus mode, floating edges, edge highlight/selection | Each feature enabled and disabled around its dedicated cases. |
| 3 | Popup/pan/zoom guards, variable breakpoint, alternative rendering, readonly, presentation | One isolated toggle pass each; restore the reference profile afterward. |
| 4 | Encapsulation, portals, auto file edges, metadata compatibility | Disposable structural test copies; verify live reconciliation and cleanup. |
| 5 | Default dimensions, grid, colors, clone margin, slide timing, path rounding | Smoke-test the captured values; vary only when a defect points to them. |

The compatibility claim may be changed to “works with Advanced Canvas enabled
without restrictions” only after every applicable required case passes. Record
unsupported platform features as `N/A`, not `PASS`, and state the tested plugin
versions in the public compatibility note.
