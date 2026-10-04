export const CURRENT_RELEASE_NOTES_ID = "release-1.2.8";
export const CURRENT_RELEASE_NOTES_VERSION = "1.2.8";

export const CURRENT_RELEASE_NOTES_MARKDOWN = `# Canvas Folding ${CURRENT_RELEASE_NOTES_VERSION}: more efficient group controls

This maintenance update improves the performance of the group controls introduced in version 1.2.7.

## Highlights

- **More efficient styling:** group controls now use a targeted internal marker instead of a broad CSS relationship selector. This avoids unnecessary style recalculation on large or frequently changing canvases.
- **Unchanged appearance and behavior:** the \`−\`/\`+\` controls remain beside group names, and folded groups continue to hide their contents, frames, edges, and edge labels.
- **Unchanged Advanced Canvas hand-off:** when the Advanced Canvas plugin is active, Canvas Folding continues to disable its own group-folding mechanism and leaves group folding to Advanced Canvas.

No settings or workflows have changed in this update.

This update description appears automatically once. You can reopen it at any time with **Show last update** at the bottom of the Canvas Folding settings. Closing it leaves no note or other content file in your Vault.

If Canvas Folding makes your Canvas work easier and you would like to support its continued development, you can [buy me a coffee on Ko-fi](https://ko-fi.com/hokdev). Thank you!
`;
