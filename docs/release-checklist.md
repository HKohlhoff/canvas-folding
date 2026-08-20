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
