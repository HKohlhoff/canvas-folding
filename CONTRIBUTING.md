# Contributing

## Development Setup

```bash
npm ci
npm test
npm run build:prod
```

For a local runtime test, explicitly set `OBSIDIAN_PLUGINS_DIR` to the target
vault's `.obsidian/plugins` directory and deploy the production candidate:

```bash
OBSIDIAN_PLUGINS_DIR="/path/to/TestVault/.obsidian/plugins" npm run deploy:test-vault
```

The command refuses incomplete or stale release artifacts and preserves other
enabled community plugins and existing app configuration in the target vault.
Use another Vault only when a specific test explicitly requires it.

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
