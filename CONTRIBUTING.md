# Contributing

## Development Setup

```bash
npm install
npm test
npm run build:prod
```

For local Obsidian testing, set `OBSIDIAN_PLUGINS_DIR` to a vault plugin directory and run:

```bash
npm run build:deploy
```

## Expectations

- Keep TypeScript strict and avoid unnecessary `any`.
- Prefer Obsidian APIs for vault data.
- Keep settings loading backward-compatible by normalizing against defaults.
- Add focused tests when adding non-trivial logic.
- Run `npm test` and `npm run build:prod` before preparing a release.

## Release Notes

Update `CHANGELOG.md` before publishing a release.
