# Release Checklist

Use this checklist before publishing an Obsidian plugin release.

## Metadata

- `manifest.json` version is correct.
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
- Verify desktop-only behavior if `isDesktopOnly` is `true`.

### Canvas Folding matrix

- Copy `manual-tests/` into the documented vault location and complete its V1 test matrix.
- Copy `examples/Canvas Folding Demo/` to the vault root, open the demo Canvas and follow every explanatory card once.
- Fold and expand branches containing text, file, image, link and group nodes.
- Check a simple tree, multiple roots, an isolated node, a shared descendant with multiple parents and a directed cycle.
- Add and delete nodes and edges; repeat both operations with undo and redo.
- Add a child to a collapsed branch: it remains visible while selected and folds after deselection.
- Open the same Canvas in two leaves and verify that controls, focus and visibility remain leaf-specific.
- Navigate away and back in one leaf, then close and reopen the leaf with persistence disabled and enabled.
- Disable and re-enable Canvas Folding and verify that no managed classes, controls or interaction handlers remain stale.
- Focus a branch and verify that neither dimmed nodes nor dimmed edges can be selected or open Obsidian's item toolbar.
- Focus a branch whose descendants are inside a Canvas group and verify that the group frame remains active.
- Reach branch controls in depth-first order, with upper siblings first. Select a parent and verify that the next pass starts at its control. Use Enter/Space to toggle and the context-menu key to open the levels menu. Verify focus remains on the invoked function.
- Move the toolbar handle with every arrow key and verify that it remains inside a narrow Canvas view.
- On a touch device, tap Canvas nodes with the plugin toolbar visible, tap a branch control, drag the toolbar handle, horizontally scroll a narrow toolbar and check whether a long press opens the branch-level menu.
- Discover the plugin by ID `canvas-folding`, verify `api.apiVersion === 1`, and compare `getFoldState()` for an active leaf, a persisted closed Canvas and a path without applicable state.

### Advanced Canvas coexistence gate

Complete this gate before claiming unrestricted Advanced Canvas compatibility:

- Record the tested Obsidian and Advanced Canvas versions.
- Enable both plugins in both load orders, then reload Obsidian and restart it once.
- Repeat the core folding matrix with text, file, image, link and group nodes, shared descendants and a cycle.
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
- README covers usage, limitations, privacy, support and license.

## Release Assets

For an Obsidian community plugin release, usually upload:

- `release/main.js`
- `release/manifest.json`
- `release/styles.css` if used
