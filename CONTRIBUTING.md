# Contributing

## Development Setup

```bash
npm ci
npm test
npm run build:prod
```

For local Obsidian testing, set `OBSIDIAN_PLUGINS_DIR` to a vault plugin directory and run:

```bash
npm run build:deploy
```

Feature work belongs on a `feature/*` branch. Do not merge, tag, push, or
publish until the intended test matrix has passed and the release has been
explicitly approved.

## Expectations

- Keep TypeScript strict and avoid unnecessary `any`.
- Prefer Obsidian APIs for vault data.
- Keep settings loading backward-compatible by normalizing against defaults.
- Add focused tests when adding non-trivial logic.
- Keep graph/state logic independent from Obsidian and DOM code where
  practical; keep Canvas view integration in the adapter/UI layers.
- Preserve Canvas data and unknown fields. Folding changes the view and its
  own versioned plugin data, never the source `.canvas` file.
- Keep the public API versioned and limited to documented plain data. Changes
  to `src/api.ts` must remain compatible with [`docs/api.md`](docs/api.md).
- Run `npm test` and `npm run build:prod` before preparing a release.

## Release Notes

Update `CHANGELOG.md`, `README.md`, `Last Update.md`, the matching transient
update note, and [`docs/release-checklist.md`](docs/release-checklist.md) before
publishing a user-facing release.
