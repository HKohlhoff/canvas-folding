export const CURRENT_RELEASE_NOTES_ID = "release-1.2.9";
export const CURRENT_RELEASE_NOTES_VERSION = "1.2.9";

export const CURRENT_RELEASE_NOTES_MARKDOWN = `# Canvas Folding ${CURRENT_RELEASE_NOTES_VERSION}: compatibility maintenance

This maintenance update refreshes the development and build dependencies used to validate Canvas Folding with Obsidian API 1.14. The plugin's folding behavior, stored Canvas states, mobile support, and public API v1 remain unchanged.

## What was verified

- Branch and group folding continue to work with Canvas HTML Exporter package and single-HTML exports.
- Focus, level views, group controls, and persisted states retain their existing behavior.
- Canvas Folding remains compatible with Obsidian 1.13 and later; the newer API package is used only for development and build validation.
- The production plugin remains local, mobile-compatible, and free of network behavior.

No setting changes or migrations are required. Existing Canvas files and persisted folding states are preserved.

This update description appears automatically once. You can reopen it at any time with **Show last update** at the bottom of the Canvas Folding settings. Closing it leaves no note or other content file in your Vault.

If Canvas Folding makes your Canvas work easier and you would like to support its continued development, you can [buy me a coffee on Ko-fi](https://ko-fi.com/hokdev). Thank you!
`;
