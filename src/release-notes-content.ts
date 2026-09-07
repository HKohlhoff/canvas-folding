export const CURRENT_RELEASE_NOTES_ID = "release-1.2.5";
export const CURRENT_RELEASE_NOTES_VERSION = "1.2.5";

export const CURRENT_RELEASE_NOTES_MARKDOWN = `# Canvas Folding ${CURRENT_RELEASE_NOTES_VERSION}: safer state and cleaner lifecycle

This maintenance update strengthens data safety, cleans up closed Canvas tabs more reliably, and keeps the toolbar reachable after layout changes.

## Highlights

- **Safer saved states:** queued saves, failed writes, and rapid manager actions can no longer leave a successful later save with an outdated intermediate state.
- **Protected downgrades:** if plugin data belongs to a newer Canvas Folding version, this version leaves it untouched and clearly marks settings and saved states as read-only.
- **Complete tab cleanup:** closing one Canvas tab removes its controls, toolbar, visibility classes, and interaction references while other Canvas tabs continue normally.
- **Reachable toolbar:** restored toolbar positions are kept inside the current Canvas after a window resize, split-layout change, or move to a smaller device.
- **Safer state management:** **Remove all** now requires confirmation, and the saved-state table exposes clearer structure to assistive technology.
- **Stronger release safeguards:** builds, test-vault deployment, version tags, and release artifacts receive additional consistency checks.
- **Stable integration:** Canvas files remain untouched, and the public Canvas Folding API remains at version 1.

## Using the update

1. Update Canvas Folding and continue using existing Canvas files and saved states normally.
2. If you resize or split a Canvas view, the floating toolbar now remains within the visible Canvas area.
3. Open **Manage persisted canvas states** to remove individual entries or use the confirmed **Remove all** action.
4. If a newer plugin-data format is detected after a downgrade, update Canvas Folding again before changing settings or saved states.

Canvas Folding still changes only the current view. It never writes folding data into your Canvas files.

This update description appears automatically once. You can reopen it at any time with **Show last update** at the bottom of the Canvas Folding settings. Closing it leaves no note or other content file in your Vault.

If Canvas Folding makes your Canvas work easier and you would like to support its continued development, you can [buy me a coffee on Ko-fi](https://ko-fi.com/hokdev). Thank you!
`;
