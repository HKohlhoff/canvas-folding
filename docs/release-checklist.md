# Release Checklist

Use this checklist before publishing an Obsidian plugin release.

## Metadata

- `manifest.json` version is correct.
- `versions.json` contains the same version and the correct minimum Obsidian version.
- `package.json` version, description, repository, license and author data are correct.
- `build.mjs` uses the correct plugin ID.

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
- Check ribbon icons, settings tabs and notices if used.
- Verify desktop-only behavior if `isDesktopOnly` is `true`.

### Canvas Folding matrix

- Copy `manual-tests/` into the documented vault location and complete its V1 test matrix.
- Fold and expand branches containing text, file, image, link and group nodes.
- Check a simple tree, multiple roots, an isolated node, a shared descendant with multiple parents and a directed cycle.
- Add and delete nodes and edges; repeat both operations with undo and redo.
- Add a child to a collapsed branch: it remains visible while selected and folds after deselection.
- Open the same Canvas in two leaves and verify that controls, focus and visibility remain leaf-specific.
- Navigate away and back in one leaf, then close and reopen the leaf with persistence disabled and enabled.
- Disable and re-enable Canvas Folding and verify that no managed classes, controls or interaction handlers remain stale.
- Focus a branch and verify that neither dimmed nodes nor dimmed edges can be selected or open Obsidian's item toolbar.
- Focus a branch whose descendants are inside a Canvas group and verify that the group frame remains active.
- Reach branch controls in depth-first order, with upper siblings first. Select a parent and verify that the next pass starts at its control. Use Enter/Space to toggle and Shift+F10 or the context-menu key to open the levels menu. Verify focus remains on the invoked function.
- Move the toolbar handle with every arrow key and verify that it remains inside a narrow Canvas view.
- On a touch device, tap Canvas nodes with the plugin toolbar visible, tap a branch control, drag the toolbar handle, horizontally scroll a narrow toolbar and check whether a long press opens the branch-level menu.

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
