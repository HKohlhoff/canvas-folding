# Release Checklist

Use this checklist before publishing an Obsidian plugin release.

## Metadata

- `manifest.json` version is correct.
- The embedded update-note ID matches the plugin version so this release opens
  its note once, and `Last Update.md` contains the identical Markdown.
- Every user-facing feature release follows the shared update-note standard:
  open a transient Markdown view once after update, mark it as read only after
  it closes, create no Vault file, and keep **Show last update** at the bottom
  of settings. Apply the same standard when starting a new plugin.
- `versions.json` contains the same version and the correct minimum Obsidian version.
- `package.json` version, description, repository, license and author data are correct.
- `LICENSE` contains GPL v3 and `package.json` declares `GPL-3.0-or-later`.
- `build.mjs` uses the correct plugin ID.
- `npm run test:metadata` confirms plugin ID, versions, minimum Obsidian version and GPL metadata.

## Quality

```bash
npm ci
npm test
npm run build:prod
```

- Linting passes.
- TypeScript typecheck passes.
- Build creates `release/main.js`.
- `release/manifest.json` matches `manifest.json`.
- `release/styles.css` exists only if the plugin needs styles.

## Manual Obsidian Test

- Test in a real Obsidian vault.
- Enable and disable the plugin.
- Run all commands from the command palette.
- Check the settings tab and notices. Canvas Folding intentionally registers no ribbon icon.
- Upgrade once from the previous plugin data and confirm that the Markdown-
  rendered update description opens once, settings and persisted Canvas states
  survive, closing it creates no Vault file, and restart does not reopen it.
- Use **Show last update** at the bottom of settings and confirm that the same
  description can be reopened at any time.
- Verify desktop-only behavior if `isDesktopOnly` is `true`.

### Canvas Folding matrix

- Copy `manual-tests/` into the documented vault location and complete its V1 test matrix.
- Copy `examples/Canvas Folding Demo/` to the vault root, open the demo Canvas and follow every explanatory card once.
- Fold and expand branches containing text, file, image, link and group nodes.
- Connect multiple groups through directed edges and verify clickable folding
  and focus controls plus recursive collapse and expand for the group branch.
- Hide the only geometrically contained node through a separate branch and
  verify that a connected group frame remains visible until its own directed
  parent branch is collapsed.
- While all descendants of another visible node are hidden by that group,
  verify its folding control remains visible but disabled, explains why, and
  becomes active again without a latent state change after expanding the group.
- Check a simple tree, multiple roots, an isolated node, a shared descendant
  with multiple parents and a directed cycle. In `TestCanvas`, collapsing `A1`
  must hide `A2` and the two `A1`/`A2` connections to `B2` while keeping the
  complete `B1` branch visible; collapsing `B1` must hide only `B1 → B2` while
  `B2` and its descendants remain visible through `A1`.
- Add and delete nodes and edges; repeat both operations with undo and redo.
- Add a child to a collapsed branch: it remains visible while selected and folds after deselection.
- Open the same Canvas in two leaves and verify that controls, focus and visibility remain leaf-specific.
- Navigate away and back in one leaf, then close and reopen the leaf with persistence disabled and enabled.
- Open the persisted-state manager after saving a new state and after reopening
  the settings tab. Verify stale entries are cleaned, paths are sorted, one
  state and all states can be removed, and currently open tabs stay unchanged.
- Disable and re-enable Canvas Folding and verify that no managed classes, controls or interaction handlers remain stale.
- Focus a branch and verify that neither dimmed nodes nor dimmed edges can be selected or open Obsidian's item toolbar.
- Focus a branch whose descendants are inside a Canvas group and verify that the group frame remains active.
- Focus a Canvas group and verify that every geometrically contained item stays active while unrelated content is dimmed.
- Reach node controls in depth-first order, with focus before folding on each
  node and upper siblings first. Confirm that leaf nodes receive a focus
  control, a selected node starts the next pass, Enter/Space activates the
  control, and the context-menu key opens the levels menu only from folding.
- Hide and show folding and focus controls independently through the toolbar
  and command palette. Confirm that hidden controls do not change folded state
  or end active focus, and that the focus visibility action remains directly
  before the focus action in the toolbar.
- Check folded branches with one-, two-, and three-digit hidden-node counts;
  the folding control must grow without covering or shrinking the focus
  control or node content.
- Move the toolbar handle with every arrow key and verify that it remains inside a narrow Canvas view.
- On a touch device, tap Canvas nodes with the plugin toolbar visible, tap a branch control, drag the toolbar handle, horizontally scroll a narrow toolbar and check whether a long press opens the branch-level menu.
- Discover the plugin by ID `canvas-folding`, verify `api.apiVersion === 1`, and compare `getFoldState()` for an active leaf, a persisted closed Canvas and a path without applicable state.

### Advanced Canvas coexistence gate

Complete this gate before claiming unrestricted Advanced Canvas compatibility:

- Complete and record every applicable required case in
  `manual-tests/advanced-canvas/README.md` using its focused fixture and the
  captured reference settings profile.
- Record the tested Obsidian and Advanced Canvas versions.
- Enable both plugins in both load orders, then reload Obsidian and restart it once.
- Repeat the core folding matrix with text, file, image, link and group nodes, shared descendants and a cycle.
- Collapse and expand an Advanced Canvas group and confirm Canvas Folding's
  branch and focus controls are absent only while that group is collapsed.
- Fold a parent of a connected group containing an unconnected node and verify
  the contained node follows the hidden group.
- Verify node selection, editing, moving, resizing, connecting, creation, deletion, undo and redo with both plugins active.
- Check that branch controls, both toolbars, native handles and Advanced Canvas controls neither overlap incorrectly nor intercept unrelated pointer or touch input.
- Test toolbar tapping, dragging and horizontal scrolling, node selection and branch controls on desktop, iPad and iPhone where Advanced Canvas supports the device.
- Verify focus mode, group frames, hidden edges and edge labels, level views, live synchronization and the same Canvas in two leaves.
- Test persistence disabled and enabled, navigation away and back, tab closing and reopening, and plugin disable/re-enable in both orders.
- Confirm that no duplicate controls, stale classes, observers, event handlers or console errors remain after either plugin is disabled.
- Verify that `CanvasFoldingApi` v1 returns the same effective fold state with Advanced Canvas active.
- Update the README compatibility statement only after the complete matrix passes; otherwise document every observed limitation precisely.

## Repository Hygiene

- No `node_modules/`.
- No `.test-build/`.
- No `.DS_Store`.
- No local vault trash, generated analysis folders or temporary exports.
- `CHANGELOG.md` updated.
- README matches the current user-facing behavior.
- `Last Update.md` matches the transient in-plugin update description.
- README covers usage, limitations, privacy, support and license.

## Release Assets

For an Obsidian community plugin release, usually upload:

- `release/main.js`
- `release/manifest.json`
- `release/styles.css` if used
