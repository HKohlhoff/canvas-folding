export const CURRENT_RELEASE_NOTES_ID = "release-1.2.1";

export const CURRENT_RELEASE_NOTES_MARKDOWN = `# Canvas Folding 1.2.1: compact controls and clearer counts

This update makes Canvas Folding controls more reliable across themes and touch devices, gives card content more room, and makes saved states and documentation easier to access.

## Highlights

- **Theme-stable compact controls:** folding and focus controls keep the same circular or pill geometry, compact size, and neutral highlight states across Obsidian's default theme, Minimal, and AnuPpuccin. The maintained profiles were tested on macOS, iPadOS, and iOS.
- **More room for card content:** controls use the compact desktop size on touch devices and sit close inside the upper-right node corner. The node border remains available for resizing.
- **Complete folded totals:** a collapsed branch now counts every hidden node and group, including nodes that disappear with a contained group. The control shows the total; its tooltip separates nodes from groups.
- **Cleaner collapsed parents:** a collapsed parent shows only its folding control. Its focus control returns after expanding unless focus controls are hidden globally.
- **Reliable visibility actions:** the two toolbar eye actions immediately hide or restore their corresponding folding and focus controls without changing fold or focus state.
- **Sortable saved states:** **Manage persisted canvas states** now shows **Canvas**, **Path**, and **Action** columns. Click **Canvas** or **Path** to sort in either direction.
- **Warning-free compatibility:** the saved-state table uses a broadly supported nested grid and passes the Community Plugin CSS review without compatibility warnings.
- **README inside settings:** **Show readme** opens the current plugin documentation directly from the About settings without creating a Vault file or automatically loading README images.
- **Stable integration:** the public Canvas Folding API remains at version 1, so existing optional Canvas HTML Exporter integration continues to receive fold state in the same format.

## Using the update

1. Open a Canvas and use the controls in the upper-right interior of a node.
2. Collapse a branch to see the complete hidden-item total; on desktop, hover over the count to see the node/group breakdown.
3. Use the two eye actions in the Canvas toolbar to show or hide folding and focus controls independently.
4. Open Canvas Folding settings to sort saved Canvas states or choose **Show readme** for the full documentation.

Canvas Folding still changes only the current view. It never writes folding data into your Canvas files.

This update description appears automatically once. You can reopen it at any time with **Show last update** at the bottom of the Canvas Folding settings. Closing it leaves no note or other content file in your Vault.

If Canvas Folding makes your Canvas work easier and you would like to support its continued development, you can [buy me a coffee on Ko-fi](https://ko-fi.com/hokdev). Thank you!
`;
