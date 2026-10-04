export const CURRENT_RELEASE_NOTES_ID = "release-1.2.7";
export const CURRENT_RELEASE_NOTES_VERSION = "1.2.7";

export const CURRENT_RELEASE_NOTES_MARKDOWN = `# Canvas Folding ${CURRENT_RELEASE_NOTES_VERSION}: fold Canvas groups

This update adds independent folding for every standard Canvas group, including empty and nested groups.

## Highlights

- **Group controls beside the name:** each group receives its own framed \`−\`/\`+\` control directly to the right of the group name.
- **Complete group folding:** collapsing a group hides its frame, every fully contained node and subgroup, and their edges and edge labels. External connections remain attached to the compact group header.
- **Independent folding states:** group folds and directed branch folds remain separate. **Expand all branches** opens both.
- **Careful Advanced Canvas hand-off:** whenever Advanced Canvas supplies its own group control, it keeps priority. Enabling or disabling it does not leave duplicate switches, missing content, or stale edge geometry behind.
- **Desktop and mobile:** the group controls and edge handling were verified on desktop and iPadOS.

The Advanced Canvas hand-off looks deliberately simple in the interface, but it requires substantial internal coordination because the two plugins use different group-state and rendering models. Canvas Folding handles that compatibility without depending on Advanced Canvas or changing its code.

## Using the update

1. Click or tap the \`−\` beside a group name to collapse the group.
2. Use the remaining \`+\` to expand it again.
3. Use **Expand all branches** to open every Canvas Folding branch and group at once.

Canvas Folding stores its own branch, group, and focus states outside Canvas files. When control returns from an Advanced Canvas group that was collapsed while Advanced Canvas was active, Canvas Folding may normalize that external collapsed representation once so all original group content remains available.

This update description appears automatically once. You can reopen it at any time with **Show last update** at the bottom of the Canvas Folding settings. Closing it leaves no note or other content file in your Vault.

If Canvas Folding makes your Canvas work easier and you would like to support its continued development, you can [buy me a coffee on Ko-fi](https://ko-fi.com/hokdev). Thank you!
`;
